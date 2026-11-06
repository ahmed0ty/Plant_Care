import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: env.ACCESS_TTL_SECONDS,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    jwtid: crypto.randomUUID(),
    expiresIn: env.REFRESH_TTL_DAYS * 86400,
  });
}

function readSubject(payload: string | jwt.JwtPayload): string {
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return payload.sub;
}

export function verifyAccessToken(token: string): string {
  return readSubject(
    jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }),
  );
}

export function verifyRefreshToken(token: string): string {
  return readSubject(
    jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }),
  );
}