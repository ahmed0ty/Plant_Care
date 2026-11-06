import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { storageConfig } from '../config/cloudinary';
import { Plant } from '../models/Plant';
import { Task } from '../models/Task';
import { AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { objectId } from '../utils/ids';
import { uploadSingleImage } from '../middleware/upload';
import { identifyPlant } from '../services/ai/identify';
import { processImage } from '../services/images';
import { uploadImage } from '../services/storage';
import { syncPendingTasks, toTaskDtos } from '../services/tasks';
import { GrowthLog } from '../models/GrowthLog';
import { analyzeHealth, fetchStoredImage } from '../services/ai/health';
import { Types } from 'mongoose';
import { TASK_TYPES } from '../utils/schedule';
import { chatAboutPlant } from '../services/ai/chat';
import { chatSchema } from '../schemas/chat';
export const plantsRouter = Router();
plantsRouter.use(requireAuth);

const intervalDays = z.number().int().min(1).max(365);
// الصور المقبولة هي صور Cloudinary بتاعتنا بس (مش أي رابط خارجي)
const imageUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine(
    (u) => storageConfig !== null && u.startsWith(storageConfig.urlPrefix),
    'رابط الصورة غير مقبول',
  );

const createSchema = z.object({
  nickname: z.string().trim().min(1).max(80),
  species: z.string().trim().max(120).optional(),
  imageUrl: imageUrlSchema.optional(),
  care: z
    .object({
      wateringEveryDays: intervalDays.optional(),
      fertilizingEveryDays: intervalDays.optional(),
      pruningEveryDays: intervalDays.optional(),
      light: z.string().trim().max(200).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .default({}),
});

// null = امسح القيمة
const updateSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  species: z.string().trim().max(120).nullable().optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  care: z
    .object({
      wateringEveryDays: intervalDays.nullable().optional(),
      fertilizingEveryDays: intervalDays.nullable().optional(),
      pruningEveryDays: intervalDays.nullable().optional(),
      light: z.string().trim().max(200).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .optional(),
});

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: objectId.optional(),
});

type PlantForDto = NonNullable<Awaited<ReturnType<typeof Plant.findOne>>>;

interface PlantStats {
  pendingTasks: number;
  nextDueAt: Date | null;
  nextType: string | null;
}

function toDto(p: PlantForDto, stats?: PlantStats) {
  const c = p.care;
  return {
    id: p.id as string,
    nickname: p.nickname,
    species: p.species ?? null,
    imageUrl: p.imageUrl ?? null,
    addedAt: p.addedAt,
    pendingTasks: stats?.pendingTasks ?? 0,
    nextDueAt: stats?.nextDueAt ?? null,
    taskSummary: {
      pending: stats?.pendingTasks ?? 0,
      nextDueAt: stats?.nextDueAt ?? null,
      nextType: stats?.nextType ?? null,
    },
    care: {
      wateringEveryDays: c?.wateringEveryDays ?? null,
      fertilizingEveryDays: c?.fertilizingEveryDays ?? null,
      pruningEveryDays: c?.pruningEveryDays ?? null,
      light: c?.light ?? null,
      notes: c?.notes ?? null,
    },
  };
}

/** عدد المهام المعلّقة وأقرب موعد ونوعه لكل نبات، في استعلام واحد لكل الصفحة */
async function pendingStats(userId: string, plantIds: Types.ObjectId[]) {
  const stats = new Map<string, PlantStats>();
  if (plantIds.length === 0) return stats;

  // aggregate مابيعملش cast للـ string، لازم ObjectId صريح
  const rows = await Task.aggregate<{
    _id: Types.ObjectId;
    pendingTasks: number;
    nextDueAt: Date;
    nextType: string;
  }>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        plantId: { $in: plantIds },
        status: 'pending',
      },
    },
    { $sort: { dueAt: 1 } },
    {
      $group: {
        _id: '$plantId',
        pendingTasks: { $sum: 1 },
        nextDueAt: { $first: '$dueAt' },
        nextType: { $first: '$type' },
      },
    },
  ]);
  for (const r of rows) {
    stats.set(String(r._id), {
      pendingTasks: r.pendingTasks,
      nextDueAt: r.nextDueAt,
      nextType: r.nextType,
    });
  }
  return stats;
}

// الـ AI بيكلّف فلوس، فالحد هنا أضيق من باقي الـ API وبيتحسب لكل مستخدم
const identifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: {
    error: { code: 'RATE_LIMIT', message: 'وصلت للحد الأقصى للتعرّف على النباتات، حاول بعد ساعة' },
  },
});

/**
 * رفع صورة + تعرّف على النبات. النتيجة اقتراحات بس: المستخدم يراجعها ويعدّلها
 * ثم يحفظ النبات بـ POST /api/plants، ومفيش حاجة بتتحفظ تلقائياً.
 */

