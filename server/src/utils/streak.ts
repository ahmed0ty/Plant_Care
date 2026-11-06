export function safeTimezone(tz: string | null | undefined): string {
  try {
    if (tz) {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return tz;
    }
  } catch {
    /* منطقة غير صالحة */
  }
  return 'UTC';
}

/** YYYY-MM-DD بتوقيت المستخدم */
export function dayKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** حساب تقويمي بحت (مش بيتأثر بالتوقيت الصيفي) */
export function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * perDay: عدد المهام المنجزة لكل يوم (YYYY-MM-DD).
 * السلسلة الحالية تبدأ من النهاردة لو فيه إنجاز، وإلا من إمبارح (اليوم لسه ما خلصش).
 * فترة المراجعة = lookbackDays + 1 يوم.
 */
export function computeStreaks(perDay: ReadonlyMap<string, number>, today: string, lookbackDays = 120) {
  const has = (key: string) => (perDay.get(key) ?? 0) > 0;
  const activeToday = has(today);

  let cursor = activeToday ? today : shiftDay(today, -1);
  let streak = 0;
  while (has(cursor) && streak <= lookbackDays) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }

  let bestStreak = 0;
  let run = 0;
  for (let i = lookbackDays; i >= 0; i--) {
    if (has(shiftDay(today, -i))) {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  return { streak, bestStreak, activeToday };
}