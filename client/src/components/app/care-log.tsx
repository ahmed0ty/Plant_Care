"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatAgo, formatDay, TASK_META } from "@/lib/tasks";
import type { CareLogDto, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: TaskType[] = ["water", "fertilize", "prune"];

export function CareLog({ plantId }: { plantId: string }) {
  const query = useQuery({
    queryKey: ["care-log", plantId],
    queryFn: () => api<CareLogDto>(`/plants/${plantId}/care-log`),
  });

  const data = query.data;

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-bold">سجل العناية</h2>

      {query.isPending ? <Skeleton className="h-40" /> : null}
      {query.isError ? <p className="text-muted-foreground">{query.error.message}</p> : null}

      {data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((type) => {
              const meta = TASK_META[type];
              const Icon = meta.icon;
              const s = data.summary[type];
              return (
                <Card key={type} className="flex items-center gap-3 p-4">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tone)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">آخر {meta.label}</p>
                    <p className="font-bold">{s.lastAt ? formatAgo(s.lastAt) : "لم يتم بعد"}</p>
                    {s.count > 0 ? <p className="text-xs text-muted-foreground">{s.count} مرة إجمالاً</p> : null}
                  </div>
                </Card>
              );
            })}
          </div>

          {data.entries.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              لا يوجد سجل بعد. ستظهر هنا كل مهمة تعلّمها «تمّ».
            </Card>
          ) : (
            <Card className="divide-y divide-border px-5">
              {data.entries.map((e) => {
                const meta = TASK_META[e.type];
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="flex items-center gap-3 py-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", meta.tone)}>
                      <Icon className="size-4" />
                    </span>
                    <p className="flex-1 font-bold">{meta.label}</p>
                    <div className="text-end text-sm">
                      <p>{formatDay(e.completedAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatAgo(e.completedAt)}</p>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      ) : null}
    </section>
  );
}