import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { GrowthLog } from '../models/GrowthLog';
import { Plant } from '../models/Plant';

export const galleryRouter = Router();
galleryRouter.use(requireAuth);

galleryRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const logs = await GrowthLog.find({ userId }).sort({ takenAt: -1 }).limit(60);

  const ids = [...new Set(logs.map((l) => String(l.plantId)))];
  const plants = ids.length
    ? await Plant.find({ _id: { $in: ids }, userId }).select('nickname')
    : [];
  const names = new Map(plants.map((p) => [p.id, p.nickname]));

  res.json({
    photos: logs.map((l) => {
      const plantId = String(l.plantId);
      const nickname = names.get(plantId);
      return {
        id: l.id as string,
        imageUrl: l.imageUrl,
        takenAt: l.takenAt,
        healthNote: l.healthNote ?? null,
        healthStatus: l.healthStatus ?? null,
        plant: nickname ? { id: plantId, nickname } : null,
      };
    }),
  });
});