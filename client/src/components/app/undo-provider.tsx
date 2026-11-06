"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { TASK_META } from "@/lib/tasks";
import type { CompleteResult } from "@/lib/types";

const TOAST_MS = 8000;
const KEYS = ["dashboard", "tasks", "plant", "plants", "stats"] as const;

interface Offer {
  taskId: string;
  nextId: string | null;
  text: string;
}

interface UndoApi {
  offer: (result: CompleteResult) => void;
}

const Ctx = createContext<UndoApi | null>(null);

/** بيعرض رسالة "تراجع" بعد إنجاز مهمة. لو اتستخدم برا الـ provider بيتجاهل بهدوء */
export function useUndo(): UndoApi {
  return useContext(Ctx) ?? { offer: () => {} };
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<Offer | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const undo = useMutation({
    mutationFn: (o: Offer) =>
      api(`/tasks/${o.taskId}/undo`, { method: "POST", body: o.nextId ? { nextId: o.nextId } : {} }),
    onSuccess: async () => {
      clearTimer();
      setCurrent(null);
      await Promise.all(KEYS.map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
    },
    onError: (e) => setUndoError(e.message),
  });

  const offer = useCallback(
    (r: CompleteResult) => {
      const meta = TASK_META[r.task.type];
      clearTimer();
      setUndoError(null);
      setCurrent({
        taskId: r.task.id,
        nextId: r.next?.id ?? null,
        text: `تم: ${meta.label} — ${r.task.plant?.nickname ?? "نبات محذوف"}`,
      });
      timer.current = window.setTimeout(() => setCurrent(null), TOAST_MS);
    },
    [clearTimer],
  );

  const value = useMemo(() => ({ offer }), [offer]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {current ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6"
        >
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl motion-safe:animate-rise">
            <p className="min-w-0 flex-1 text-sm font-semibold">{undoError ?? current.text}</p>
            <button
              type="button"
              onClick={() => undo.mutate(current)}
              disabled={undo.isPending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {undo.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
              تراجع
            </button>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}