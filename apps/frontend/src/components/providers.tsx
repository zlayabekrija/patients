'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  clearAuth,
  getStoredUser,
  getValidToken,
  isTokenExpired,
  setAuth,
} from '@/lib/auth';
import type { AuthUser } from '@/types';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getValidToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
    } else {
      clearAuth();
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const token = getValidToken();
      if (!token) {
        setUser(null);
        return;
      }

      if (isTokenExpired(token)) {
        clearAuth();
        setUser(null);
        router.replace('/login');
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(email, password);
      setAuth(response.token, response.user);
      setUser(response.user);
      router.replace('/patients');
    },
    [router],
  );

  const logout = useCallback(() => {
    queryClient.cancelQueries();
    queryClient.clear();
    clearAuth();
    setUser(null);
    router.replace('/login');
  }, [queryClient, router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      isAdmin: user?.role === 'admin',
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
