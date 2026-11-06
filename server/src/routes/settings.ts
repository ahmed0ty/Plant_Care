import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';
import { GrowthLog } from '../models/GrowthLog';
import { Plant } from '../models/Plant';
import { RefreshToken } from '../models/RefreshToken';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { deleteSchema, emailSchema, passwordSchema, profileSchema } from '../schemas/settings';
import { processImage } from '../services/images';
import { uploadImage } from '../services/storage';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const BCRYPT_COST = 12;

const isDuplicateKey = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === 11000;

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'محاولات كتير، حاول بعد شوية' } },
});

const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'وصلت للحد الأقصى لتغيير الصورة، حاول بعد ساعة' } },
});

const toDto = (u: {
  name: string;
  email: string;
  timezone?: string | null;
  avatarUrl?: string | null;
}) => ({
  name: u.name,
  email: u.email,
  timezone: u.timezone ?? 'Africa/Cairo',
  avatarUrl: u.avatarUrl ?? null,
});

/** يتأكد من كلمة المرور الحالية. 403 مش 401 عشان الفرونت ما يحاولش يجدد الجلسة */
async function verifyPassword(userId: string, password: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(403, 'كلمة المرور الحالية غير صحيحة', 'BAD_PASSWORD');
  return user;
}

settingsRouter.get('/', async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');
  res.json({ settings: toDto(user) });
});

// الاسم والمنطقة الزمنية
settingsRouter.patch('/', async (req, res) => {
  const patch = profileSchema.parse(req.body);
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');

  if (patch.name !== undefined) user.name = patch.name;
  if (patch.timezone !== undefined) user.timezone = patch.timezone;
  await user.save();
  res.json({ settings: toDto(user) });
});

// الصورة الشخصية
settingsRouter.post('/avatar', avatarLimiter, uploadSingleImage, async (req, res) => {
  const userId = req.userId!;
  if (!req.file) throw new AppError(400, 'لم يتم رفع صورة', 'NO_FILE');

  const user = await User.findById(userId);
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');

  const processed = await processImage(req.file.buffer);
  user.avatarUrl = await uploadImage(processed, userId);
  await user.save();
  res.json({ settings: toDto(user) });
});

settingsRouter.delete('/avatar', async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, 'المستخدم غير موجود', 'NO_USER');

  user.set('avatarUrl', undefined);
  await user.save();
  res.json({ settings: toDto(user) });
});

// تغيير الإيميل (بكلمة المرور)
settingsRouter.post('/email', sensitiveLimiter, async (req, res) => {
  const { email, password } = emailSchema.parse(req.body);
  const user = await verifyPassword(req.userId!, password);

  if (email === user.email) throw new AppError(400, 'هذا هو بريدك الحالي بالفعل', 'SAME_EMAIL');

  user.email = email;
  try {
    await user.save();
  } catch (e) {
    if (isDuplicateKey(e)) throw new AppError(409, 'البريد الإلكتروني مستخدم بالفعل', 'EMAIL_TAKEN');
    throw e;
  }
  res.json({ settings: toDto(user) });
});

// تغيير كلمة المرور: بنقفل كل الجلسات، والفرونت بيسجّل خروج وانت تدخل بالجديدة
settingsRouter.post('/password', sensitiveLimiter, async (req, res) => {
  const body = passwordSchema.parse(req.body);
  const user = await verifyPassword(req.userId!, body.currentPassword);

  if (body.currentPassword === body.newPassword) {
    throw new AppError(400, 'كلمة المرور الجديدة مطابقة للحالية', 'SAME_PASSWORD');
  }

  user.passwordHash = await bcrypt.hash(body.newPassword, BCRYPT_COST);
  await user.save();
  await RefreshToken.deleteMany({ userId: user.id });
  res.json({ ok: true });
});

// حذف الحساب نهائياً
settingsRouter.post('/delete-account', sensitiveLimiter, async (req, res) => {
  const { password } = deleteSchema.parse(req.body);
  const userId = req.userId!;
  const user = await verifyPassword(userId, password);

  await Promise.all([
    Task.deleteMany({ userId }),
    GrowthLog.deleteMany({ userId }),
    Plant.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: user._id });
  res.status(204).end();
});