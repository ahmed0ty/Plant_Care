"use client";

import { motion, useReducedMotion } from "motion/react";
import { SLOW } from "@/components/motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ActivityBars({
  days,
  className,
}: {
  days: { date: string; count: number }[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <div
      role="img"
      aria-label={`${total} مهمة منجزة خلال آخر ${days.length} يوم`}
      className={cn("flex h-24 items-end gap-1", className)}
    >
      {days.map((d, i) => (
        <motion.div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className={cn("flex-1 rounded-sm", d.count ? "bg-primary" : "bg-muted")}
          initial={{ height: "0%" }}
          animate={{ height: d.count ? `${Math.max((d.count / max) * 100, 12)}%` : "6%" }}
          transition={{
            duration: reduce ? 0 : 0.7 * SLOW,
            ease: EASE,
            delay: reduce ? 0 : i * 0.02 * SLOW,
          }}
        />
      ))}
    </div>
  );
}