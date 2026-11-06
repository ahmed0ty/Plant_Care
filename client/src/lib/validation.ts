import { z } from "zod";

// نفس قواعد السيرفر بالظبط (السيرفر هو المرجع، ده بس لتجربة استخدام أسرع)
export const loginSchema = z.object({
  email: z.string().trim().min(1, "أدخل البريد الإلكتروني").email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم حرفان على الأقل").max(80, "الاسم طويل جداً"),
  email: z.string().trim().min(1, "أدخل البريد الإلكتروني").email("البريد الإلكتروني غير صحيح"),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .refine((p) => new TextEncoder().encode(p).length <= 72, "كلمة المرور طويلة جداً"),
});

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function fieldErrors<K extends string>(error: z.ZodError): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as K | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** مسار التحويل بعد الدخول: داخلي فقط (ضد open redirect) */
export function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}