import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const careProfileSchema = new Schema(
  {
    wateringEveryDays: { type: Number, min: 1, max: 365 },
    fertilizingEveryDays: { type: Number, min: 1, max: 365 },
    pruningEveryDays: { type: Number, min: 1, max: 365 },
    light: { type: String, maxlength: 200 },
    notes: { type: String, maxlength: 1000 },
  },
  { _id: false },
);

const plantSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    nickname: { type: String, required: true, trim: true, maxlength: 80 },
    species: { type: String, trim: true, maxlength: 120 },
    imageUrl: { type: String },
    addedAt: { type: Date, default: () => new Date() },
    care: { type: careProfileSchema, default: {} },
  },
  { timestamps: true },
);

plantSchema.index({ userId: 1, createdAt: -1 });

export type PlantDoc = InferSchemaType<typeof plantSchema>;
export const Plant = model('Plant', plantSchema);