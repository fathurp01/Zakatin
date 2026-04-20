"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_ROLE_COOKIE,
  AUTH_STATUS_COOKIE,
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_COOKIE,
  type AuthStoragePayload,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  role: AuthUser["role"] | null;
  statusAkun: AuthUser["status_akun"] | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (payload: AuthStoragePayload) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

const setCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
};

const clearCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

const persistSession = (payload: AuthStoragePayload) => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  setCookie(AUTH_TOKEN_COOKIE, payload.token, COOKIE_MAX_AGE_SECONDS);
  setCookie(AUTH_ROLE_COOKIE, payload.user.role, COOKIE_MAX_AGE_SECONDS);
  setCookie(AUTH_STATUS_COOKIE, payload.user.status_akun, COOKIE_MAX_AGE_SECONDS);
};

const clearPersistedSession = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  clearCookie(AUTH_TOKEN_COOKIE);
  clearCookie(AUTH_ROLE_COOKIE);
  clearCookie(AUTH_STATUS_COOKIE);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as AuthStoragePayload;
      if (!parsed?.token || !parsed?.user) {
        clearPersistedSession();
        setIsHydrated(true);
        return;
      }

      setToken(parsed.token);
      setUser(parsed.user);
      persistSession(parsed);
    } catch {
      clearPersistedSession();
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setSession = useCallback((payload: AuthStoragePayload) => {
    setToken(payload.token);
    setUser(payload.user);
    persistSession(payload);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearPersistedSession();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      token,
      user,
      role: user?.role ?? null,
      statusAkun: user?.status_akun ?? null,
      isAuthenticated: Boolean(token && user),
      isHydrated,
      setSession,
      logout,
    };
  }, [token, user, isHydrated, setSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  }

  return context;
};
