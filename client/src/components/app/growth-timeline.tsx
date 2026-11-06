"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Camera, LoaderCircle, Stethoscope, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FadeIn } from "@/components/motion";
import { api, uploadRequest } from "@/lib/api";
import type { GrowthLogDto } from "@/lib/types";
import { CloudImage } from "../cloud-image";

const dateFormat = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const HEALTH_TONE = {
  healthy:
    "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300",
  needs_attention:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  unclear: "bg-muted text-muted-foreground",
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function GrowthTimeline({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();

  const [localError, setLocalError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GrowthLogDto | null>(null);

  const key = ["growth", plantId];

  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      api<{ logs: GrowthLogDto[] }>(`/plants/${plantId}/growth`),
  });

  const add = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);

      return uploadRequest<{ log: GrowthLogDto }>(
        `/plants/${plantId}/growth`,
        fd
      );
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: ["gallery"] }),
      ]);
    },
  });

  const remove = useMutation({
    mutationFn: (logId: string) =>
      api(`/plants/${plantId}/growth/${logId}`, {
        method: "DELETE",
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: ["gallery"] }),
      ]);
    },
  });

  const deletingId = remove.isPending ? remove.variables : null;
  const logs = query.data?.logs ?? [];
  const latest = logs[0];

  const error =
    localError ??
    (add.isError ? add.error.message : null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setLocalError(null);

    if (file.size > 5 * 1024 * 1024) {
      setLocalError("حجم الصورة أكبر من 5MB");
      return;
    }

    add.mutate(file);
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">
          سجل النمو
        </h2>

        <motion.label
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-secondary"
        >
          {add.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}

          {add.isPending ? "جارٍ الرفع والفحص..." : "أضف صورة"}

          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPick}
            disabled={add.isPending}
          />
        </motion.label>
      </div>

      <AnimatePresence>
        {error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {latest?.healthNote ? (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <Card
              className={cn(
                "mb-4 space-y-1.5 p-5",
                HEALTH_TONE[latest.healthStatus ?? "unclear"]
              )}
            >
              <p className="flex items-center gap-2 font-bold">
                <Stethoscope className="size-5" />
                نصيحة
              </p>

              <p className="leading-7">{latest.healthNote}</p>

              <p className="text-xs opacity-80">
                اقتراح فقط وليس تشخيصاً نهائياً، ولا يغيّر جدول العناية.
              </p>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {query.isPending ? <Skeleton className="h-40" /> : null}

      {query.isError ? (
        <p className="text-muted-foreground">
          {query.error.message}
        </p>
      ) : null}

      {query.data && logs.length === 0 ? (
        <FadeIn>
          <Card className="p-8 text-center text-muted-foreground">
            لا توجد صور بعد. أضف صورة كل فترة لتتابع نمو نبتتك.
          </Card>
        </FadeIn>
      ) : null}

      {logs.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {logs.map((g, i) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, scale: 0.85, y: 16 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 220,
                    damping: 22,
                    delay: Math.min(i, 8) * 0.05,
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.2 },
                }}
                whileHover={{ y: -4 }}
              >
                <Card className="overflow-hidden">
                  <div className="overflow-hidden">
                    <motion.div
                      whileHover={{ scale: 1.06 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    >
                      <CloudImage
                        src={g.imageUrl}
                        alt={`صورة بتاريخ ${dateFormat.format(
                          new Date(g.takenAt)
                        )}`}
                        widths={[300, 600]}
                        sizes="(min-width:640px) 33vw, 50vw"
                        className="aspect-square w-full object-cover"
                      />
                    </motion.div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {dateFormat.format(new Date(g.takenAt))}
                    </span>

                    <motion.button
                      type="button"
                      aria-label="حذف الصورة"
                      disabled={deletingId === g.id}
                      onClick={() => setToDelete(g)}
                      whileTap={{ scale: 0.85 }}
                      className="text-destructive disabled:opacity-50"
                    >
                      {deletingId === g.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </motion.button>
                  </div>

                  {g.healthNote ? (
                    <p
                      className="line-clamp-2 px-3 pb-2 text-xs text-muted-foreground"
                      title={g.healthNote}
                    >
                      {g.healthNote}
                    </p>
                  ) : null}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title="حذف هذه الصورة؟"
        description="لن تتمكن من استرجاعها بعد الحذف."
        busy={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete.id, {
              onSuccess: () => setToDelete(null),
            });
          }
        }}
        onCancel={() => {
          remove.reset();
          setToDelete(null);
        }}
      />
    </section>
  );
}