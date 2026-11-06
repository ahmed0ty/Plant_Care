"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClockOff,
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  CheckCheck,
  CircleAlert,
  Clock,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { BotanicalArt } from "@/components/botanical-art";
import { StatsCard } from "@/components/app/stats-card";
import { useUndo } from "@/components/app/undo-provider";
import { CountUp, FadeIn, Rise, SLOW, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { formatDue, TASK_META } from "@/lib/tasks";
import type { CompleteResult, DashboardDto, TaskDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── Hero ───────────────────────── */

function Hero({
  name,
  data,
}: {
  name: string;
  data: DashboardDto | undefined;
}) {
  // نحسب التحية والتاريخ بعد الـ mount عشان ميحصلش hydration mismatch
  const [now, setNow] = useState<{ greet: string; date: string } | null>(null);

  useEffect(() => {
    const d = new Date();
    const h = d.getHours();
    setNow({
      greet: h >= 5 && h < 12 ? "صباح الخير" : "مساء الخير",
      date: new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(d),
    });
  }, []);

  let summary = "جارٍ تجهيز حديقتك...";
  if (data) {
    const { plants, today, overdue } = data.counts;
    if (plants === 0) summary = "ابدأ بإضافة أول نبتة لتحصل على جدول عناية جاهز.";
    else if (overdue > 0)
      summary = `لديك ${overdue} مهمة متأخرة${today > 0 ? ` و${today} مهمة لليوم` : ""}. نباتاتك تنتظرك.`;
    else if (today > 0) summary = `لديك ${today} مهمة لليوم، وكل شيء تحت السيطرة.`;
    else summary = "لا توجد مهام اليوم. نباتاتك مرتاحة وسعيدة.";
  }

  return (
    <Rise y={20}>
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-9"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 65%, black))",
        }}
      >
        {/* زخارف الخلفية */}
        <div aria-hidden className="pointer-events-none absolute -start-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 end-1/3 size-72 rounded-full bg-black/10 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_11rem]">
          <div>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
              <CalendarClock className="size-4" />
              {now ? now.date : "\u00A0"}
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              {now ? `${now.greet}، ` : ""}
              {name}
            </h1>

            <p className="mt-2.5 max-w-md text-lg leading-8 opacity-90">{summary}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/plants/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 font-bold text-primary shadow-lg"
                >
                  <Camera className="size-5" />
                  إضافة نبتة
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-bold backdrop-blur transition-colors hover:bg-white/10"
                >
                  كل المهام
                  <ArrowLeft className="size-5" />
                </Link>
              </motion.div>
            </div>
          </div>

          <div className="mx-auto hidden h-48 w-40 sm:block">
            <BotanicalArt />
          </div>
        </div>
      </section>
    </Rise>
  );
}

/* ───────────────────────── Stats ───────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tone,
  bar,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  tone: string;
  bar: string;
}) {
  return (
    <StaggerItem className="h-full">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="h-full"
      >
        <Link
          href={href}
          className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-lg"
        >
          <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", bar)} />

          <Icon
            aria-hidden
            className="pointer-events-none absolute -bottom-5 -end-5 size-24 opacity-[0.06] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
          />

          <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", tone)}>
            <Icon className="size-7" />
          </span>

          <div className="min-w-0">
            <p className="font-display text-4xl font-bold leading-none">
              <CountUp to={value} />
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
              {label}
              <ArrowLeft className="size-3.5 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100" />
            </p>
          </div>
        </Link>
      </motion.div>
    </StaggerItem>
  );
}

/* ───────────────────────── Tasks ───────────────────────── */

function TaskRow({
  task,
  overdue,
  busy,
  onComplete,
}: {
  task: TaskDto;
  overdue?: boolean;
  busy: boolean;
  onComplete: (id: string) => void;
}) {
  const meta = TASK_META[task.type];
  const Icon = meta.icon;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.4 } }}
      transition={{ duration: 0.6, ease: EASE }}
      className="group relative flex items-center gap-3.5 py-4 ps-4"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 start-0 w-1 rounded-full transition-all group-hover:inset-y-2",
          overdue ? "bg-destructive" : "bg-primary/40",
        )}
      />

      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", meta.tone)}>
        <Icon className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {meta.label}
          <span className="font-medium text-muted-foreground">
            {" "}
            — {task.plant?.nickname ?? "نبات محذوف"}
          </span>
        </p>

        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
            overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
          )}
        >
          <Clock className="size-3.5" />
          {overdue ? "متأخرة منذ " : "الموعد: "}
          {formatDue(task.dueAt)}
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => onComplete(task.id)}
        disabled={busy}
        aria-label={`تم: ${meta.label} ${task.plant?.nickname ?? ""}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        تمّ
      </motion.button>
    </motion.li>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  tone,
  href,
  children,
}: {
  title: string;
  count?: number;
  icon: LucideIcon;
  tone: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <FadeIn>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <span className={cn("grid size-9 place-items-center rounded-xl", tone)}>
              <Icon className="size-5" />
            </span>
            {title}
            {count !== undefined ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-sans text-sm font-bold text-secondary-foreground">
                {count}
              </span>
            ) : null}
          </h2>

          {href ? (
            <Link
              href={href}
              className="group inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              عرض الكل
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card px-5 shadow-sm">
          {children}
        </div>
      </section>
    </FadeIn>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 * SLOW, ease: EASE }}
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
        <CheckCheck className="size-7" />
      </span>
      <p className="text-muted-foreground">{text}</p>
    </motion.div>
  );
}

/* ───────────────────────── Recent timeline ───────────────────────── */

function RecentTimeline({ items }: { items: TaskDto[] }) {
  return (
    <FadeIn>
      <section>
        <h2 className="mb-3 font-display text-2xl font-bold">آخر ما أنجزته</h2>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ul className="relative space-y-4">
            <span aria-hidden className="absolute inset-y-2 start-[1.1rem] w-px bg-border" />

            {items.map((task) => {
              const meta = TASK_META[task.type];
              const Icon = meta.icon;

              return (
                <li key={task.id} className="relative flex items-center gap-3">
                  <span
                    className={cn(
                      "relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-card",
                      meta.tone,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{meta.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.plant?.nickname ?? "نبات محذوف"}
                      {task.completedAt ? ` · ${formatDue(task.completedAt)}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </FadeIn>
  );
}

