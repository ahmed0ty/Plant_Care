"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClockOff,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCheck,
  CircleAlert,
  Clock,
  ListFilter,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { SnoozeButtons, useSnooze } from "@/components/app/snooze-buttons";
import { useUndo } from "@/components/app/undo-provider";
import { CountUp, FadeIn, Rise, SLOW } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDue, TASK_META } from "@/lib/tasks";
import type { CompleteResult, DashboardDto, TaskDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type Scope = "all" | "overdue" | "today" | "upcoming";
type TypeFilter = "all" | TaskDto["type"];
type GroupKey = "overdue" | "today" | "tomorrow" | "later";

const EASE = [0.22, 1, 0.36, 1] as const;
const DAY = 24 * 60 * 60 * 1000;

const TABS: { value: Scope; label: string; empty: string }[] = [
  { value: "all", label: "الكل", empty: "لا توجد مهام معلّقة" },
  { value: "overdue", label: "متأخرة", empty: "لا توجد مهام متأخرة، أحسنت!" },
  { value: "today", label: "اليوم", empty: "لا توجد مهام اليوم" },
  { value: "upcoming", label: "قادمة", empty: "لا توجد مهام قادمة" },
];

const GROUPS: { key: GroupKey; title: string; dot: string; bar: string }[] = [
  {
    key: "overdue",
    title: "متأخرة",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
  { key: "today", title: "اليوم", dot: "bg-amber-500", bar: "bg-amber-500" },
  { key: "tomorrow", title: "غداً", dot: "bg-primary", bar: "bg-primary/60" },
  {
    key: "later",
    title: "لاحقاً",
    dot: "bg-muted-foreground/50",
    bar: "bg-muted-foreground/30",
  },
];

const TYPE_KEYS = Object.keys(TASK_META) as TaskDto["type"][];

/* ───────────────────────── Header ───────────────────────── */

function MiniStat({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof AlarmClockOff;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          alert ? "bg-destructive text-white" : "bg-white/20",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold leading-none">
          <CountUp to={value} />
        </p>
        <p className="mt-1 text-xs font-semibold opacity-90">{label}</p>
      </div>
    </div>
  );
}

function Header({ counts }: { counts: DashboardDto["counts"] | undefined }) {
  let summary = "كل مهام العناية بنباتاتك في مكان واحد.";
  if (counts) {
    if (counts.overdue > 0)
      summary = `لديك ${counts.overdue} مهمة متأخرة. ابدأ بها ثم أكمل مهام اليوم.`;
    else if (counts.today > 0)
      summary = `لديك ${counts.today} مهمة لليوم. أنجزها بضغطة واحدة.`;
    else summary = "لا شيء متأخر ولا شيء لليوم. نباتاتك مرتاحة.";
  }

  return (
    <Rise y={20}>
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 65%, black))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -start-16 -top-16 size-60 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 end-10 size-64 rounded-full bg-black/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              المهام
            </h1>
            <p className="mt-2 max-w-md text-lg leading-8 opacity-90">
              {summary}
            </p>
          </div>

          {counts ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <MiniStat
                icon={AlarmClockOff}
                label="متأخرة"
                value={counts.overdue}
                alert={counts.overdue > 0}
              />
              <MiniStat
                icon={CalendarClock}
                label="اليوم"
                value={counts.today}
              />
            </div>
          ) : null}
        </div>
      </section>
    </Rise>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

function Tabs({
  scope,
  onChange,
  counts,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  counts: DashboardDto["counts"] | undefined;
}) {
  const badge = (v: Scope) =>
    v === "overdue"
      ? counts?.overdue
      : v === "today"
        ? counts?.today
        : undefined;

  return (
    <div
      role="tablist"
      aria-label="تصفية المهام"
      className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm"
    >
      {TABS.map((t) => {
        const active = scope === t.value;
        const n = badge(t.value);
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="tasks-tab-pill"
                className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-2">
              {t.label}
              {n && n > 0 ? (
                <span
                  className={cn(
                    "grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[11px] leading-none",
                    t.value === "overdue"
                      ? "bg-destructive text-white"
                      : active
                        ? "bg-white/25"
                        : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {n}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TypeChips({
  value,
  onChange,
}: {
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="تصفية حسب نوع المهمة"
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
        <ListFilter className="size-4" />
        النوع:
      </span>

      {(["all", ...TYPE_KEYS] as TypeFilter[]).map((k) => {
        const active = value === k;
        const meta = k === "all" ? null : TASK_META[k];
        const Icon = meta?.icon;
        return (
          <motion.button
            key={k}
            type="button"
            whileTap={{ scale: 0.94 }}
            aria-pressed={active}
            onClick={() => onChange(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary",
            )}
          >
            {Icon ? <Icon className="size-4" /> : null}
            {meta ? meta.label : "الكل"}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Task row ───────────────────────── */

function TaskRow({
  task,
  index,
  late,
  bar,
  completing,
  snoozing,
  snoozingDays,
  onComplete,
  onSnooze,
}: {
  task: TaskDto;
  index: number;
  late: boolean;
  bar: string;
  completing: boolean;
  snoozing: boolean;
  snoozingDays: number | null;
  onComplete: () => void;
  onSnooze: (days: number) => void;
}) {
  const meta = TASK_META[task.type];
  const Icon = meta.icon;
  const busy = completing || snoozing;
  const name = `${meta.label} ${task.plant?.nickname ?? ""}`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          ease: EASE,
          delay: Math.min(index, 6) * 0.05 * SLOW,
        },
      }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.4 } }}
      className="group relative flex flex-wrap items-center gap-3.5 py-4 ps-4"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 start-0 w-1 rounded-full transition-all group-hover:inset-y-2",
          bar,
        )}
      />

      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl",
          meta.tone,
        )}
      >
        <Icon className="size-6" />
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate font-bold">
          {meta.label}{" "}
          {task.plant ? (
            <Link
              href={`/plants/${task.plant.id}`}
              className="font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              — {task.plant.nickname}
            </Link>
          ) : (
            <span className="font-medium text-muted-foreground">
              — نبات محذوف
            </span>
          )}
        </p>

        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
            late
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Clock className="size-3.5" />
          {formatDue(task.dueAt)}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <SnoozeButtons
          taskName={name}
          busyDays={snoozing ? snoozingDays : null}
          disabled={busy}
          onSnooze={onSnooze}
        />

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onComplete}
          disabled={busy}
          aria-label={`تم: ${name}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {completing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          تمّ
        </motion.button>
      </div>
    </motion.li>
  );
}

/* ───────────────────────── Empty / Loading ───────────────────────── */

function EmptyState({
  text,
  filtered,
  onReset,
}: {
  text: string;
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 * SLOW, ease: EASE }}
    >
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 12,
            delay: 0.1,
          }}
          className="grid size-16 place-items-center rounded-full bg-secondary text-primary"
        >
          {filtered ? (
            <ListFilter className="size-8" />
          ) : (
            <CalendarCheck className="size-8" />
          )}
        </motion.span>

        <div>
          <p className="text-lg font-bold">
            {filtered ? "لا توجد مهام بهذا النوع" : text}
          </p>
          <p className="mt-1 text-muted-foreground">
            {filtered
              ? "جرّب نوعاً آخر أو اعرض كل الأنواع."
              : "ستظهر هنا المهام الجديدة تلقائياً."}
          </p>
        </div>

        {filtered ? (
          <Button variant="outline" onClick={onReset}>
            عرض كل الأنواع
          </Button>
        ) : null}
      </Card>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-label="جارٍ تحميل المهام" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}

function GroupBlock({
  title,
  dot,
  count,
  children,
}: {
  title: string;
  dot: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 * SLOW, ease: EASE }}
    >
      <h2 className="mb-2.5 flex items-center gap-2.5 text-lg font-bold">
        <span className={cn("size-2.5 rounded-full", dot)} />
        {title}
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-bold text-secondary-foreground">
          {count}
        </span>
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card px-5 shadow-sm">
        {children}
      </div>
    </motion.section>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function TasksView() {
  const [scope, setScope] = useState<Scope>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const queryClient = useQueryClient();
  const { offer } = useUndo();

  const query = useQuery({
    queryKey: ["tasks", scope],
    queryFn: () => api<{ tasks: TaskDto[] }>(`/tasks?scope=${scope}`),
  });

  // نفس كاش الداشبورد: بنستخدمه للأرقام في الهيدر والتابات
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDto>("/dashboard"),
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      api<CompleteResult>(`/tasks/${id}/complete`, { method: "POST" }),
    onSuccess: async (data) => {
      offer(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["plant"] }),
        queryClient.invalidateQueries({ queryKey: ["plants"] }),
        queryClient.invalidateQueries({ queryKey: ["care-log"] }),
      ]);
    },
  });
  const snooze = useSnooze();

  const completingId = complete.isPending ? complete.variables : null;
  const snoozing = snooze.isPending ? snooze.variables : null;
  const current = TABS.find((t) => t.value === scope)!;
  const actionError = complete.isError
    ? complete.error.message
    : snooze.isError
      ? snooze.error.message
      : null;

  const all = query.data?.tasks ?? [];
  const tasks =
    typeFilter === "all" ? all : all.filter((t) => t.type === typeFilter);

  // تقسيم المهام لمجموعات
  const now = Date.now();
  const d = new Date(now);
  const today0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const grouped: Record<GroupKey, TaskDto[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
  };
  for (const t of tasks) {
    const due = new Date(t.dueAt).getTime();
    if (due < now && scope !== "upcoming") grouped.overdue.push(t);
    else if (due < today0 + DAY) grouped.today.push(t);
    else if (due < today0 + 2 * DAY) grouped.tomorrow.push(t);
    else grouped.later.push(t);
  }

  return (
    <div className="space-y-6">
      <Header counts={dash.data?.counts} />

      <FadeIn y={12}>
        <div className="space-y-4">
          <Tabs scope={scope} onChange={setScope} counts={dash.data?.counts} />
          <TypeChips value={typeFilter} onChange={setTypeFilter} />
        </div>
      </FadeIn>

      <AnimatePresence>
        {actionError ? (
          <motion.p
            key="action-error"
            role="alert"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {actionError}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {query.isPending ? <LoadingState /> : null}

      {query.isError ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <CircleAlert className="size-10 text-destructive" />
            <p className="text-muted-foreground">{query.error.message}</p>
            <Button
              variant="outline"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              إعادة المحاولة
            </Button>
          </Card>
        </FadeIn>
      ) : null}

      {query.data && tasks.length === 0 ? (
        <EmptyState
          key={`empty-${scope}-${typeFilter}`}
          text={current.empty}
          filtered={typeFilter !== "all" && all.length > 0}
          onReset={() => setTypeFilter("all")}
        />
      ) : null}

      {tasks.length > 0 ? (
        <motion.div
          key={scope}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="space-y-6"
        >
          {GROUPS.map((g) => {
            const list = grouped[g.key];
            if (list.length === 0) return null;
            return (
              <GroupBlock
                key={g.key}
                title={g.title}
                dot={g.dot}
                count={list.length}
              >
                <ul className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {list.map((t, i) => {
                      const snoozingThis = snoozing?.id === t.id;
                      return (
                        <TaskRow
                          key={t.id}
                          task={t}
                          index={i}
                          late={g.key === "overdue"}
                          bar={g.bar}
                          completing={completingId === t.id}
                          snoozing={snoozingThis}
                          snoozingDays={snoozingThis ? snoozing.days : null}
                          onComplete={() => complete.mutate(t.id)}
                          onSnooze={(days) => snooze.mutate({ id: t.id, days })}
                        />
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </GroupBlock>
            );
          })}
        </motion.div>
      ) : null}

      {query.data && all.length === 0 && scope === "overdue" ? (
        <FadeIn>
          <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-primary">
            <CheckCheck className="size-5" />
            كل مهامك في موعدها. استمر!
          </p>
        </FadeIn>
      ) : null}
    </div>
  );
}
