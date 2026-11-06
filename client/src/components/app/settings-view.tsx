"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CircleAlert, Eye, EyeOff, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn, Rise, SLOW, Stagger, StaggerItem } from "@/components/motion";
import { api, uploadRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SettingsDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type SettingsResponse = { settings: SettingsDto };

const EASE = [0.22, 1, 0.36, 1] as const;

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary";
const FALLBACK_ZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Europe/London", "UTC"];

/** يفتح ويقفل بنعومة */
function Collapse({ show, children, id }: { show: boolean; children: ReactNode; id: string }) {
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

function Status({ ok, error }: { ok?: string | null; error?: string | null }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {error ? (
        <motion.p
          key={`e-${error}`}
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 * SLOW }}
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </motion.p>
      ) : ok ? (
        <motion.p
          key={`o-${ok}`}
          role="status"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 * SLOW }}
          className="text-sm font-medium text-lime-700 dark:text-lime-300"
        >
          {ok}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold">{label}</span>
      <div dir="ltr" className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={200}
          className={cn(inputClass, "pe-12")}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </motion.button>
      </div>
    </label>
  );
}

function ProfileCard({ s }: { s: SettingsDto }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(s.name);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const done = (data: SettingsResponse) => {
    queryClient.setQueryData(["settings"], data);
    return queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return uploadRequest<SettingsResponse>("/settings/avatar", fd);
    },
    onSuccess: done,
  });

  const removeAvatar = useMutation({
    mutationFn: () => api<SettingsResponse>("/settings/avatar", { method: "DELETE" }),
    onSuccess: done,
  });

  const saveName = useMutation({
    mutationFn: () => api<SettingsResponse>("/settings", { method: "PATCH", body: { name: name.trim() } }),
    onSuccess: (data) => {
      setSaved(true);
      return done(data);
    },
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError(null);
    if (file.size > 5 * 1024 * 1024) return setLocalError("حجم الصورة أكبر من 5MB");
    upload.mutate(file);
  }

  const dirty = name.trim() !== s.name;
  const avatarError =
    localError ?? (upload.isError ? upload.error.message : null) ?? (removeAvatar.isError ? removeAvatar.error.message : null);

  return (
    <Card className="space-y-5 p-6">
      <h2 className="font-display text-2xl font-bold">الملف الشخصي</h2>

      <div className="flex flex-wrap items-center gap-4">
        <motion.div className="relative" whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
          <Avatar name={s.name} src={s.avatarUrl} className="size-24 text-3xl" />
          <AnimatePresence>
            {upload.isPending ? (
              <motion.span
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center rounded-full bg-background/70"
              >
                <LoaderCircle className="size-6 animate-spin" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              <Camera />
              {s.avatarUrl ? "تغيير الصورة" : "رفع صورة"}
            </Button>
            <AnimatePresence initial={false}>
              {s.avatarUrl ? (
                <motion.span
                  key="remove"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 * SLOW }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeAvatar.mutate()}
                    disabled={removeAvatar.isPending}
                  >
                    <Trash2 />
                    إزالة
                  </Button>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <p className="text-sm text-muted-foreground">JPG أو PNG أو WebP، حتى 5MB.</p>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />
        </div>
      </div>
      <Status error={avatarError} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          saveName.mutate();
        }}
        className="space-y-3 border-t border-border pt-5"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">الاسم</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={80}
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saveName.isPending || !dirty || name.trim().length < 2}>
            {saveName.isPending ? "جارٍ الحفظ..." : "حفظ الاسم"}
          </Button>
          <Status
            ok={saved && !dirty ? "تم الحفظ" : null}
            error={saveName.isError ? saveName.error.message : null}
          />
        </div>
      </form>
    </Card>
  );
}

function EmailCard({ s }: { s: SettingsDto }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api<SettingsResponse>("/settings/email", { method: "POST", body: { email: email.trim(), password } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      setEmail("");
      setPassword("");
      setDone(true);
    },
  });

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl font-bold">البريد الإلكتروني</h2>
      <p className="text-sm text-muted-foreground">
        بريدك الحالي: <span dir="ltr" className="font-bold text-foreground">{s.email}</span>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDone(false);
          change.mutate();
        }}
        className="space-y-3"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">البريد الجديد</span>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            className={inputClass}
          />
        </label>
        <PasswordField label="كلمة المرور الحالية (للتأكيد)" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={change.isPending || !email.trim() || !password}>
            {change.isPending ? "جارٍ الحفظ..." : "تغيير البريد"}
          </Button>
          <Status ok={done ? "تم تغيير البريد، استخدمه في تسجيل الدخول من الآن." : null} error={change.isError ? change.error.message : null} />
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api("/settings/password", { method: "POST", body: { currentPassword: current, newPassword: next } }),
    onSuccess: async () => {
      setDone(true);
      await logout();
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (next.length < 8) return setLocalError("كلمة المرور الجديدة 8 أحرف على الأقل");
    if (next !== confirm) return setLocalError("تأكيد كلمة المرور غير مطابق");
    if (next === current) return setLocalError("كلمة المرور الجديدة مطابقة للحالية");
    change.mutate();
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl font-bold">كلمة المرور</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <PasswordField label="كلمة المرور الحالية" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField label="كلمة المرور الجديدة" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <p className="text-sm text-muted-foreground">
          بعد التغيير سيتم تسجيل خروجك من كل الأجهزة، وتدخل بكلمة المرور الجديدة.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={change.isPending || !current || !next || !confirm}>
            {change.isPending ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
          </Button>
          <Status
            ok={done ? "تم التغيير، جارٍ تسجيل الخروج..." : null}
            error={localError ?? (change.isError ? change.error.message : null)}
          />
        </div>
      </form>
    </Card>
  );
}

