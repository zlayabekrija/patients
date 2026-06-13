import { jwtDecode } from 'jwt-decode';
import { type AuthUser, type UserRole } from '@/types';

const TOKEN_KEY = 'patients_auth_token';
const USER_KEY = 'patients_auth_user';
const COOKIE_KEY = 'patients_auth_token';

type TokenPayload = {
  exp?: number;
  email?: string;
  role?: string;
};

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${COOKIE_KEY}=${token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function isTokenExpired(token: string) {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    if (!payload.exp) {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getValidToken() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    clearAuth();
    return null;
  }

  return token;
}

export function isAdmin(role: UserRole | undefined) {
  return role === 'admin';
}
