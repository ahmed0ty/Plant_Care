import type { Types } from 'mongoose';
import { Plant } from '../models/Plant';
import { Task } from '../models/Task';
import {
  TASK_TYPES,
  addDays,
  intervalFor,
  nextDueAt,
  type CareIntervals,
  type TaskType,
} from '../utils/schedule';

interface PlantRef {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  care?: CareIntervals | null;
}

const isDuplicateKey = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === 11000;

/**
 * يخلّي المهام المعلّقة متطابقة مع ملف العناية:
 * فترة اتشالت -> تتمسح المهمة المعلّقة، وفترة اتضافت -> تتعمل مهمة جديدة.
 * مهمة موجودة بالفعل بتفضل زي ما هي (الفترة الجديدة بتطبّق من المهمة اللي بعدها).
 */
export async function syncPendingTasks(
  plant: PlantRef,
  now: Date = new Date(),
): Promise<void> {
  const pending = await Task.find({ plantId: plant._id, status: 'pending' }).select(
    'type',
  );
  const have = new Set<string>(pending.map((t) => t.type));

  const toRemove: TaskType[] = [];
  const toCreate: {
    userId: Types.ObjectId;
    plantId: Types.ObjectId;
    type: TaskType;
    dueAt: Date;
  }[] = [];

  for (const type of TASK_TYPES) {
    const days = intervalFor(plant.care, type);
    if (days === null && have.has(type)) toRemove.push(type);
    if (days !== null && !have.has(type)) {
      toCreate.push({
        userId: plant.userId,
        plantId: plant._id,
        type,
        dueAt: addDays(now, days),
      });
    }
  }

  if (toRemove.length > 0) {
    await Task.deleteMany({
      plantId: plant._id,
      status: 'pending',
      type: { $in: toRemove },
    });
  }
  if (toCreate.length > 0) {
    try {
      await Task.insertMany(toCreate, { ordered: false });
    } catch (e) {
      // طلب متزامن سبقنا وعمل نفس المهمة، مش مشكلة
      if (!isDuplicateKey(e)) throw e;
    }
  }
}

/**
 * يعلّم المهمة تمت ويعمل المهمة اللي بعدها.
 * التحديث ذري (status: pending في الفلتر)، فلو اتبعت طلبين، واحد بس بيكسب.
 */
export async function completeTask(
  userId: string,
  taskId: string,
  now: Date = new Date(),
) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId, status: 'pending' },
    { $set: { status: 'completed', completedAt: now } },
    { new: true },
  );
  if (!task) return null;

  const plant = await Plant.findOne({ _id: task.plantId, userId }).select('care');
  let next = null;
  if (plant) {
    const due = nextDueAt(now, plant.care, task.type);
    if (due) {
      next = await Task.create({
        userId: task.userId,
        plantId: task.plantId,
        type: task.type,
        dueAt: due,
      });
    }
  }
  return { completed: task, next };
}

interface TaskLike {
  id: string;
  type: string;
  status: string;
  dueAt: Date;
  completedAt?: Date | null;
  plantId: Types.ObjectId;
}

/** يحوّل المهام لشكل الرد ويضيف اسم وصورة النبات (طلب واحد مش طلب لكل مهمة) */
export async function toTaskDtos(userId: string, tasks: TaskLike[]) {
  const ids = [...new Set(tasks.map((t) => String(t.plantId)))];
  const plants =
    ids.length > 0
      ? await Plant.find({ _id: { $in: ids }, userId }).select('nickname imageUrl')
      : [];
  const byId = new Map(plants.map((p) => [p.id, p]));

  return tasks.map((t) => {
    const p = byId.get(String(t.plantId));
    return {
      id: t.id,
      type: t.type,
      status: t.status,
      dueAt: t.dueAt,
      completedAt: t.completedAt ?? null,
      plant: p
        ? { id: p.id, nickname: p.nickname, imageUrl: p.imageUrl ?? null }
        : null,
    };
  });
}

export async function snoozeTask(
  userId: string,
  taskId: string,
  days: number,
  now: Date = new Date(),
) {
  return Task.findOneAndUpdate(
    { _id: taskId, userId, status: 'pending' },
    { $set: { dueAt: addDays(now, days) }, $unset: { notifiedAt: 1 } },
    { new: true },
  );
}