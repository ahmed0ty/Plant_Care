export const DAY_MS = 86_400_000;

export const TASK_TYPES = ['water', 'fertilize', 'prune'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const INTERVAL_FIELD = {
  water: 'wateringEveryDays',
  fertilize: 'fertilizingEveryDays',
  prune: 'pruningEveryDays',
} as const;

export interface CareIntervals {
  wateringEveryDays?: number | null;
  fertilizingEveryDays?: number | null;
  pruningEveryDays?: number | null;
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** الفترة بالأيام لنوع المهمة، أو null لو مش متحددة أو غير صالحة */
export function intervalFor(
  care: CareIntervals | null | undefined,
  type: TaskType,
): number | null {
  const value = care?.[INTERVAL_FIELD[type]];
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : null;
}

/** الموعد التالي بيتحسب من وقت إنجاز المهمة فعلياً مش من الموعد القديم */
export function nextDueAt(
  completedAt: Date,
  care: CareIntervals | null | undefined,
  type: TaskType,
): Date | null {
  const days = intervalFor(care, type);
  return days === null ? null : addDays(completedAt, days);
}