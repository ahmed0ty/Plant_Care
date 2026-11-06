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
import { useQueryClient } from "@tanstack/react-query";
import {
  authRequest,
  logoutRequest,
  refreshSession,
  setSessionLostHandler,
} from "./api";
import type { User } from "./types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // استرجاع الجلسة من الـ refresh cookie عند فتح الموقع
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setStatus(session ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // لو الجلسة انتهت في نص الاستخدام
  useEffect(() => {
    setSessionLostHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
      queryClient.clear();
    });
    return () => setSessionLostHandler(null);
  }, [queryClient]);

  const login = useCallback<AuthContextValue["login"]>(async (input) => {
    const data = await authRequest("/auth/login", input);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    const data = await authRequest("/auth/register", input);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    queryClient.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}