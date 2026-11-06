import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="motion-safe:animate-rise">
      <h1 className="font-display text-4xl font-bold">أهلاً بعودتك</h1>
      <p className="mb-8 mt-2 text-lg text-muted-foreground">سجّل دخولك لمتابعة نباتاتك ومهامك.</p>
      <LoginForm />
    </div>
  );
}