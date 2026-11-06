"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const SNOOZE_OPTIONS = [
  { days: 1, label: "غداً" },
  { days: 3, label: "بعد 3 أيام" },
] as const;

export function useSnooze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      api(`/tasks/${id}/snooze`, { method: "PATCH", body: { days } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["plant"] }),
        queryClient.invalidateQueries({ queryKey: ["plants"] }),
      ]);
    },
  });
}

export function SnoozeButtons({
  taskName,
  busyDays,
  disabled,
  onSnooze,
}: {
  taskName: string;
  busyDays: number | null;
  disabled: boolean;
  onSnooze: (days: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`تأجيل: ${taskName}`}>
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      {SNOOZE_OPTIONS.map((o) => (
        <Button
          key={o.days}
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onSnooze(o.days)}
        >
          {busyDays === o.days ? <LoaderCircle className="animate-spin" /> : null}
          {o.label}
        </Button>
      ))}
    </div>
  );
}