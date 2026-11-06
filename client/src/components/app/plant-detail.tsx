"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Sprout,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FadeIn, ParallaxImage, Rise } from "@/components/motion";

import { api } from "@/lib/api";
import { formatDue, TASK_META } from "@/lib/tasks";
import type { PlantDetailDto } from "@/lib/types";

import { GrowthTimeline } from "@/components/app/growth-timeline";
import { CareLog } from "@/components/app/care-log";
import { SnoozeButtons, useSnooze } from "@/components/app/snooze-buttons";
import { PlantChat } from "@/components/app/plant-chat";
import { CloudImage } from "../cloud-image";

const EASE = [0.22, 1, 0.36, 1] as const;

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirming, setConfirming] = useState(false);

  const query = useQuery({
    queryKey: ["plant", id],
    queryFn: () => api<PlantDetailDto>(`/plants/${id}`),
  });

  const remove = useMutation({
    mutationFn: () => api(`/plants/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["plant", id] });
      await queryClient.invalidateQueries({ queryKey: ["plants"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace("/plants");
    },
  });

  const snooze = useSnooze();
  const snoozing = snooze.isPending ? snooze.variables : null;

  const data = query.data;
  const care = data?.plant.care;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Rise y={8}>
        <Link
          href="/plants"
          className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          نباتاتي
        </Link>
      </Rise>

      {query.isPending ? <Skeleton className="h-80" /> : null}

      {query.isError ? (
        <FadeIn>
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <CircleAlert className="size-10 text-destructive" />

            <p className="text-muted-foreground">{query.error.message}</p>

            <Button variant="outline" onClick={() => router.push("/plants")}>
              العودة للقائمة
            </Button>
          </Card>
        </FadeIn>
      ) : null}

      {data && care ? (
        <>
          <Rise delay={0.05}>
            <Card className="overflow-hidden">
              <div className="h-56 bg-secondary">
                {data.plant.imageUrl ? (
                  <ParallaxImage className="h-full w-full">
                    <CloudImage
                      src={data.plant.imageUrl}
                      alt={data.plant.nickname}
                      sizes="(min-width:672px) 672px, 100vw"
                      priority
                      className="h-full w-full object-cover"
                    />
                  </ParallaxImage>
                ) : (
                  <div className="grid h-full place-items-center">
                    <Sprout className="size-16 text-primary" />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <h1 className="font-display text-3xl font-bold">
                    {data.plant.nickname}
                  </h1>

                  {data.plant.species ? (
                    <p dir="ltr" className="mt-1 text-start text-muted-foreground">
                      {data.plant.species}
                    </p>
                  ) : null}
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  {[
                    ["الري", care.wateringEveryDays],
                    ["التسميد", care.fertilizingEveryDays],
                    ["التقليم", care.pruningEveryDays],
                  ].map(([label, value], i) => (
                    <motion.div
                      key={label as string}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.1 }}
                      className="rounded-xl bg-secondary px-4 py-3"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-bold">
                        {value ? `كل ${value} يوم` : "غير محدد"}
                      </dd>
                    </motion.div>
                  ))}
                </dl>

                {care.light ? (
                  <p>
                    <span className="font-bold">الإضاءة: </span>
                    {care.light}
                  </p>
                ) : null}

                {care.notes ? (
                  <p>
                    <span className="font-bold">ملاحظات: </span>
                    {care.notes}
                  </p>
                ) : null}
              </div>
            </Card>
          </Rise>

          <FadeIn>
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">المهام القادمة</h2>

              <AnimatePresence>
                {snooze.isError ? (
                  <motion.p
                    key="snooze-error"
                    role="alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  >
                    {snooze.error.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <Card className="divide-y divide-border overflow-hidden px-5">
                {data.tasks.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    لا توجد مهام معلّقة
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {data.tasks.map((t) => {
                      const meta = TASK_META[t.type];
                      const Icon = meta.icon;
                      const snoozingThis = snoozing?.id === t.id;

                      return (
                        <motion.div
                          key={t.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="flex flex-wrap items-center gap-3 py-3.5"
                        >
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.tone}`}
                          >
                            <Icon className="size-5" />
                          </span>

                          <div className="flex-1 basis-32">
                            <p className="font-bold">{meta.label}</p>
                            <p className="text-sm text-muted-foreground">
                              الموعد: {formatDue(t.dueAt)}
                            </p>
                          </div>

                          <SnoozeButtons
                            taskName={`${meta.label} ${data.plant.nickname}`}
                            busyDays={snoozingThis ? snoozing.days : null}
                            disabled={snoozingThis}
                            onSnooze={(days) => snooze.mutate({ id: t.id, days })}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </Card>
            </section>
          </FadeIn>

          <FadeIn>
            <CareLog plantId={data.plant.id} />
          </FadeIn>

          <FadeIn>
            <GrowthTimeline plantId={data.plant.id} />
          </FadeIn>

          <FadeIn>
            <PlantChat plantId={data.plant.id} plantName={data.plant.nickname} />
          </FadeIn>

          <FadeIn y={12}>
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href={`/plants/${id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground"
                >
                  <Pencil className="size-5" />
                  تعديل
                </Link>
              </motion.div>

              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirming(true)}
                disabled={remove.isPending}
              >
                {remove.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                حذف النبتة
              </Button>
            </div>
          </FadeIn>

          <ConfirmDialog
            open={confirming}
            title={`حذف "${data.plant.nickname}"؟`}
            description="سيتم حذف النبتة مع كل مهامها وصور نموها نهائياً، ولا يمكن التراجع."
            busy={remove.isPending}
            error={remove.isError ? remove.error.message : null}
            onConfirm={() => remove.mutate()}
            onCancel={() => {
              remove.reset();
              setConfirming(false);
            }}
          />
        </>
      ) : null}
    </div>
  );
}