import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, clearToken, getToken, setToken } from "@/lib/api";

export type AuthUser = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "staff";
  active: boolean;
  last_login_at: string | null;
};

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  /** True only for the admin role — staff can do everything except manage users. */
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Revalidate the stored token on boot so a stale session can't render the app.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === "admin", login, logout, setUser }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
