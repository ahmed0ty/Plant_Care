"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Flame } from "lucide-react";
import { ActivityBars } from "@/components/app/activity-bars";
import { CountUp, SLOW } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { StatsDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function StatsCard() {
  const reduce = useReducedMotion();
  const query = useQuery({ queryKey: ["stats"], queryFn: () => api<StatsDto>("/stats") });

  if (query.isPending) return <Skeleton className="h-44" />;
  if (query.isError || !query.data) return null;
  const s = query.data;
  const lit = s.streak > 0;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.span
              className={cn(
                "grid size-12 place-items-center rounded-xl",
                lit
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                  : "bg-muted text-muted-foreground",
              )}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <motion.span
                className="grid place-items-center"
                animate={lit && !reduce ? { scale: [1, 1.12, 1], rotate: [-4, 4, -4] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame className="size-6" />
              </motion.span>
            </motion.span>

            <div>
              <p className="font-display text-3xl font-bold leading-none">
                <CountUp to={s.streak} />
              </p>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                {s.streak === 1 ? "يوم متتالٍ" : "أيام متتالية"}
              </p>
            </div>
          </div>

          <Link
            href="/stats"
            className="group inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            التفاصيل
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>

        {s.total30 > 0 ? (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 * SLOW, ease: EASE, delay: 0.25 }}
          >
            <ActivityBars days={s.days} />
            <p className="text-sm text-muted-foreground">أنجزت {s.total30} مهمة خلال آخر 30 يوماً.</p>
          </motion.div>
        ) : (
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 * SLOW, delay: 0.2 }}
          >
            أنجز أول مهمة لتبدأ سلسلتك.
          </motion.p>
        )}
      </Card>
    </motion.div>
  );
}