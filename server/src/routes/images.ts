import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { uploadSingleImage } from '../middleware/upload';
import { processImage } from '../services/images';
import { uploadImage } from '../services/storage';

export const imagesRouter = Router();
imagesRouter.use(requireAuth);

const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'رفعت صور كتير، حاول بعد شوية' } },
});

/** رفع صورة فقط (مثلاً لتغيير صورة نبات موجود) */
imagesRouter.post('/', imageLimiter, uploadSingleImage, async (req, res) => {
  if (!req.file) throw new AppError(400, 'لم يتم رفع صورة', 'NO_FILE');
  const processed = await processImage(req.file.buffer);
  const imageUrl = await uploadImage(processed, req.userId!);
  res.status(201).json({ imageUrl });
});