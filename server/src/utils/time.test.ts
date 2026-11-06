import { describe, expect, it } from 'vitest';
import { localDayBounds, safeTimeZone } from './time';

describe('localDayBounds', () => {
  it('القاهرة (UTC+2 في نوفمبر)', () => {
    const now = new Date('2026-11-04T03:46:00Z'); // 05:46 بتوقيت القاهرة
    const { start, end } = localDayBounds('Africa/Cairo', now);
    expect(start.toISOString()).toBe('2026-11-03T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T22:00:00.000Z');
  });

  it('اللحظة قبل منتصف الليل تفضل في نفس اليوم', () => {
    const now = new Date('2026-11-04T21:59:59Z'); // 23:59:59 بتوقيت القاهرة
    const { start, end } = localDayBounds('Africa/Cairo', now);
    expect(start.toISOString()).toBe('2026-11-03T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T22:00:00.000Z');
  });

  it('يوم تغيير التوقيت الصيفي (نيويورك) طوله 23 ساعة', () => {
    const now = new Date('2026-03-08T12:00:00Z');
    const { start, end } = localDayBounds('America/New_York', now);
    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });

  it('منطقة زمنية غلط ترجع لـ UTC', () => {
    expect(safeTimeZone('Not/AZone')).toBe('UTC');
    const { start } = localDayBounds('Not/AZone', new Date('2026-11-04T10:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });
});