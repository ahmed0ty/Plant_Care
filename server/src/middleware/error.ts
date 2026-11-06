import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'المسار غير موجود', 'NOT_FOUND'));
}

// أخطاء 4xx اللي بتجي من Express نفسه (مثلاً JSON مكسور أو body كبير)
function clientErrorStatus(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) return status;
  }
  return null;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'بيانات غير صحيحة', details: err.issues },
    });
  }
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
  }
    if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
        message: tooLarge ? 'حجم الصورة أكبر من 5MB' : 'طلب رفع غير صالح',
      },
    });
  }
  const status = clientErrorStatus(err);
  if (status) {
    return res
      .status(status)
      .json({ error: { code: 'BAD_REQUEST', message: 'طلب غير صالح' } });
  }
  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'حصل خطأ في السيرفر',
      ...(env.NODE_ENV !== 'production' && { stack: String(err) }),
    },
  });
}