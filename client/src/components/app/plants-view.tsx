"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, ClipboardList, Droplets, Plus, Search, Sprout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, Rise } from "@/components/motion";
import { api } from "@/lib/api";
import { formatDue, TASK_META } from "@/lib/tasks";
import type { PlantListItem, PlantsPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CloudImage } from "../cloud-image";

type Filter = "all" | "tasks" | "due";
type Sort = "newest" | "oldest" | "name" | "next";

const EASE = [0.22, 1, 0.36, 1] as const;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "tasks", label: "عليها مهام" },
  { value: "due", label: "مستحقة الآن" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "name", label: "الاسم (أ - ي)" },
  { value: "next", label: "الأقرب موعداً" },
];

// توحيد الحروف العربية عشان البحث يلاقي (أحمد = احمد، نبتة = نبته)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function PlantCard({ p, now, onDelete }: { p: PlantListItem; now: number; onDelete: () => void }) {
  const s = p.taskSummary;
  const meta = s.nextType ? TASK_META[s.nextType] : null;
  const NextIcon = meta?.icon;
  const due = s.nextDueAt ? new Date(s.nextDueAt).getTime() <= now : false;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link href={`/plants/${p.id}`} className="group flex flex-1 flex-col">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-secondary">
          {p.imageUrl ? (
            <CloudImage
              src={p.imageUrl}
              alt={p.nickname}
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Sprout className="size-14 text-primary/70" />
            </div>
          )}
          {s.pending > 0 ? (
            <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur">
              <ClipboardList className="size-3.5" />
              {s.pending} معلّقة
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 bg-card p-4">
          <h3 className="truncate text-lg font-bold">{p.nickname}</h3>
          {p.species ? (
            <p dir="ltr" className="truncate text-start text-sm italic text-muted-foreground">
              {p.species}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">النوع غير محدد</p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Droplets className="size-4 shrink-0" />
            {p.care.wateringEveryDays ? `ري كل ${p.care.wateringEveryDays} يوم` : "بدون جدول ري"}
          </p>

          {meta && NextIcon && s.nextDueAt ? (
            <div className="mt-auto pt-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                  due ? "bg-destructive/10 text-destructive" : meta.tone,
                )}
              >
                <NextIcon className="size-3.5" />
                {meta.label} · {due ? "مستحقة الآن" : formatDue(s.nextDueAt)}
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="border-t border-border px-3 py-2">
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 />
          حذف
        </Button>
      </div>
    </Card>
  );
}

export function PlantsView() {
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [target, setTarget] = useState<PlantListItem | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["plants"],
    queryFn: ({ pageParam }) =>
      api<PlantsPage>(`/plants?limit=50${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  // نحمّل كل الصفحات تلقائياً عشان البحث والترتيب يشتغلوا على كل نباتاتك
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/plants/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setTarget(null);
      await Promise.all(
        ["plants", "dashboard", "tasks", "stats", "gallery"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });

  const all = useMemo(() => query.data?.pages.flatMap((pg) => pg.plants) ?? [], [query.data]);

  const shown = useMemo(() => {
    const q = normalize(search);
    const list = all.filter((p) => {
      if (q && !normalize(`${p.nickname} ${p.species ?? ""}`).includes(q)) return false;
      if (filter === "tasks") return p.taskSummary.pending > 0;
      if (filter === "due") {
        return p.taskSummary.nextDueAt !== null && new Date(p.taskSummary.nextDueAt).getTime() <= now;
      }
      return true;
    });

    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return time(a.addedAt) - time(b.addedAt);
        case "name":
          return a.nickname.localeCompare(b.nickname, "ar");
        case "next":
          return time(a.taskSummary.nextDueAt) - time(b.taskSummary.nextDueAt);
        default:
          return time(b.addedAt) - time(a.addedAt);
      }
    });
  }, [all, search, filter, sort, now]);

  const filtering = search.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-6">
      <Rise y={16}>
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">نباتاتي</h1>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/plants/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground"
            >
              <Plus className="size-5" />
              إضافة نبتة
            </Link>
          </motion.div>
        </header>
      </Rise>

      {all.length > 0 ? (
        <Rise delay={0.1} y={12} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-0 flex-1 basis-64">
              <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو النوع..."
                aria-label="بحث في النباتات"
                className="w-full rounded-xl border border-border bg-background py-2.5 ps-12 pe-4 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="ترتيب النباتات"
              className="rounded-xl border border-border bg-background px-4 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-primary"
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div role="tablist" aria-label="تصفية النباتات" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    active ? "text-primary-foreground" : "border border-border hover:bg-secondary",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="plants-filter-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-10">{f.label}</span>
                </button>
              );
            })}
          </div>
        </Rise>
      ) : null}

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
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

      {query.data && all.length === 0 ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Sprout className="size-10 text-primary" />
            <p className="text-lg font-bold">لم تضف أي نبتة بعد</p>
          </Card>
        </FadeIn>
      ) : null}

      {all.length > 0 && shown.length === 0 && filtering ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Search className="size-10 text-primary" />
            <p className="text-lg font-bold">لا توجد نتائج مطابقة</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              مسح البحث والفلاتر
            </Button>
          </Card>
        </FadeIn>
      ) : null}

      {shown.length > 0 ? (
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial>
            {shown.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.45, ease: EASE, delay: Math.min(i, 9) * 0.05 },
                }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <PlantCard p={p} now={now} onDelete={() => setTarget(p)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title={`حذف "${target?.nickname ?? ""}"؟`}
        description="سيتم حذف النبتة مع كل مهامها وصور نموها نهائياً، ولا يمكن التراجع."
        busy={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() => {
          if (target) remove.mutate(target.id);
        }}
        onCancel={() => {
          remove.reset();
          setTarget(null);
        }}
      />
    </div>
  );
}