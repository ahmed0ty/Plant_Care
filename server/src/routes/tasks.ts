import { Router } from 'express';
import { z } from 'zod';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { objectId } from '../utils/ids';
import { localDayBounds } from '../utils/time';
import { completeTask, snoozeTask, toTaskDtos } from '../services/tasks';
export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const listQuery = z.object({
  scope: z.enum(['overdue', 'today', 'upcoming', 'all']).default('all'),
  plantId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

tasksRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const { scope, plantId, limit } = listQuery.parse(req.query);

  const user = await User.findById(userId).select('timezone');
  const { start, end } = localDayBounds(user?.timezone ?? 'UTC');

  const due =
    scope === 'overdue'
      ? { $lt: start }
      : scope === 'today'
        ? { $gte: start, $lt: end }
        : scope === 'upcoming'
          ? { $gte: end }
          : undefined;

  const tasks = await Task.find({
    userId,
    status: 'pending',
    ...(due && { dueAt: due }),
    ...(plantId && { plantId }),
  })
    .sort({ dueAt: 1 })
    .limit(limit);

  res.json({ tasks: await toTaskDtos(userId, tasks) });
});

tasksRouter.post('/:id/complete', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);

  const result = await completeTask(userId, id);
  if (!result) {
    throw new AppError(404, 'المهمة غير موجودة أو تمت بالفعل', 'TASK_NOT_FOUND');
  }

  const [completed, next] = await Promise.all([
    toTaskDtos(userId, [result.completed]),
    result.next ? toTaskDtos(userId, [result.next]) : Promise.resolve([]),
  ]);
  res.json({ task: completed[0], next: next[0] ?? null });
});

const snoozeBody = z.object({ days: z.number().int().min(1).max(7) });

tasksRouter.patch('/:id/snooze', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  const { days } = snoozeBody.parse(req.body);

  const task = await snoozeTask(userId, id, days);
  if (!task) {
    throw new AppError(404, 'المهمة غير موجودة أو تمت بالفعل', 'TASK_NOT_FOUND');
  }

  const [dto] = await toTaskDtos(userId, [task]);
  res.json({ task: dto });
});
const UNDO_WINDOW_MS = 10 * 60 * 1000;
const undoBody = z.object({ nextId: objectId.optional() });

tasksRouter.post('/:id/undo', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  const { nextId } = undoBody.parse(req.body ?? {});

  const task = await Task.findOne({ _id: id, userId, status: 'completed' });
  if (!task) throw new AppError(404, 'المهمة غير موجودة أو لم تُنجز', 'TASK_NOT_FOUND');
  if (!task.completedAt || Date.now() - task.completedAt.getTime() > UNDO_WINDOW_MS) {
    throw new AppError(409, 'انتهت مهلة التراجع', 'UNDO_EXPIRED');
  }

  // لو فيه مهمة معلّقة من نفس النوع لازم تكون هي اللي اتولّدت من الإنجاز ده، وإلا حاجة اتغيّرت
  const pending = await Task.findOne({
    plantId: task.plantId,
    userId,
    type: task.type,
    status: 'pending',
  }).select('_id');
  if (pending) {
    if (!nextId || String(pending._id) !== String(nextId)) {
      throw new AppError(409, 'تغيّرت المهمة بعد الإنجاز، ولا يمكن التراجع', 'UNDO_CONFLICT');
    }
    await Task.deleteOne({ _id: pending._id, userId, status: 'pending' });
  }

  const restored = await Task.findOneAndUpdate(
    { _id: id, userId, status: 'completed' },
    { $set: { status: 'pending' }, $unset: { completedAt: 1 } },
    { new: true },
  );
  if (!restored) throw new AppError(404, 'المهمة غير موجودة أو لم تُنجز', 'TASK_NOT_FOUND');

  const [dto] = await toTaskDtos(userId, [restored]);
  res.json({ task: dto });
});