/* ───────────────────────── Empty / Loading ───────────────────────── */

const FIRST_STEPS = [
  { icon: Camera, title: "صوّر نبتتك", text: "التقط صورة أو ارفع واحدة." },
  { icon: ScanSearch, title: "راجع الاقتراح", text: "نحدد النوع وجدول العناية." },
  { icon: CheckCheck, title: "اتبع الجدول", text: "علّم المهام بضغطة واحدة." },
];

function EmptyGarden() {
  return (
    <FadeIn>
      <div className="rounded-3xl border border-dashed border-primary/40 bg-card p-6 text-center shadow-sm sm:p-10">
        <h2 className="font-display text-3xl font-bold">حديقتك تنتظر أول نبتة</h2>
        <p className="mx-auto mt-3 max-w-md text-lg leading-8 text-muted-foreground">
          عند إضافة أول نبتة سيظهر هنا جدول عنايتها: مهام اليوم والمتأخرة وآخر ما أنجزته.
        </p>

        <Stagger className="mt-8 grid gap-4 text-start sm:grid-cols-3" gap={0.12}>
          {FIRST_STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title} className="h-full">
              <div className="h-full rounded-2xl bg-secondary/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-3xl font-bold text-primary/25">{i + 1}</span>
                </div>
                <p className="mt-4 font-bold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <motion.div className="mt-8 inline-block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Link
            href="/plants/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Sprout className="size-5" />
            إضافة نبتة
          </Link>
        </motion.div>
      </div>
    </FadeIn>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-label="جارٍ تحميل البيانات" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function DashboardView() {
  const profile = useProfile();
  const queryClient = useQueryClient();
  const { offer } = useUndo();

  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDto>("/dashboard"),
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      api<CompleteResult>(`/tasks/${id}/complete`, { method: "POST" }),

    onSuccess: async (data) => {
      offer(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["plant"] }),
        queryClient.invalidateQueries({ queryKey: ["plants"] }),
        queryClient.invalidateQueries({ queryKey: ["care-log"] }),
      ]);
    },
  });

  const firstName = profile.name.trim().split(/\s+/)[0] ?? "";
  const busyId = complete.isPending ? complete.variables : null;
  const data = query.data;

  return (
    <div className="space-y-6">
      <Hero name={firstName} data={data} />

      {query.isPending ? <LoadingState /> : null}

      {query.isError ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <CircleAlert className="size-10 text-destructive" />
            <p className="text-lg font-bold">تعذّر تحميل لوحة التحكم</p>
            <p className="text-muted-foreground">{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              إعادة المحاولة
            </Button>
          </Card>
        </FadeIn>
      ) : null}

      {data ? (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-3" gap={0.1}>
            <StatCard
              icon={Sprout}
              label="نباتاتي"
              value={data.counts.plants}
              href="/plants"
              tone="bg-secondary text-primary"
              bar="bg-primary"
            />
            <StatCard
              icon={CalendarClock}
              label="مهام اليوم"
              value={data.counts.today}
              href="/tasks"
              tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
              bar="bg-amber-500"
            />
            <StatCard
              icon={AlarmClockOff}
              label="مهام متأخرة"
              value={data.counts.overdue}
              href="/tasks"
              tone={
                data.counts.overdue > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
              }
              bar={data.counts.overdue > 0 ? "bg-destructive" : "bg-muted-foreground/30"}
            />
          </Stagger>

          <AnimatePresence>
            {complete.isError ? (
              <motion.p
                key="complete-error"
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {complete.error.message}
              </motion.p>
            ) : null}
          </AnimatePresence>

          {data.counts.plants === 0 ? (
            <EmptyGarden />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
              {/* العمود الرئيسي: المهام */}
              <div className="space-y-6">
                {data.overdue.length > 0 ? (
                  <Section
                    title="متأخرة"
                    count={data.counts.overdue}
                    icon={AlarmClockOff}
                    tone="bg-destructive/15 text-destructive"
                    href="/tasks"
                  >
                    <ul className="divide-y divide-border">
                      <AnimatePresence initial={false}>
                        {data.overdue.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            overdue
                            busy={busyId === task.id}
                            onComplete={(id) => complete.mutate(id)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </Section>
                ) : null}

                <Section
                  title="مهام اليوم"
                  count={data.counts.today}
                  icon={CalendarClock}
                  tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  href="/tasks"
                >
                  <ul className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {data.today.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          busy={busyId === task.id}
                          onComplete={(id) => complete.mutate(id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>

                  {data.today.length === 0 ? (
                    <EmptyList text="لا توجد مهام اليوم. نباتاتك مرتاحة 🌿" />
                  ) : null}
                </Section>
              </div>

              {/* العمود الجانبي */}
              <aside className="space-y-6">
                <FadeIn>
                  <StatsCard />
                </FadeIn>

                {data.recent.length > 0 ? <RecentTimeline items={data.recent} /> : null}
              </aside>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}