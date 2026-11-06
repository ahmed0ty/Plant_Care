import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { Plant } from '../models/Plant';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { computeStreaks, dayKey, safeTimezone, shiftDay } from '../utils/streak';

export const statsRouter = Router();
statsRouter.use(requireAuth);

const WINDOW_DAYS = 30;
const LOOKBACK_DAYS = 120;
const DAY_MS = 86_400_000;

statsRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const user = await User.findById(userId).select('timezone');
  const tz = safeTimezone(user?.timezone);
  const now = new Date();
  const today = dayKey(now, tz);
  const uid = new Types.ObjectId(userId);
  const since = new Date(now.getTime() - (LOOKBACK_DAYS + 2) * DAY_MS);
  const since30 = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);

  const rows = await Task.aggregate<{ _id: { day: string; type: string }; count: number }>([
    { $match: { userId: uid, status: 'completed', completedAt: { $gte: since } } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: tz } },
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r._id.day, (perDay.get(r._id.day) ?? 0) + r.count);

  const windowKeys: string[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) windowKeys.push(shiftDay(today, -i));
  const inWindow = new Set(windowKeys);

  const days = windowKeys.map((date) => ({ date, count: perDay.get(date) ?? 0 }));
  const total30 = days.reduce((s, d) => s + d.count, 0);

  const byType = { water: 0, fertilize: 0, prune: 0 };
  for (const r of rows) {
    if (inWindow.has(r._id.day) && r._id.type in byType) {
      byType[r._id.type as keyof typeof byType] += r.count;
    }
  }

  const { streak, bestStreak, activeToday } = computeStreaks(perDay, today, LOOKBACK_DAYS);

  const top = await Task.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { userId: uid, status: 'completed', completedAt: { $gte: since30 } } },
    { $group: { _id: '$plantId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 3 },
  ]);
  const plants = top.length
    ? await Plant.find({ _id: { $in: top.map((t) => t._id) }, userId }).select('nickname imageUrl')
    : [];
  const byId = new Map(plants.map((p) => [p.id, p]));
  const topPlants = top.flatMap((t) => {
    const p = byId.get(String(t._id));
    return p ? [{ id: p.id, nickname: p.nickname, imageUrl: p.imageUrl ?? null, count: t.count }] : [];
  });

  res.json({ days, total30, byType, streak, bestStreak, activeToday, topPlants });
});