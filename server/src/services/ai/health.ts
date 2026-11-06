import { z } from 'zod';
import { storageConfig } from '../../config/cloudinary';
import { generateJson, imagePart, type GeminiPart } from './gemini';

export const healthSchema = z.object({
  status: z.enum(['healthy', 'needs_attention', 'unclear']),
  note: z.string().trim().min(1).max(600),
});

export type HealthResult = z.infer<typeof healthSchema>;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** يحمّل صورة محفوظة عندنا على Cloudinary فقط (مش أي رابط) */
export async function fetchStoredImage(url: string): Promise<Buffer> {
  if (!storageConfig || !url.startsWith(storageConfig.urlPrefix)) {
    throw new Error('Refusing to fetch a non-storage image URL');
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) throw new Error('Stored image too large');
  return buf;
}

interface HealthInput {
  image: Buffer;
  previous?: { image: Buffer; takenAt: Date };
  species?: string;
  wateringEveryDays?: number;
}

export async function analyzeHealth(input: HealthInput): Promise<HealthResult> {
  const species = input.species?.replace(/["\r\n]/g, ' ').slice(0, 120) || 'unknown';
  const watering = input.wateringEveryDays ? `every ${input.wateringEveryDays} days` : 'unknown';

  const intro = input.previous
    ? `Image 1 was taken on ${input.previous.takenAt.toISOString().slice(0, 10)}. Image 2 is the new photo taken today. Compare them and describe visible changes in the plant's condition.`
    : 'Image 1 is the first growth photo of this plant. Assess its visible condition.';

  const prompt = `You are helping a home gardener track a plant's health from photos.
Plant species: "${species}". Watering schedule: ${watering}.
${intro}

Reply with ONLY a JSON object, no markdown, in this exact shape:
{"status": "healthy" | "needs_attention" | "unclear", "note": "..."}

Rules for "note":
- Write in Arabic, 1 to 3 short sentences.
- Mention visible things only (leaf color, drooping, spots, new growth).
- If something looks wrong, give a likely cause as a possibility (use "غالباً" or "قد يكون") and one practical tip.
- Never state a definitive diagnosis.
- If the photo is not a plant or is too unclear, use status "unclear" and ask for a clearer photo.`;

  const parts: GeminiPart[] = [{ text: prompt }];
  if (input.previous) parts.push(imagePart(input.previous.image));
  parts.push(imagePart(input.image));

  return healthSchema.parse(await generateJson(parts));
}