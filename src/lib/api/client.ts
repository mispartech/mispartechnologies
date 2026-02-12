/**
 * Django API Client
 * 
 * Calls the Django API at https://api.mispartechnologies.com
 * Uses Supabase session token for authentication (Bearer token).
 * Django verifies Supabase JWTs — no Django-issued tokens.
 */

import { supabase } from '@/integrations/supabase/client';

const DJANGO_BASE_URL = 'https://api.mispartechnologies.com';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class DjangoApiClient {

  /**
   * Get the current Supabase access token.
   */
  private async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  /**
   * Direct fetch to Django API with Supabase Bearer token.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

  // ============ PROFILE ENDPOINT ============

  /**
   * Fetch the current user's profile from Django.
   * Django identifies the user via the Supabase JWT sub claim.
   */
  async getProfile(): Promise<ApiResponse<{
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
    is_onboarded?: boolean;
  }>> {
    return this.request('/api/profile/');
  }

  /**
   * Sync a Supabase user to Django (creates or updates the Django user).
   * Called after Supabase signup or when a Supabase user has no Django profile yet.
   */
  async syncFromSupabase(data: {
    supabase_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }): Promise<ApiResponse<{
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      organization_id: string;
    };
  }>> {
    return this.request('/api/auth/sync/', {
      method: 'POST',
      body: JSON.stringify(data),
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
    message?: string;
    face_image_url?: string;
  }>> {
    return this.request('/api/face/enroll/', {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
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

  // ============ PASSWORD ============

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request('/api/auth/password/change/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
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
