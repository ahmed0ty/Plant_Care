import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const taskSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    plantId: { type: Types.ObjectId, ref: 'Plant', required: true },
    type: { type: String, enum: ['water', 'fertilize', 'prune'], required: true },
    dueAt: { type: Date, required: true }, // UTC
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    completedAt: { type: Date },
    notifiedAt: { type: Date },
  },
  { timestamps: true },
);

// للوحة التحكم والـ Cron
// للوحة التحكم والـ Cron
taskSchema.index({ userId: 1, status: 1, dueAt: 1 });
taskSchema.index({ status: 1, dueAt: 1, notifiedAt: 1 });
taskSchema.index({ plantId: 1 });
// آخر نشاط
taskSchema.index({ userId: 1, status: 1, completedAt: -1 });
// مهمة معلّقة واحدة بس لكل (نبات + نوع)
taskSchema.index(
  { plantId: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export type TaskDoc = InferSchemaType<typeof taskSchema>;
export const Task = model('Task', taskSchema);