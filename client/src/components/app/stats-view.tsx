"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleAlert, Flame, Sprout, Trophy } from "lucide-react";
import { ActivityBars } from "@/components/app/activity-bars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { TASK_META } from "@/lib/tasks";
import type { StatsDto, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CloudImage } from "../cloud-image";

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Flame;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tone)}>
        <Icon className="size-6" />
      </span>
      <div>
        <p className="font-display text-3xl font-bold leading-none">{value}</p>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export function StatsView() {
  const query = useQuery({ queryKey: ["stats"], queryFn: () => api<StatsDto>("/stats") });
  const s = query.data;

  const message = !s
    ? ""
    : s.streak === 0
      ? "أنجز مهمة اليوم لتبدأ سلسلة جديدة."
      : s.activeToday
        ? "أحسنت! حافظت على سلسلتك اليوم."
        : "أنجز مهمة اليوم لتحافظ على سلسلتك.";

  const types = Object.keys(TASK_META) as TaskType[];
  const maxType = s ? Math.max(1, ...types.map((t) => s.byType[t])) : 1;

  return (
    <div className="space-y-6 motion-safe:animate-rise">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">الإحصائيات</h1>
        <p className="mt-1.5 text-lg text-muted-foreground">تابع التزامك بالعناية بنباتاتك.</p>
      </header>

      {query.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-56" />
        </div>
      ) : null}

      {query.isError ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <CircleAlert className="size-10 text-destructive" />
          <p className="text-muted-foreground">{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            إعادة المحاولة
          </Button>
        </Card>
      ) : null}

      {s ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              icon={Flame}
              value={s.streak}
              label="سلسلتك الحالية (أيام)"
              tone="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
            />
            <Stat
              icon={Trophy}
              value={s.bestStreak}
              label="أطول سلسلة"
              tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
            />
            <Stat icon={Check} value={s.total30} label="مهام آخر 30 يوماً" tone="bg-secondary text-primary" />
          </div>
          <p className="text-muted-foreground">{message}</p>

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-2xl font-bold">نشاط آخر 30 يوماً</h2>
            <ActivityBars days={s.days} className="h-36" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span dir="ltr">{s.days[0]?.date}</span>
              <span dir="ltr">{s.days[s.days.length - 1]?.date}</span>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-6">
              <h2 className="font-display text-2xl font-bold">حسب نوع المهمة</h2>
              <ul className="space-y-4">
                {types.map((t) => {
                  const meta = TASK_META[t];
                  const Icon = meta.icon;
                  const n = s.byType[t];
                  return (
                    <li key={t} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-bold">
                          <span className={cn("grid size-8 place-items-center rounded-lg", meta.tone)}>
                            <Icon className="size-4" />
                          </span>
                          {meta.label}
                        </span>
                        <span className="font-bold">{n}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxType) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="space-y-4 p-6">
              <h2 className="font-display text-2xl font-bold">أكثر نباتاتك عناية</h2>
              {s.topPlants.length === 0 ? (
                <p className="text-muted-foreground">لا توجد بيانات بعد.</p>
              ) : (
                <ul className="space-y-3">
                  {s.topPlants.map((p, i) => (
                    <li key={p.id}>
                      <Link
                        href={`/plants/${p.id}`}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary"
                      >
                        <span className="w-5 text-center font-display text-lg font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <CloudImage src={p.imageUrl} alt="" widths={[96, 192]} sizes="44px" className="h-full w-full object-cover" />
                          ) : (
                            <Sprout className="size-5 text-primary" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-bold">{p.nickname}</span>
                        <span className="text-sm text-muted-foreground">{p.count} مهمة</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}