import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from './error';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * أي طلب بيغيّر بيانات ومعاه Origin من موقع غير موقعنا بيترفض.
 * الطلبات من غير Origin (أدوات زي PowerShell أو curl) بتعدّي، لأن المتصفح دايماً بيبعته.
 */
export const checkOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.CLIENT_ORIGIN) {
    throw new AppError(403, 'مصدر الطلب غير مسموح', 'BAD_ORIGIN');
  }
  next();
};