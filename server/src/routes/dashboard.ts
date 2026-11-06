import { Router } from 'express';
import { Plant } from '../models/Plant';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { requireAuth } from '../middleware/auth';
import { localDayBounds } from '../utils/time';
import { toTaskDtos } from '../services/tasks';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const user = await User.findById(userId).select('timezone');
  const { start, end } = localDayBounds(user?.timezone ?? 'UTC');

  const overdueFilter = {
    userId,
    status: 'pending' as const,
    dueAt: { $lt: start },
  };
  const todayFilter = {
    userId,
    status: 'pending' as const,
    dueAt: { $gte: start, $lt: end },
  };

  const [plantCount, overdueCount, todayCount, overdue, today, recent] =
    await Promise.all([
      Plant.countDocuments({ userId }),
      Task.countDocuments(overdueFilter),
      Task.countDocuments(todayFilter),
      Task.find(overdueFilter).sort({ dueAt: 1 }).limit(20),
      Task.find(todayFilter).sort({ dueAt: 1 }).limit(20),
      Task.find({ userId, status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(5),
    ]);

  const [overdueTasks, todayTasks, recentTasks] = await Promise.all([
    toTaskDtos(userId, overdue),
    toTaskDtos(userId, today),
    toTaskDtos(userId, recent),
  ]);

  res.json({
    counts: { plants: plantCount, overdue: overdueCount, today: todayCount },
    overdue: overdueTasks,
    today: todayTasks,
    recent: recentTasks,
  });
});