import { describe, expect, it } from 'vitest';
import { deleteSchema, emailSchema, isValidTimezone, passwordSchema, profileSchema } from './settings';

const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message;

describe('isValidTimezone', () => {
  it('بيقبل منطقة حقيقية ويرفض الغلط', () => {
    expect(isValidTimezone('Africa/Cairo')).toBe(true);
    expect(isValidTimezone('Mars/Base')).toBe(false);
  });
});

describe('profileSchema', () => {
  it('بيقص المسافات من الاسم', () => {
    const r = profileSchema.safeParse({ name: '  أحمد  ' });
    expect(r.success && r.data.name).toBe('أحمد');
  });

  it('بيرفض اسم أقصر من حرفين', () => {
    const r = profileSchema.safeParse({ name: 'أ' });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe('الاسم حرفان على الأقل');
  });

  it('بيرفض اسم أطول من 80 حرف', () => {
    expect(profileSchema.safeParse({ name: 'ا'.repeat(81) }).success).toBe(false);
  });

  it('بيرفض منطقة زمنية غلط', () => {
    const r = profileSchema.safeParse({ timezone: 'Mars/Base' });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe('منطقة زمنية غير صحيحة');
  });

  it('بيقبل تعديل المنطقة الزمنية لوحدها', () => {
    expect(profileSchema.safeParse({ timezone: 'Asia/Riyadh' }).success).toBe(true);
  });

  it('بيرفض طلب فاضي من غير أي تعديل', () => {
    const r = profileSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe('لا توجد تعديلات');
  });
});

describe('emailSchema', () => {
  it('بيحوّل الإيميل لحروف صغيرة ويقص المسافات', () => {
    const r = emailSchema.safeParse({ email: '  Ahmed@Gmail.COM ', password: 'x' });
    expect(r.success && r.data.email).toBe('ahmed@gmail.com');
  });

  it('بيرفض إيميل غير صحيح', () => {
    const r = emailSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe('بريد غير صحيح');
  });

  it('كلمة المرور مطلوبة للتأكيد', () => {
    expect(emailSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(emailSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  const ok = (newPassword: string) => passwordSchema.safeParse({ currentPassword: 'old', newPassword });

  it('بيقبل باسورد 8 أحرف', () => {
    expect(ok('12345678').success).toBe(true);
  });

  it('بيرفض باسورد أقصر من 8', () => {
    const r = ok('1234567');
    expect(r.success).toBe(false);
    expect(firstMessage(r)).toBe('الباسورد 8 أحرف على الأقل');
  });

  it('حد 72 بايت (bcrypt) مش 72 حرف', () => {
    expect(ok('a'.repeat(72)).success).toBe(true);
    expect(ok('a'.repeat(73)).success).toBe(false);
    // الحرف العربي بايتين: 36 حرف = 72 بايت مقبول، و37 حرف = 74 بايت مرفوض
    expect(ok('ب'.repeat(36)).success).toBe(true);
    expect(ok('ب'.repeat(37)).success).toBe(false);
  });

  it('كلمة المرور الحالية مطلوبة', () => {
    expect(passwordSchema.safeParse({ newPassword: '12345678' }).success).toBe(false);
  });
});

describe('deleteSchema', () => {
  it('بيطلب كلمة مرور غير فاضية', () => {
    expect(deleteSchema.safeParse({ password: 'x' }).success).toBe(true);
    expect(deleteSchema.safeParse({ password: '' }).success).toBe(false);
    expect(deleteSchema.safeParse({}).success).toBe(false);
  });
});