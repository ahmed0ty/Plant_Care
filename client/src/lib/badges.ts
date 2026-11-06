"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";
import type { DashboardDto } from "./types";

export function useTaskBadge() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDto>("/dashboard"),
    enabled: Boolean(user),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  return {
    overdue: query.data?.counts.overdue ?? 0,
    today: query.data?.counts.today ?? 0,
  };
}