import { Droplets, Leaf, Scissors, type LucideIcon } from "lucide-react";
import type { TaskType } from "./types";

export const TASK_META: Record<
  TaskType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  water: {
    label: "ري",
    icon: Droplets,
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  fertilize: {
    label: "تسميد",
    icon: Leaf,
    tone: "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300",
  },
  prune: {
    label: "تقليم",
    icon: Scissors,
    tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
};

const dateFormat = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "short",
});

export function formatDue(iso: string): string {
  return dateFormat.format(new Date(iso));
}
const dayWithYear = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDay(iso: string): string {
  return dayWithYear.format(new Date(iso));
}

/** "اليوم" / "أمس" / "منذ 4 أيام" بالأيام التقويمية بتوقيت المتصفح */
export function formatAgo(iso: string): string {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 86_400_000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوماً`;
}