plantsRouter.post('/identify', identifyLimiter, uploadSingleImage, async (req, res) => {
  const userId = req.userId!;
  if (!req.file) throw new AppError(400, 'لم يتم رفع صورة', 'NO_FILE');

  const processed = await processImage(req.file.buffer);
  const [upload, ident] = await Promise.allSettled([
    uploadImage(processed, userId),
    identifyPlant(processed),
  ]);

  if (upload.status === 'rejected') throw upload.reason;
  if (ident.status === 'rejected') console.error('Identification failed:', ident.reason);

  res.json({
    imageUrl: upload.value,
    identification: ident.status === 'fulfilled' ? ident.value.identification : null,
    provider: ident.status === 'fulfilled' ? ident.value.provider : null,
  });
});

const MAX_PLANTS = 200;
const MAX_GROWTH_PER_PLANT = 100;

plantsRouter.post('/', async (req, res) => {
  const userId = req.userId!;
  if ((await Plant.countDocuments({ userId })) >= MAX_PLANTS) {
    throw new AppError(409, `وصلت للحد الأقصى من النباتات (${MAX_PLANTS})`, 'PLANT_LIMIT');
  }
  const data = createSchema.parse(req.body);

  const plant = await Plant.create({ ...data, userId });
  try {
    await syncPendingTasks(plant);
  } catch (e) {
    await Plant.deleteOne({ _id: plant._id });
    throw e;
  }
  res.status(201).json({ plant: toDto(plant) });
});

plantsRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const { limit, cursor } = listQuery.parse(req.query);

  const rows = await Plant.find({
    userId,
    ...(cursor && { _id: { $lt: cursor } }),
  })
    .sort({ _id: -1 })
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const stats = await pendingStats(
    userId,
    page.map((p) => p._id),
  );

  res.json({
    plants: page.map((p) => toDto(p, stats.get(p.id))),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
  });
});

plantsRouter.get('/:id', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);

  const plant = await Plant.findOne({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  const pending = await Task.find({
    plantId: plant._id,
    userId,
    status: 'pending',
  }).sort({ dueAt: 1 });

  res.json({
    plant: toDto(plant, {
      pendingTasks: pending.length,
      nextDueAt: pending[0]?.dueAt ?? null,
      nextType: pending[0]?.type ?? null,
    }),
    tasks: await toTaskDtos(userId, pending),
  });
});

plantsRouter.patch('/:id', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  const patch = updateSchema.parse(req.body);

  const plant = await Plant.findOne({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  if (patch.nickname !== undefined) plant.nickname = patch.nickname;
  if (patch.species !== undefined) plant.set('species', patch.species ?? undefined);
  if (patch.imageUrl !== undefined) plant.set('imageUrl', patch.imageUrl ?? undefined);

  const c = patch.care;
  if (c) {
    for (const key of [
      'wateringEveryDays',
      'fertilizingEveryDays',
      'pruningEveryDays',
      'light',
      'notes',
    ] as const) {
      if (c[key] !== undefined) plant.set(`care.${key}`, c[key] ?? undefined);
    }
  }

  await plant.save();
  await syncPendingTasks(plant);
  res.json({ plant: toDto(plant) });
});

plantsRouter.delete('/:id', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);

  const plant = await Plant.findOneAndDelete({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  await Task.deleteMany({ plantId: plant._id, userId });
  await GrowthLog.deleteMany({ plantId: plant._id, userId });
  res.status(204).end();
});

// ---------- سجل النمو ----------
const growthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'وصلت للحد الأقصى لإضافة الصور، حاول بعد ساعة' } },
});

type GrowthForDto = NonNullable<Awaited<ReturnType<typeof GrowthLog.findOne>>>;

function toGrowthDto(g: GrowthForDto) {
  return {
    id: g.id as string,
    imageUrl: g.imageUrl,
    takenAt: g.takenAt,
    healthNote: g.healthNote ?? null,
    healthStatus: g.healthStatus ?? null,
  };
}

plantsRouter.get('/:id/growth', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);

  const plant = await Plant.exists({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  const logs = await GrowthLog.find({ plantId: id, userId }).sort({ takenAt: -1 }).limit(50);
  res.json({ logs: logs.map(toGrowthDto) });
});

