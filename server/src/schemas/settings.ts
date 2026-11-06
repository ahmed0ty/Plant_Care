import { z } from 'zod';

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم حرفان على الأقل').max(80).optional(),
    timezone: z.string().trim().max(64).refine(isValidTimezone, 'منطقة زمنية غير صحيحة').optional(),
  })
  .refine((d) => d.name !== undefined || d.timezone !== undefined, 'لا توجد تعديلات');

export const newPassword = z
  .string()
  .min(8, 'الباسورد 8 أحرف على الأقل')
  .refine((p) => Buffer.byteLength(p) <= 72, 'الباسورد طويل جداً');

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('بريد غير صحيح').max(254),
  password: z.string().min(1).max(200),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword,
});

export const deleteSchema = z.object({ password: z.string().min(1).max(200) });