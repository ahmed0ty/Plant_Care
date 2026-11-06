"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField, TextField } from "@/components/ui/field";
import { FormAlert } from "@/components/auth/form-alert";
import { Shake, Stagger, StaggerItem } from "@/components/motion";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldErrors, loginSchema, type FieldErrors } from "@/lib/validation";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setShake((n) => n + 1);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      // التحويل بعد النجاح بيتم في RedirectIfAuthed
      await login(parsed.data);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
      setShake((n) => n + 1);
      setPending(false);
    }
  }

  return (
    <Shake trigger={shake}>
      <form onSubmit={onSubmit} noValidate>
        <AnimatePresence initial={false}>
          {formError ? (
            <motion.div
              key="form-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pb-5">
                <FormAlert message={formError} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Stagger className="space-y-5" gap={0.07}>
          <StaggerItem>
            <TextField
              id="email"
              label="البريد الإلكتروني"
              type="email"
              dir="ltr"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </StaggerItem>

          <StaggerItem>
            <PasswordField
              id="password"
              label="كلمة المرور"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
          </StaggerItem>

          <StaggerItem>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  جارٍ الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </StaggerItem>

          <StaggerItem>
            <p className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="font-bold text-primary underline-offset-4 hover:underline">
                أنشئ حساباً
              </Link>
            </p>
          </StaggerItem>
        </Stagger>
      </form>
    </Shake>
  );
}