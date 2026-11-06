"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Images, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, Rise, SLOW } from "@/components/motion";
import { api } from "@/lib/api";
import type { GalleryPhotoDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CloudImage } from "@/components/cloud-image";

const EASE = [0.22, 1, 0.36, 1] as const;

const dateFormat = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const HEALTH = {
  healthy: { label: "بصحة جيدة", tone: "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300" },
  needs_attention: {
    label: "تحتاج انتباهاً",
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  unclear: { label: "غير واضحة", tone: "bg-muted text-muted-foreground" },
} as const;

function Lightbox({ photo, onClose }: { photo: GalleryPhotoDto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="عرض الصورة"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 * SLOW }}
    >
      <motion.div
        className="relative max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.4 * SLOW, ease: EASE }}
      >
        <motion.button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute end-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-background/80 hover:bg-background"
        >
          <X className="size-5" />
        </motion.button>
        <CloudImage
          src={photo.imageUrl}
          alt={photo.plant?.nickname ?? "صورة نمو"}
          widths={[800, 1200, 1600]}
          sizes="(min-width:672px) 672px, 100vw"
          className="max-h-[65vh] w-full bg-black/5 object-contain"
        />
        <div className="space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {photo.plant ? (
              <Link href={`/plants/${photo.plant.id}`} className="text-lg font-bold hover:underline">
                {photo.plant.nickname}
              </Link>
            ) : (
              <span className="text-lg font-bold">نبات محذوف</span>
            )}
            <span className="text-sm text-muted-foreground">{dateFormat.format(new Date(photo.takenAt))}</span>
          </div>
          {photo.healthStatus ? (
            <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold", HEALTH[photo.healthStatus].tone)}>
              {HEALTH[photo.healthStatus].label}
            </span>
          ) : null}
          {photo.healthNote ? <p className="leading-7 text-muted-foreground">{photo.healthNote}</p> : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function GalleryView() {
  const [plantId, setPlantId] = useState("all");
  const [open, setOpen] = useState<GalleryPhotoDto | null>(null);

  const query = useQuery({
    queryKey: ["gallery"],
    queryFn: () => api<{ photos: GalleryPhotoDto[] }>("/gallery"),
  });

  const photos = useMemo(() => query.data?.photos ?? [], [query.data]);

  const plants = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of photos) if (p.plant) map.set(p.plant.id, p.plant.nickname);
    return [...map.entries()].map(([id, nickname]) => ({ id, nickname }));
  }, [photos]);

  const shown = plantId === "all" ? photos : photos.filter((p) => p.plant?.id === plantId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Rise y={16}>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">معرض النمو</h1>
          </Rise>
          <Rise y={16} delay={0.1}>
            <p className="mt-1.5 text-lg text-muted-foreground">كل صور نباتاتك مرتبة من الأحدث.</p>
          </Rise>
        </div>
        {plants.length > 1 ? (
          <Rise delay={0.15} y={12}>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              aria-label="تصفية حسب النبتة"
              className="rounded-xl border border-border bg-background px-4 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">كل النباتات</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </Rise>
        ) : null}
      </header>

      {query.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <CircleAlert className="size-10 text-destructive" />
            <p className="text-muted-foreground">{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              إعادة المحاولة
            </Button>
          </Card>
        </FadeIn>
      ) : null}

      {query.data && shown.length === 0 ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Images className="size-10 text-primary" />
            <p className="text-lg font-bold">لا توجد صور بعد</p>
            <p className="text-muted-foreground">أضف صوراً من صفحة أي نبتة (سجل النمو) وستظهر هنا.</p>
          </Card>
        </FadeIn>
      ) : null}

      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.button
                key={p.id}
                layout
                type="button"
                onClick={() => setOpen(p)}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5 * SLOW, ease: EASE, delay: Math.min(i, 12) * 0.04 * SLOW },
                }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 * SLOW } }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="group overflow-hidden rounded-xl border border-border bg-card text-start"
              >
                <div className="overflow-hidden">
                  <CloudImage
                    src={p.imageUrl}
                    alt={p.plant?.nickname ?? "صورة نمو"}
                    widths={[300, 600]}
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-bold">{p.plant?.nickname ?? "نبات محذوف"}</p>
                  <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(p.takenAt))}</p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {query.data && query.data.photos.length >= 60 ? (
        <p className="text-center text-sm text-muted-foreground">تظهر آخر 60 صورة.</p>
      ) : null}

      <AnimatePresence>{open ? <Lightbox photo={open} onClose={() => setOpen(null)} /> : null}</AnimatePresence>
    </div>
  );
}