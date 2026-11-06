import { Schema, model, Types } from 'mongoose';

const growthLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    plantId: { type: Types.ObjectId, ref: 'Plant', required: true },
    imageUrl: { type: String, required: true },
    takenAt: { type: Date, default: () => new Date() },
    healthNote: { type: String, maxlength: 1000 }, // هنستخدمه في خطوة الفحص
    healthStatus: { type: String, enum: ['healthy', 'needs_attention', 'unclear'] },
  },
  { timestamps: true },
);

growthLogSchema.index({ plantId: 1, takenAt: -1 });

export const GrowthLog = model('GrowthLog', growthLogSchema);