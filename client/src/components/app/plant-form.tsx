"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Droplets, ImagePlus, Leaf, LoaderCircle, Scissors, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rise, SLOW, Shake } from "@/components/motion";
import { api, uploadRequest } from "@/lib/api";
import type { CareSuggestion, IdentifyResponse, PlantDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary";

interface FormState {
  nickname: string;
  species: string;
  watering: string;
  fertilizing: string;
  pruning: string;
  light: string;
  notes: string;
}

function initialState(plant?: PlantDto): FormState {
  return {
    nickname: plant?.nickname ?? "",
    species: plant?.species ?? "",
    watering: plant?.care.wateringEveryDays ? String(plant.care.wateringEveryDays) : "",
    fertilizing: plant?.care.fertilizingEveryDays ? String(plant.care.fertilizingEveryDays) : "",
    pruning: plant?.care.pruningEveryDays ? String(plant.care.pruningEveryDays) : "",
    light: plant?.care.light ?? "",
    notes: plant?.care.notes ?? "",
  };
}

function days(v: string): number | undefined {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : undefined;
}

function text(v: string): string | undefined {
  const s = v.trim();
  return s || undefined;
}

function confidenceLevel(c: number) {
  if (c >= 0.75) return { label: "ثقة عالية", tone: "text-lime-700 dark:text-lime-300", bar: "bg-lime-500" };
  if (c >= 0.5) return { label: "ثقة متوسطة", tone: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
  return { label: "ثقة منخفضة", tone: "text-destructive", bar: "bg-destructive" };
}

function Chip({ icon: Icon, children }: { icon: typeof Droplets; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1">
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

function SuggestionCard({
  s,
  selected,
  onSelect,
}: {
  s: CareSuggestion;
  selected: boolean;
  onSelect: () => void;
}) {
  const level = confidenceLevel(s.confidence);
  const pct = Math.round(s.confidence * 100);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "w-full space-y-3 rounded-xl border px-4 py-3 text-start transition-colors",
        selected ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{s.commonNames.join(" · ") || s.species}</p>
          <p dir="ltr" className="truncate text-start text-sm text-muted-foreground">
            {s.species}
          </p>
        </div>
        <AnimatePresence>
          {selected ? (
            <motion.span
              key="applied"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
            >
              <Check className="size-3.5" />
              مُطبّق
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={level.tone}>{level.label}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn("h-full rounded-full", level.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9 * SLOW, ease: EASE, delay: 0.2 }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <Chip icon={Droplets}>ري كل {s.care.wateringEveryDays} يوم</Chip>
        {s.care.fertilizingEveryDays ? <Chip icon={Leaf}>تسميد كل {s.care.fertilizingEveryDays} يوم</Chip> : null}
        {s.care.pruningEveryDays ? <Chip icon={Scissors}>تقليم كل {s.care.pruningEveryDays} يوم</Chip> : null}
        {s.care.light ? <Chip icon={Sun}>{s.care.light}</Chip> : null}
      </div>

      {s.care.notes ? <p className="line-clamp-2 text-sm text-muted-foreground">{s.care.notes}</p> : null}
    </motion.button>
  );
}

/** رسالة بتفتح وتقفل بنعومة (بدون ما تقفز الصفحة) */
function Collapsible({ show, children, id }: { show: boolean; children: React.ReactNode; id: string }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key={id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 * SLOW, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PlantForm({ plant }: { plant?: PlantDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const editing = Boolean(plant);

  const [form, setForm] = useState<FormState>(() => initialState(plant));
  const [imageUrl, setImageUrl] = useState<string | null>(plant?.imageUrl ?? null);
  const [preview, setPreview] = useState<string | null>(plant?.imageUrl ?? null);
  const [result, setResult] = useState<IdentifyResponse["identification"]>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  // لو المستخدم كتب الاسم بنفسه، الاقتراحات ماتغيّروش
  const nicknameTouched = useRef(editing);

  function fail(message: string) {
    setError(message);
    setShake((n) => n + 1);
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function applySuggestion(s: CareSuggestion) {
    const keepName = nicknameTouched.current;
    setSelected(s.species);
    setForm((f) => ({
      ...f,
      nickname: keepName ? f.nickname : s.commonNames[0] || s.species,
      species: s.species,
      watering: String(s.care.wateringEveryDays),
      fertilizing: s.care.fertilizingEveryDays ? String(s.care.fertilizingEveryDays) : "",
      pruning: s.care.pruningEveryDays ? String(s.care.pruningEveryDays) : "",
      light: s.care.light,
      notes: s.care.notes,
    }));
  }

  const identify = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return uploadRequest<IdentifyResponse>("/plants/identify", fd);
    },
    onSuccess: (data) => {
      setImageUrl(data.imageUrl);
      setResult(data.identification);
      const top = data.identification?.suggestions[0];
      if (top && !editing && top.confidence >= 0.6) applySuggestion(top);
      if (!data.identification) {
        setNotice(
          "تعذّر التعرّف على النبتة تلقائياً (الخدمة مشغولة أو غير متاحة الآن). الصورة اتحفظت ويمكنك إدخال البيانات يدوياً.",
        );
      }
    },
    onError: (e) => fail(e.message),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      plant
        ? api(`/plants/${plant.id}`, { method: "PATCH", body })
        : api("/plants", { method: "POST", body }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plants"] }),
        queryClient.invalidateQueries({ queryKey: ["plant"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      router.push(plant ? `/plants/${plant.id}` : "/plants");
    },
    onError: (e) => fail(e.message),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.size > 5 * 1024 * 1024) return fail("حجم الصورة أكبر من 5MB");
    setResult(null);
    setSelected(null);
    setPreview(URL.createObjectURL(file));
    identify.mutate(file);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nickname = text(form.nickname);
    if (!nickname) return fail("اكتب اسماً للنبتة");

    if (plant) {
      // PATCH: null = امسح القيمة
      save.mutate({
        nickname,
        species: text(form.species) ?? null,
        ...(imageUrl && imageUrl !== plant.imageUrl ? { imageUrl } : {}),
        care: {
          wateringEveryDays: days(form.watering) ?? null,
          fertilizingEveryDays: days(form.fertilizing) ?? null,
          pruningEveryDays: days(form.pruning) ?? null,
          light: text(form.light) ?? null,
          notes: text(form.notes) ?? null,
        },
      });
      return;
    }

    save.mutate({
      nickname,
      species: text(form.species),
      imageUrl: imageUrl ?? undefined,
      care: {
        wateringEveryDays: days(form.watering),
        fertilizingEveryDays: days(form.fertilizing),
        pruningEveryDays: days(form.pruning),
        light: text(form.light),
        notes: text(form.notes),
      },
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Rise y={16}>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{editing ? "تعديل النبتة" : "إضافة نبتة"}</h1>
      </Rise>

      <Rise delay={0.1}>
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
              <AnimatePresence mode="wait" initial={false}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <motion.img
                    key={preview}
                    src={preview}
                    alt="معاينة"
                    initial={{ opacity: 0, scale: 1.12 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 * SLOW, ease: EASE }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ImagePlus className="size-8 text-primary" />
                  </motion.span>
                )}
              </AnimatePresence>

              {/* تأثير الفحص أثناء التعرّف */}
              <AnimatePresence>
                {identify.isPending ? (
                  <motion.div
                    key="scan"
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-primary/15"
                      animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute inset-x-0 h-1 bg-primary shadow-[0_0_12px_2px_var(--primary)]"
                      initial={{ top: "0%" }}
                      animate={reduce ? { top: "50%" } : { top: ["0%", "100%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-bold hover:bg-secondary"
              >
                {identify.isPending ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Sparkles className="size-5" />
                )}
                {identify.isPending
                  ? "جارٍ التعرّف..."
                  : editing
                    ? "غيّر الصورة وتعرّف عليها"
                    : "ارفع صورة وتعرّف على النبتة"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onPickFile}
                  disabled={identify.isPending}
                />
              </motion.label>
              <p className="text-sm text-muted-foreground">اختياري، يمكنك الإدخال يدوياً.</p>
            </div>
          </div>

          <Collapsible show={Boolean(notice)} id="notice">
            <p
              role="status"
              className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300"
            >
              {notice}
            </p>
          </Collapsible>

          <AnimatePresence initial={false}>
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 * SLOW, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
                  {result.needsBetterPhoto ? (
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      الثقة منخفضة، جرّب صورة أوضح للنبتة (إضاءة جيدة والنبتة في منتصف الصورة).
                    </p>
                  ) : null}
                  <p className="font-bold">{result.suggestions.length > 1 ? "اختر الاقتراح الأنسب:" : "الاقتراح:"}</p>

                  <motion.ul
                    className="space-y-2"
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 * SLOW } } }}
                  >
                    {result.suggestions.map((s) => (
                      <motion.li
                        key={s.species}
                        variants={{
                          hidden: { opacity: 0, y: 16 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.5 * SLOW, ease: EASE } },
                        }}
                      >
                        <SuggestionCard s={s} selected={selected === s.species} onSelect={() => applySuggestion(s)} />
                      </motion.li>
                    ))}
                  </motion.ul>

                  <Collapsible show={Boolean(selected)} id="hint">
                    <p className="text-sm text-muted-foreground">
                      تمّت تعبئة الحقول بالأسفل، راجعها وعدّلها قبل الحفظ. هذه اقتراحات تقريبية وقد تختلف حسب بيئة
                      نبتتك.
                    </p>
                  </Collapsible>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Card>
      </Rise>

      <Rise delay={0.2}>
        <Shake trigger={shake}>
          <Card className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="font-bold">الاسم *</span>
                <input
                  value={form.nickname}
                  onChange={(e) => {
                    nicknameTouched.current = true;
                    set("nickname")(e);
                  }}
                  maxLength={80}
                  className={inputClass}
                  placeholder="مثال: صبّارة المكتب"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold">النوع</span>
                <input
                  value={form.species}
                  onChange={set("species")}
                  maxLength={120}
                  className={inputClass}
                  placeholder="مثال: Aloe vera"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["watering", "الري كل (يوم)"],
                    ["fertilizing", "التسميد كل (يوم)"],
                    ["pruning", "التقليم كل (يوم)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1.5">
                    <span className="text-sm font-bold">{label}</span>
                    <input value={form[key]} onChange={set(key)} type="number" min={1} max={365} className={inputClass} />
                  </label>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="font-bold">الإضاءة</span>
                <input value={form.light} onChange={set("light")} maxLength={200} className={inputClass} />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold">ملاحظات</span>
                <textarea value={form.notes} onChange={set("notes")} rows={3} maxLength={1000} className={inputClass} />
              </label>

              <Collapsible show={Boolean(error)} id="error">
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              </Collapsible>

              <div className="flex gap-3">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button type="submit" disabled={save.isPending || identify.isPending}>
                    {save.isPending ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "حفظ النبتة"}
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(plant ? `/plants/${plant.id}` : "/plants")}
                  >
                    إلغاء
                  </Button>
                </motion.div>
              </div>
            </form>
          </Card>
        </Shake>
      </Rise>
    </div>
  );
}