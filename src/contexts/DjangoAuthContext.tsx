import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { djangoApi } from '@/lib/api/client';

interface User {
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    invite_token?: string;
  }) => Promise<{ error?: string; user?: User }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DjangoAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the Django profile using the current Supabase session token.
   */
  const fetchProfile = useCallback(async (): Promise<User | null> => {
    const { data, error } = await djangoApi.getProfile();
    if (data && !error) {
      return data as User;
    }
    console.warn('[DjangoAuth] Failed to fetch profile:', error);
    return null;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUser(null);
      return;
    }
    const profile = await fetchProfile();
    setUser(profile);
  }, [fetchProfile]);

  // Initialize: listen to Supabase auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        const profile = await fetchProfile();
        if (mounted) setUser(profile);
      }
      if (mounted) setIsLoading(false);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        const profile = await fetchProfile();
        if (mounted) setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed — profile stays the same, no action needed
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Login using Supabase only.
   */
  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    // Profile will be fetched via onAuthStateChange SIGNED_IN event
    return {};
  }, []);

  /**
   * Logout using Supabase only.
   */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  /**
   * Register via Supabase signup, then sync to Django.
   */
  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    invite_token?: string;
  }) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { first_name: data.first_name, last_name: data.last_name },
      },
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    if (!signUpData?.user) {
      return { error: 'No user returned from signup.' };
    }

    // Sync to Django
    const syncResult = await djangoApi.syncFromSupabase({
      supabase_uid: signUpData.user.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
    });

    if (syncResult.error || !syncResult.data?.user) {
      return { error: syncResult.error || 'Failed to sync account.' };
    }

    // Profile will be fetched via onAuthStateChange
    return { user: syncResult.data.user as unknown as User };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useDjangoAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useDjangoAuth must be used within a DjangoAuthProvider');
  }
  return context;
};
