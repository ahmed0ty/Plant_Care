import { describe, expect, it } from 'vitest';
import { DAY_MS, addDays, intervalFor, nextDueAt } from './schedule';

describe('schedule', () => {
  const base = new Date('2026-11-04T10:00:00Z');

  it('addDays يضيف عدد الأيام بالظبط', () => {
    expect(addDays(base, 3).toISOString()).toBe('2026-11-07T10:00:00.000Z');
    expect(addDays(base, 0).getTime()).toBe(base.getTime());
    expect(addDays(base, 1).getTime() - base.getTime()).toBe(DAY_MS);
  });

  it('intervalFor يرجّع الفترة الصحيحة لكل نوع', () => {
    const care = { wateringEveryDays: 7, fertilizingEveryDays: 30, pruningEveryDays: null };
    expect(intervalFor(care, 'water')).toBe(7);
    expect(intervalFor(care, 'fertilize')).toBe(30);
    expect(intervalFor(care, 'prune')).toBeNull();
  });

  it('intervalFor يتجاهل القيم غير الصالحة', () => {
    expect(intervalFor({ wateringEveryDays: 0 }, 'water')).toBeNull();
    expect(intervalFor({ wateringEveryDays: -3 }, 'water')).toBeNull();
    expect(intervalFor({ wateringEveryDays: 2.5 }, 'water')).toBeNull();
    expect(intervalFor(undefined, 'water')).toBeNull();
    expect(intervalFor(null, 'water')).toBeNull();
  });

  it('nextDueAt بيتحسب من وقت الإنجاز مش الموعد القديم', () => {
    const completedLate = new Date('2026-11-10T08:00:00Z');
    expect(nextDueAt(completedLate, { wateringEveryDays: 7 }, 'water')?.toISOString()).toBe(
      '2026-11-17T08:00:00.000Z',
    );
  });

  it('nextDueAt يرجّع null لو مفيش فترة', () => {
    expect(nextDueAt(base, {}, 'prune')).toBeNull();
  });
});