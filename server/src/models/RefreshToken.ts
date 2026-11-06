import { Schema, model, Types } from 'mongoose';

const refreshTokenSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  // Mongo يمسح الدوكيومنت تلقائياً بعد انتهاء الصلاحية
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const RefreshToken = model('RefreshToken', refreshTokenSchema);