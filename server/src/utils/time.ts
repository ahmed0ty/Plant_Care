export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** فرق التوقيت (بالميلي ثانية) بين المنطقة الزمنية وUTC عند لحظة معينة */
function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

function localMidnightUtc(timeZone: string, now: Date, dayOffset: number): Date {
  const off = tzOffsetMs(timeZone, now);
  const local = new Date(now.getTime() + off);
  const target = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
  );
  // نعيد حساب الفرق عند لحظة منتصف الليل نفسها (بيصحّح أيام تغيير التوقيت الصيفي)
  const off2 = tzOffsetMs(timeZone, new Date(target - off));
  return new Date(target - off2);
}

/** بداية ونهاية اليوم الحالي بتوقيت المستخدم، كلحظات UTC */
export function localDayBounds(
  timeZone: string,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const tz = safeTimeZone(timeZone);
  return {
    start: localMidnightUtc(tz, now, 0),
    end: localMidnightUtc(tz, now, 1),
  };
}