import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const tooMany = (message: string) => ({ error: { code: 'RATE_LIMIT', message } });
const common = { standardHeaders: true, legacyHeaders: false } as const;

/**
 * التسجيل: كل المحاولات بتتعد (ناجحة أو فاشلة).
 * 10 في الساعة لكل IP. لو شبكات الموبايل عندكم بتشارك IP واحد بين ناس كتير، زوّد الرقم.
 */
export const registerLimiter = rateLimit({
  ...common,
  windowMs: HOUR,
  limit: 10,
  message: tooMany('تم إنشاء حسابات كتير من نفس الشبكة، حاول بعد ساعة'),
});

/** قاطع طوارئ: سقف يومي لكل التسجيلات على السيرفر كله */
export const registerDailyCap = rateLimit({
  ...common,
  windowMs: 24 * HOUR,
  limit: 500,
  keyGenerator: () => 'global-register',
  message: tooMany('التسجيل متوقف مؤقتاً بسبب ضغط عالي، حاول لاحقاً'),
});

/** الدخول: بيعد الفاشل بس، لكل IP */
export const loginIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 30,
  skipSuccessfulRequests: true,
  message: tooMany('محاولات دخول كتير، حاول بعد 15 دقيقة'),
});

function accountKey(req: Request): string {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof email === 'string' && email.trim()) {
    return `acct:${email.trim().toLowerCase().slice(0, 254)}`;
  }
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/** الدخول: بيعد الفاشل بس، لكل إيميل (بيمنع تخمين باسورد حساب واحد من عناوين كتير) */
export const loginAccountLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: accountKey,
  message: tooMany('محاولات كتير على هذا الحساب، حاول بعد 15 دقيقة'),
});

/** تجديد الجلسة */
export const refreshLimiter = rateLimit({
  ...common,
  windowMs: 15 * MIN,
  limit: 60,
  message: tooMany('طلبات كتير، حاول بعد شوية'),
});