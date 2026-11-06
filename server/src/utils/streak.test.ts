import { describe, expect, it } from 'vitest';
import { computeStreaks, dayKey, safeTimezone, shiftDay } from './streak';

const TODAY = '2026-11-04';

// بيبني خريطة أيام من "كام يوم قبل النهاردة"
const active = (...offsets: number[]) => new Map(offsets.map((o) => [shiftDay(TODAY, -o), 1]));

describe('shiftDay', () => {
  it('بيعدّي حدود الشهر والسنة', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('بيراعي السنة الكبيسة', () => {
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('صفر يوم بيرجّع نفس اليوم', () => {
    expect(shiftDay(TODAY, 0)).toBe(TODAY);
  });
});

describe('dayKey', () => {
  it('اليوم بيتحسب بتوقيت المستخدم', () => {
    const instant = new Date('2026-11-04T22:30:00Z');
    expect(dayKey(instant, 'UTC')).toBe('2026-11-04');
    expect(dayKey(instant, 'Asia/Riyadh')).toBe('2026-11-05'); // UTC+3
  });
});

describe('safeTimezone', () => {
  it('بيرجّع المنطقة الصالحة زي ما هي', () => {
    expect(safeTimezone('Africa/Cairo')).toBe('Africa/Cairo');
  });

  it('بيرجّع UTC لو المنطقة غلط أو فاضية', () => {
    expect(safeTimezone('Not/AZone')).toBe('UTC');
    expect(safeTimezone('')).toBe('UTC');
    expect(safeTimezone(null)).toBe('UTC');
    expect(safeTimezone(undefined)).toBe('UTC');
  });
});

describe('computeStreaks', () => {
  it('مفيش إنجازات = صفر', () => {
    expect(computeStreaks(new Map(), TODAY)).toEqual({ streak: 0, bestStreak: 0, activeToday: false });
  });

  it('بيعدّ الأيام المتتالية من النهاردة', () => {
    expect(computeStreaks(active(0, 1, 2), TODAY)).toEqual({ streak: 3, bestStreak: 3, activeToday: true });
  });

  it('لو النهاردة لسه ما فيهوش إنجاز، السلسلة بتكمل من إمبارح', () => {
    expect(computeStreaks(active(1, 2, 3), TODAY)).toEqual({ streak: 3, bestStreak: 3, activeToday: false });
  });

  it('يوم فاضي في النص بيقطع السلسلة', () => {
    expect(computeStreaks(active(0, 1, 3, 4, 5), TODAY).streak).toBe(2);
  });

  it('لو آخر إنجاز من يومين فالسلسلة الحالية صفر', () => {
    expect(computeStreaks(active(2, 3), TODAY)).toEqual({ streak: 0, bestStreak: 2, activeToday: false });
  });

  it('أطول سلسلة ممكن تكون قديمة', () => {
    const r = computeStreaks(active(0, 6, 7, 8, 9, 10), TODAY);
    expect(r.streak).toBe(1);
    expect(r.bestStreak).toBe(5);
  });

  it('عدد صفر ما بيتحسبش إنجاز', () => {
    const map = new Map([[TODAY, 0]]);
    expect(computeStreaks(map, TODAY).activeToday).toBe(false);
  });

  it('السلسلة محدودة بفترة المراجعة (lookback + 1 يوم)', () => {
    const many = active(...Array.from({ length: 50 }, (_, i) => i));
    expect(computeStreaks(many, TODAY, 5)).toEqual({ streak: 6, bestStreak: 6, activeToday: true });
  });
});