// ---------- سجل العناية ----------
plantsRouter.get('/:id/care-log', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);

  const plant = await Plant.exists({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  const [entries, grouped] = await Promise.all([
    Task.find({ plantId: id, userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(30)
      .select('type completedAt'),
    Task.aggregate<{ _id: string; lastAt: Date; count: number }>([
      {
        $match: {
          plantId: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
          status: 'completed',
        },
      },
      { $group: { _id: '$type', lastAt: { $max: '$completedAt' }, count: { $sum: 1 } } },
    ]),
  ]);

  const byType = new Map(grouped.map((g) => [g._id, g]));
  const summary = Object.fromEntries(
    TASK_TYPES.map((t) => [
      t,
      { lastAt: byType.get(t)?.lastAt ?? null, count: byType.get(t)?.count ?? 0 },
    ]),
  );

  res.json({
    summary, // { water: { lastAt, count }, fertilize: {...}, prune: {...} }
    entries: entries.map((t) => ({ id: t.id, type: t.type, completedAt: t.completedAt })),
  });
});

plantsRouter.post('/:id/growth', growthLimiter, uploadSingleImage, async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  if (!req.file) throw new AppError(400, 'لم يتم رفع صورة', 'NO_FILE');

  const plant = await Plant.findOne({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  if ((await GrowthLog.countDocuments({ plantId: id, userId })) >= MAX_GROWTH_PER_PLANT) {
    throw new AppError(409, `وصلت للحد الأقصى من الصور لهذه النبتة (${MAX_GROWTH_PER_PLANT})`, 'GROWTH_LIMIT');
  }

  const processed = await processImage(req.file.buffer);
  const previousLog = await GrowthLog.findOne({ plantId: id, userId }).sort({ takenAt: -1 });

  const [upload, health] = await Promise.allSettled([
    uploadImage(processed, userId),
    (async () => {
      const prevImage = previousLog
        ? await fetchStoredImage(previousLog.imageUrl).catch(() => null)
        : null;
      return analyzeHealth({
        image: processed,
        previous:
          previousLog && prevImage
            ? { image: prevImage, takenAt: previousLog.takenAt }
            : undefined,
        species: plant.species ?? undefined,
        wateringEveryDays: plant.care?.wateringEveryDays ?? undefined,
      });
    })(),
  ]);

  if (upload.status === 'rejected') throw upload.reason;
  if (health.status === 'rejected') console.error('Health check failed:', health.reason);

  const log = await GrowthLog.create({
    userId,
    plantId: id,
    imageUrl: upload.value,
    ...(health.status === 'fulfilled' && {
      healthNote: health.value.note,
      healthStatus: health.value.status,
    }),
  });

  res.status(201).json({ log: toGrowthDto(log) });
});

plantsRouter.delete('/:id/growth/:logId', async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  const logId = objectId.parse(req.params.logId);

  const log = await GrowthLog.findOneAndDelete({ _id: logId, plantId: id, userId });
  if (!log) throw new AppError(404, 'الصورة غير موجودة', 'GROWTH_NOT_FOUND');
  res.status(204).end();
});

// ---------- اسأل عن نباتك ----------
const chatBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'رسائل كتير بسرعة، استنى دقيقة وجرّب تاني' } },
});

const chatDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? 'anonymous',
  message: { error: { code: 'RATE_LIMIT', message: 'وصلت للحد اليومي للأسئلة (30)، جرّب بكرة' } },
});

plantsRouter.post('/:id/chat', chatBurstLimiter, chatDailyLimiter, async (req, res) => {
  const userId = req.userId!;
  const id = objectId.parse(req.params.id);
  const { messages } = chatSchema.parse(req.body);

  const plant = await Plant.findOne({ _id: id, userId });
  if (!plant) throw new AppError(404, 'النبات غير موجود', 'PLANT_NOT_FOUND');

  const [health, pending, done] = await Promise.all([
    GrowthLog.findOne({ plantId: id, userId, healthNote: { $exists: true, $ne: null } })
      .sort({ takenAt: -1 })
      .select('healthNote takenAt'),
    Task.find({ plantId: id, userId, status: 'pending' }).sort({ dueAt: 1 }).limit(5).select('type dueAt'),
    Task.find({ plantId: id, userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .select('type completedAt'),
  ]);

  const dto = toDto(plant);
  try {
    const reply = await chatAboutPlant(
      {
        nickname: dto.nickname,
        species: dto.species,
        addedAt: dto.addedAt,
        care: dto.care,
        latestHealth: health?.healthNote ? { note: health.healthNote, takenAt: health.takenAt } : null,
        nextTasks: pending.map((t) => ({ type: t.type, dueAt: t.dueAt })),
        recentDone: done.flatMap((t) => (t.completedAt ? [{ type: t.type, completedAt: t.completedAt }] : [])),
      },
      messages.slice(-10),
    );
    res.json({ reply });
  } catch (e) {
    console.error('Plant chat failed:', e);
    throw new AppError(502, 'تعذّر الرد الآن، حاول بعد قليل', 'CHAT_FAILED');
  }
});