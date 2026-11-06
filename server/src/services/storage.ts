import { cloudinary, storageConfig } from '../config/cloudinary';
import { AppError } from '../middleware/error';

/** يرفع الصورة (بعد المعالجة) على Cloudinary في فولدر خاص بالمستخدم ويرجّع رابط https */
export async function uploadImage(buffer: Buffer, userId: string): Promise<string> {
  if (!storageConfig) {
    throw new AppError(503, 'تخزين الصور غير مُعدّ', 'STORAGE_NOT_CONFIGURED');
  }
  try {
    return await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `plantcare/${userId}`, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Cloudinary upload failed'));
          } else {
            resolve(result.secure_url);
          }
        },
      );
      stream.end(buffer);
    });
  } catch (e) {
    console.error('Image upload failed:', e);
    throw new AppError(502, 'فشل رفع الصورة، حاول تاني', 'UPLOAD_FAILED');
  }
}