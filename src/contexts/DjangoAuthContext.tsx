import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const refreshUser = useCallback(async () => {
    if (!djangoApi.isAuthenticated()) {
      setUser(null);
      return;
    }

    const { data, error } = await djangoApi.getCurrentUser();
    if (data && !error) {
      setUser(data);
    } else {
      setUser(null);
      if (error) {
        djangoApi.clearTokens();
      }
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };

    initialize();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await djangoApi.login(email, password);
    
    if (error) {
      return { error };
    }

    if (data?.user) {
      setUser(data.user);
    } else {
      // Fetch user if not returned with login
      await refreshUser();
    }

    return {};
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await djangoApi.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    gender?: string;
    invite_token?: string;
  }) => {
    const { data: result, error } = await djangoApi.register(data);
    
    if (error) {
      return { error };
    }

    // Auto-login after registration
    const loginResult = await login(data.email, data.password);
    if (loginResult.error) {
      return { error: loginResult.error };
    }

    return { user: user || undefined };
  }, [login, user]);

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
