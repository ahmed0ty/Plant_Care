import { Router, type CookieOptions, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import {
  loginAccountLimiter,
  loginIpLimiter,
  refreshLimiter,
  registerDailyCap,
  registerLimiter,
} from '../middleware/rateLimits';
import { Busy, createLimiter } from '../utils/concurrency';
import {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';

export const authRouter = Router();

const COOKIE_NAME = 'refresh_token';
const BCRYPT_COST = 12;
const MAX_SESSIONS = 10; // أقصى عدد جلسات مفتوحة للمستخدم الواحد
// للمقارنة الوهمية عشان وقت الرد يبقى واحد سواء الإيميل موجود أو لأ
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

// bcrypt تقيل: 4 عمليات في نفس الوقت بالكتير، و20 في الطابور، والزيادة بتتحول لـ 503
const hashGate = createLimiter(4, 20);
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await hashGate(fn);
  } catch (e) {
    if (e instanceof Busy) throw new AppError(503, 'السيرفر مشغول، حاول بعد لحظات', 'BUSY');
    throw e;
  }
}

const cookieBase: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
};

const password = z
  .string()
  .min(8, 'الباسورد 8 أحرف على الأقل')
  .refine((p) => Buffer.byteLength(p) <= 72, 'الباسورد طويل جداً');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

const publicUser = (u: { id: string; name: string; email: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
});

async function startSession(res: Response, userId: string): Promise<string> {
  const refreshToken = signRefreshToken(userId);
  await RefreshToken.create({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400 * 1000),
  });

  // نبقي آخر MAX_SESSIONS جلسة بس، عشان الجدول ما يكبرش من تسجيلات دخول متكررة
  const stale = await RefreshToken.find({ userId }).sort({ _id: -1 }).skip(MAX_SESSIONS).select('_id');
  if (stale.length > 0) {
    await RefreshToken.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  }

  res.cookie(COOKIE_NAME, refreshToken, {
    ...cookieBase,
    maxAge: env.REFRESH_TTL_DAYS * 86400 * 1000,
  });
  return signAccessToken(userId);
}

const isDuplicateKey = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === 11000;

authRouter.post('/register', registerLimiter, registerDailyCap, async (req, res) => {
  const data = registerSchema.parse(req.body);

  // فحص رخيص قبل ما نصرف معالج على bcrypt (والـ unique index لسه هو الحكم النهائي)
  if (await User.exists({ email: data.email })) {
    throw new AppError(409, 'البريد الإلكتروني مستخدم بالفعل', 'EMAIL_TAKEN');
  }

  const passwordHash = await guarded(() => bcrypt.hash(data.password, BCRYPT_COST));

  try {
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });
    const accessToken = await startSession(res, user.id);
    res.status(201).json({ user: publicUser(user), accessToken });
  } catch (e) {
    if (isDuplicateKey(e)) {
      throw new AppError(409, 'البريد الإلكتروني مستخدم بالفعل', 'EMAIL_TAKEN');
    }
    throw e;
  }
});

authRouter.post('/login', loginIpLimiter, loginAccountLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');

  const valid = await guarded(() => bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH));
  if (!user || !valid) {
    throw new AppError(401, 'البريد أو الباسورد غير صحيح', 'BAD_CREDENTIALS');
  }

  const accessToken = await startSession(res, user.id);
  res.json({ user: publicUser(user), accessToken });
});

authRouter.post('/refresh', refreshLimiter, async (req, res) => {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token !== 'string') {
    throw new AppError(401, 'لا توجد جلسة', 'NO_SESSION');
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(token);
  } catch {
    res.clearCookie(COOKIE_NAME, cookieBase);
    throw new AppError(401, 'الجلسة منتهية', 'SESSION_EXPIRED');
  }

  // الـ token يتاستخدم مرة واحدة بس
  const used = await RefreshToken.findOneAndDelete({
    tokenHash: sha256(token),
    userId,
  });
  if (!used) {
    // token صحيح التوقيع بس مش موجود = اتستخدم قبل كده، نقفل كل جلسات المستخدم
    await RefreshToken.deleteMany({ userId });
    res.clearCookie(COOKIE_NAME, cookieBase);
    throw new AppError(401, 'الجلسة غير صالحة', 'SESSION_REVOKED');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.clearCookie(COOKIE_NAME, cookieBase);
    throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');
  }

  const accessToken = await startSession(res, user.id);
  res.json({ user: publicUser(user), accessToken });
});

authRouter.post('/logout', async (req, res) => {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token === 'string') {
    await RefreshToken.deleteOne({ tokenHash: sha256(token) });
  }
  res.clearCookie(COOKIE_NAME, cookieBase);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');
  res.json({ user: publicUser(user) });
});