import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Role } from "@dnd/shared";
import { apiFetch, setAccessToken } from "./client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  branchName: string | null;
  businessName?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: User; accessToken: string }>("/auth/me")
      .then(({ user: me, accessToken }) => {
        setAccessToken(accessToken);
        setUser(me);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (input: { name: string; email: string; password: string }) => {
    const res = await apiFetch<{ user: User; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