function TimezoneCard({ s }: { s: SettingsDto }) {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState(s.timezone);
  const [saved, setSaved] = useState(false);

  const options = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;
    return list.includes(s.timezone) ? list : [s.timezone, ...list];
  }, [s.timezone]);

  const save = useMutation({
    mutationFn: () => api<SettingsResponse>("/settings", { method: "PATCH", body: { timezone } }),
    onSuccess: async (data) => {
      setSaved(true);
      queryClient.setQueryData(["settings"], data);
      await Promise.all(
        ["dashboard", "tasks", "stats"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
    },
  });

  const dirty = timezone !== s.timezone;

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl font-bold">المنطقة الزمنية</h2>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted-foreground">
          تُستخدم لحساب «مهام اليوم» والمتأخرة وسلسلة الأيام المتتالية.
        </span>
        <select
          dir="ltr"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaved(false);
          }}
          className={inputClass}
        >
          {options.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
            setSaved(false);
          }}
        >
          استخدم توقيت جهازي
        </Button>
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
          {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
        <Status ok={saved && !dirty ? "تم الحفظ" : null} error={save.isError ? save.error.message : null} />
      </div>
    </Card>
  );
}

function DangerCard() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const del = useMutation({
    mutationFn: () => api("/settings/delete-account", { method: "POST", body: { password } }),
    onSuccess: async () => {
      queryClient.clear();
      await logout();
    },
  });

  return (
    <Card className="space-y-4 border-destructive/40 p-6">
      <h2 className="font-display text-2xl font-bold text-destructive">حذف الحساب</h2>
      <p className="text-sm leading-7 text-muted-foreground">
        سيتم حذف حسابك وكل نباتاتك ومهامك وصور نموها نهائياً، ولا يمكن التراجع.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 * SLOW }}
          >
            <Button type="button" variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
              <Trash2 />
              حذف حسابي
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="open"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 * SLOW, ease: EASE }}
            onSubmit={(e) => {
              e.preventDefault();
              del.mutate();
            }}
            className="space-y-3 overflow-hidden"
          >
            <PasswordField label="أدخل كلمة المرور للتأكيد" value={password} onChange={setPassword} autoComplete="current-password" />
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                disabled={del.isPending || !password}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {del.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                تأكيد الحذف النهائي
              </motion.button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  del.reset();
                }}
                disabled={del.isPending}
              >
                إلغاء
              </Button>
            </div>
            <Status error={del.isError ? del.error.message : null} />
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function SettingsView() {
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsResponse>("/settings"),
  });

  async function onLogout() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
    }
  }

  const s = query.data?.settings;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Rise y={16}>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">الإعدادات</h1>
      </Rise>

      {query.isPending ? <Skeleton className="h-96" /> : null}

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

      {s ? (
        <Stagger className="space-y-6" gap={0.1}>
          <StaggerItem>
            <ProfileCard key={`p-${s.name}`} s={s} />
          </StaggerItem>
          <StaggerItem>
            <EmailCard s={s} />
          </StaggerItem>
          <StaggerItem>
            <PasswordCard />
          </StaggerItem>
          <StaggerItem>
            <TimezoneCard key={`t-${s.timezone}`} s={s} />
          </StaggerItem>

          <StaggerItem>
            <Card className="flex items-center justify-between gap-4 p-6">
              <div>
                <h2 className="font-display text-2xl font-bold">المظهر</h2>
                <p className="text-sm text-muted-foreground">بدّل بين الوضع الفاتح والداكن.</p>
              </div>
              <ThemeToggle />
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Button variant="outline" onClick={onLogout} disabled={leaving}>
              {leaving ? <LoaderCircle className="animate-spin" /> : <LogOut className="rtl:-scale-x-100" />}
              تسجيل الخروج
            </Button>
          </StaggerItem>

          <StaggerItem>
            <DangerCard />
          </StaggerItem>
        </Stagger>
      ) : null}
    </div>
  );
}