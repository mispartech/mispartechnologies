/**
 * Django API Client
 * 
 * Calls the Django API directly at https://api.mispartechnologies.com
 * Django handles CORS — no edge function proxy needed.
 */

const DJANGO_BASE_URL = 'https://api.mispartechnologies.com';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class DjangoApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('django_access_token');
      this.refreshToken = localStorage.getItem('django_refresh_token');
    }
  }

  private saveTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('django_access_token', access);
      localStorage.setItem('django_refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('django_access_token');
      localStorage.removeItem('django_refresh_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Direct fetch to Django API. CORS is handled server-side.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const url = `${DJANGO_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          return { status: response.status, error: text || 'Request failed' };
        }
        return { data: text as unknown as T, status: response.status };
      }

      if (!response.ok) {
        return {
          status: response.status,
          error: data?.detail || data?.error || data?.message || 'Request failed',
        };
      }

      return { data: data as T, status: response.status };
    } catch (err) {
      console.error('API request failed:', err);
      return {
        status: 0,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  /**
   * Handle 401 by refreshing the Django access token.
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${DJANGO_BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.access) {
          this.saveTokens(data.access, this.refreshToken!);
          return true;
        }
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }

    this.clearTokens();
    return false;
  }

  // ============ AUTH ENDPOINTS ============

  async login(email: string, password: string): Promise<ApiResponse<{
    access: string;
    refresh: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      organization_id: string;
      face_image_url?: string;
    };
  }>> {
    const result = await this.request<any>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.data?.access) {
      this.saveTokens(result.data.access, result.data.refresh);
    }

    return result;
  }

  async syncFromSupabase(data: {
    supabase_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }): Promise<ApiResponse<{
    access: string;
    refresh: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      organization_id: string;
    };
  }>> {
    const result = await this.request<any>('/api/auth/sync/', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.data?.access) {
      this.saveTokens(result.data.access, result.data.refresh);
    }

    return result;
  }

  /**
   * @deprecated Use Supabase signup + syncFromSupabase() instead.
   * Django does not expose /api/auth/register/.
   */
  async register(_data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    organization_id?: string;
    invite_token?: string;
  }): Promise<ApiResponse<{ id: string; email: string }>> {
    console.warn('[DjangoApiClient] register() is deprecated. Use Supabase signup + syncFromSupabase().');
    return { status: 501, error: 'Use Supabase signup + syncFromSupabase() instead of register()' };
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      await this.request('/api/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: this.refreshToken }),
      }).catch(() => {});
    }
    this.clearTokens();
  }

  async getCurrentUser(): Promise<ApiResponse<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    organization_id: string;
    department_id?: string;
    face_image_url?: string;
    phone_number?: string;
    gender?: string;
  }>> {
    return this.request('/api/auth/me/');
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request('/api/auth/password/change/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // ============ MEMBER ENDPOINTS ============

  async getMembers(organizationId?: string): Promise<ApiResponse<any[]>> {
    const query = organizationId ? `?organization_id=${organizationId}` : '';
    return this.request(`/api/members/${query}`);
  }

  async getMember(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/members/${id}/`);
  }

  async createMember(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    department_id?: string;
    organization_id: string;
  }): Promise<ApiResponse<{ id: string; email: string }>> {
    return this.request('/api/members/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMember(id: string, data: Partial<{
    first_name: string;
    last_name: string;
    phone_number: string;
    gender: string;
    department_id: string;
  }>): Promise<ApiResponse<any>> {
    return this.request(`/api/members/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMember(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/members/${id}/`, {
      method: 'DELETE',
    });
  }

  async inviteMember(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    department_id?: string;
    organization_id: string;
  }): Promise<ApiResponse<{ invite_token: string }>> {
    return this.request('/api/members/invite/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ FACE ENDPOINTS ============

  async checkFaceEnrollmentStatus(userId: string): Promise<ApiResponse<{
    face_image_uploaded: boolean;
    face_embedding_status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  }>> {
    return this.request(`/api/face/enrollment-status/${userId}/`);
  }

  async enrollFace(userId: string, imageBase64: string, userName?: string): Promise<ApiResponse<{
    status: string;
    embedding_saved: boolean;
    message?: string;
    face_image_url?: string;
  }>> {
    return this.request('/api/recognize-frame/', {
      method: 'POST',
      body: JSON.stringify({
        frame: imageBase64,
        mode: 'ENROLLMENT',
        user_id: userId,
        name: userName,
      }),
    });
  }

  async recognizeFace(imageBase64: string, organizationId?: string): Promise<ApiResponse<any>> {
    return this.request('/api/recognize-frame/', {
      method: 'POST',
      body: JSON.stringify({
        frame: imageBase64,
        mode: 'RECOGNIZE',
        organization_id: organizationId,
      }),
    });
  }

  async uploadFaceImage(userId: string, imageBase64: string): Promise<ApiResponse<{
    url: string;
  }>> {
    return this.request('/api/face/upload/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        image: imageBase64,
      }),
    });
  }

  // ============ ATTENDANCE ENDPOINTS ============

  async markAttendance(data: {
    user_id: string;
    confidence_score?: number;
    face_roi_url?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/api/attendance/mark/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAttendance(params?: {
    user_id?: string;
    organization_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<any[]>> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request(`/api/attendance/${query}`);
  }

  // ============ ORGANIZATION ENDPOINTS ============

  async getOrganization(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/organizations/${id}/`);
  }

  async createOrganization(data: {
    name: string;
    type: string;
    industry?: string;
    size_range?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/api/organizations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(id: string, data: Partial<any>): Promise<ApiResponse<any>> {
    return this.request(`/api/organizations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============ DEPARTMENT ENDPOINTS ============

  async getDepartments(organizationId?: string): Promise<ApiResponse<any[]>> {
    const query = organizationId ? `?organization_id=${organizationId}` : '';
    return this.request(`/api/departments/${query}`);
  }

  async createDepartment(data: {
    name: string;
    description?: string;
    organization_id: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/api/departments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ INVITE ENDPOINTS ============

  async getInvite(token: string): Promise<ApiResponse<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    gender: string | null;
    department_id: string | null;
    organization_id: string | null;
    status: string;
    expires_at: string;
  }>> {
    return this.request(`/api/invites/${token}/`);
  }

  async acceptInvite(inviteId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/invites/${inviteId}/accept/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' }),
    });
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/api/health/');
  }
}

// Export singleton instance
export const djangoApi = new DjangoApiClient();

// Export class for testing
export { DjangoApiClient };
