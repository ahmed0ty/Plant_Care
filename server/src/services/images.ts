import sharp from 'sharp';
import { AppError } from '../middleware/error';

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** بيعرف نوع الصورة من أول بايتات الملف (magic bytes) مش من الامتداد ولا من الـ header */
export function detectImageType(buf: Buffer): ImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * يتحقق من الصورة ويعيد ضغطها: تصحيح الاتجاه من EXIF، أقصى 1600px،
 * WebP، ومن غير metadata (يعني GPS وبيانات الكاميرا بتتمسح).
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  if (!detectImageType(input)) {
    throw new AppError(
      415,
      'نوع الصورة غير مدعوم (JPEG أو PNG أو WebP فقط)',
      'UNSUPPORTED_IMAGE',
    );
  }
  try {
    return await sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new AppError(400, 'الصورة تالفة أو غير صالحة', 'INVALID_IMAGE');
  }
}