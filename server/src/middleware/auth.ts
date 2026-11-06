import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error';
import { verifyAccessToken } from '../utils/tokens';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'يجب تسجيل الدخول', 'UNAUTHENTICATED');
  }
  try {
    req.userId = verifyAccessToken(header.slice(7));
  } catch {
    throw new AppError(401, 'الجلسة منتهية', 'TOKEN_INVALID');
  }
  next();
}