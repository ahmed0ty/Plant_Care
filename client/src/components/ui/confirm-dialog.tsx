"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "حذف",
  cancelLabel = "إلغاء",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  const cancelFn = useRef(onCancel);

  useEffect(() => {
    busyRef.current = busy;
    cancelFn.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) cancelFn.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl motion-safe:animate-rise"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 id="confirm-title" className="font-display text-xl font-bold">
              {title}
            </h2>
            {description ? (
              <p id="confirm-desc" className="leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border px-5 py-2.5 font-bold transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2.5 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}