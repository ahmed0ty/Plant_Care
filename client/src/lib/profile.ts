"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";
import type { SettingsDto } from "./types";

export function useProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ settings: SettingsDto }>("/settings"),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const s = query.data?.settings;
  return {
    name: s?.name ?? user?.name ?? "",
    email: s?.email ?? user?.email ?? "",
    avatarUrl: s?.avatarUrl ?? null,
  };
}