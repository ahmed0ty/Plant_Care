import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return (
    <div className="motion-safe:animate-rise">
      <h1 className="font-display text-4xl font-bold">ابدأ رحلتك مع النباتات</h1>
      <p className="mb-8 mt-2 text-lg text-muted-foreground">أنشئ حسابك المجاني في أقل من دقيقة.</p>
      <RegisterForm />
    </div>
  );
}