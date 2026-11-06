import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env';

const interval = z.number().int().min(1).max(365);

export const identificationSchema = z.object({
  suggestions: z
    .array(
      z.object({
        species: z.string().trim().min(1).max(120),
        commonNames: z.array(z.string().trim().min(1).max(80)).max(5),
        confidence: z.number().min(0).max(1),
        care: z.object({
          wateringEveryDays: interval,
          fertilizingEveryDays: interval.nullable(),
          pruningEveryDays: interval.nullable(),
          light: z.string().trim().max(200),
          notes: z.string().trim().max(1000),
        }),
      }),
    )
    .min(1)
    .max(3),
  needsBetterPhoto: z.boolean(),
});

export type Identification = z.infer<typeof identificationSchema>;

/** أي مزوّد (حقيقي أو وهمي) لازم يطبّق الواجهة دي، والناتج بيتحقق منه بـ Zod */
export interface PlantIdentifier {
  name: string;
  identify(image: Buffer): Promise<unknown>;
}

// ---------- المزوّد الوهمي (للتطوير فقط) ----------

const CATALOG = [
  {
    species: 'Monstera deliciosa',
    commonNames: ['مونستيرا', 'Swiss cheese plant'],
    care: { wateringEveryDays: 7, fertilizingEveryDays: 30, pruningEveryDays: 90, light: 'ضوء غير مباشر ساطع', notes: 'اسمح للتربة العلوية بالجفاف بين الريّات.' },
  },
  {
    species: 'Epipremnum aureum',
    commonNames: ['بوتس', 'Pothos'],
    care: { wateringEveryDays: 7, fertilizingEveryDays: 30, pruningEveryDays: 60, light: 'ضوء متوسط إلى ساطع غير مباشر', notes: 'نبات سهل ويتحمل الإهمال.' },
  },
  {
    species: 'Dracaena trifasciata',
    commonNames: ['لسان الحماة', 'Snake plant'],
    care: { wateringEveryDays: 14, fertilizingEveryDays: 60, pruningEveryDays: null, light: 'يتحمل الإضاءة المنخفضة', notes: 'الري الزائد هو العدو الأول له.' },
  },
  {
    species: 'Aloe vera',
    commonNames: ['صبار الألوة', 'Aloe'],
    care: { wateringEveryDays: 14, fertilizingEveryDays: 90, pruningEveryDays: null, light: 'شمس مباشرة أو ضوء ساطع', notes: 'تربة جيدة الصرف وأصيص بفتحات.' },
  },
  {
    species: 'Spathiphyllum wallisii',
    commonNames: ['زنبق السلام', 'Peace lily'],
    care: { wateringEveryDays: 5, fertilizingEveryDays: 45, pruningEveryDays: null, light: 'ظل جزئي', notes: 'تتدلى أوراقه عند العطش، وتعود بعد الري.' },
  },
  {
    species: 'Ficus elastica',
    commonNames: ['فيكس مطاطي', 'Rubber plant'],
    care: { wateringEveryDays: 10, fertilizingEveryDays: 30, pruningEveryDays: 120, light: 'ضوء ساطع غير مباشر', notes: 'امسح أوراقه من الغبار بقطعة قماش رطبة.' },
  },
  {
    species: 'Zamioculcas zamiifolia',
    commonNames: ['زاميوكلاس', 'ZZ plant'],
    care: { wateringEveryDays: 14, fertilizingEveryDays: 60, pruningEveryDays: null, light: 'إضاءة منخفضة إلى متوسطة', notes: 'يخزّن الماء في جذوره فلا تكثر الري.' },
  },
  {
    species: 'Chlorophytum comosum',
    commonNames: ['نبات العنكبوت', 'Spider plant'],
    care: { wateringEveryDays: 7, fertilizingEveryDays: 30, pruningEveryDays: 90, light: 'ضوء غير مباشر', notes: 'يطلّع فسائل صغيرة يمكن فصلها وزراعتها.' },
  },
  {
    species: 'Ocimum basilicum',
    commonNames: ['ريحان', 'Basil'],
    care: { wateringEveryDays: 2, fertilizingEveryDays: 21, pruningEveryDays: 14, light: 'شمس مباشرة 6 ساعات', notes: 'اقطف القمم باستمرار لتشجيع التفريع.' },
  },
  {
    species: 'Crassula ovata',
    commonNames: ['شجرة اليشم', 'Jade plant'],
    care: { wateringEveryDays: 14, fertilizingEveryDays: 90, pruningEveryDays: 180, light: 'شمس مباشرة أو ضوء ساطع', notes: 'تربة صحراوية جيدة الصرف.' },
  },
] as const;

export const mockIdentifier: PlantIdentifier = {
  name: 'mock',
  async identify(image) {
    // نتيجة ثابتة لنفس الصورة، علشان نقدر نختبر الواجهة بشكل متوقّع
    const hash = crypto.createHash('sha256').update(image).digest();
    const idx = hash.readUInt32BE(0) % CATALOG.length;
    const top = 0.3 + ((hash[4] ?? 0) / 255) * 0.65;

    const picks = [idx, (idx + 3) % CATALOG.length, (idx + 7) % CATALOG.length];
    const factors = [1, 0.4, 0.2];
    const suggestions = picks.map((i, n) => {
      const item = CATALOG[i]!;
      return {
        species: item.species,
        commonNames: [...item.commonNames],
        confidence: Number((top * (factors[n] ?? 0.1)).toFixed(2)),
        care: { ...item.care },
      };
    });
    return { suggestions, needsBetterPhoto: top < 0.5 };
  },
};

function detectMediaType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }
  return 'image/jpeg';
}

const PROMPT = `You are a plant identification expert helping Arabic-speaking home gardeners. Identify the plant in this photo.
Reply with ONLY a JSON object, no markdown, in this exact shape:
{
  "suggestions": [
    {
      "species": "scientific name",
      "commonNames": ["Arabic common name", "English common name"],
      "confidence": 0.0-1.0,
      "care": {
        "wateringEveryDays": integer 1-365,
        "fertilizingEveryDays": integer 1-365 or null,
        "pruningEveryDays": integer 1-365 or null,
        "light": "short Arabic description",
        "notes": "short Arabic care tip"
      }
    }
  ],
  "needsBetterPhoto": boolean
}
Rules:
- Give 3 suggestions when other similar-looking species are plausible. Give fewer only if you are very sure. Order by confidence, highest first, and keep the confidences honest (do not give several high values).
- "commonNames": the most common Arabic name first, then the English name.
- "care" must be specific to that species, not generic. Assume an indoor or balcony plant in a hot, dry climate unless the photo clearly shows otherwise.
- For aquatic or floating plants (like water lilies), "wateringEveryDays" means how often to top up or change the water, and "notes" must say that the plant lives in water.
- "light" is Arabic and under 10 words. "notes" is Arabic, 1 to 2 short practical sentences (a key tip or a common mistake to avoid).
- If the photo is unclear, not a plant, or you are unsure, use low confidence and set needsBetterPhoto to true. Always return at least one suggestion.`;

export const claudeIdentifier: PlantIdentifier = {
  name: 'claude',
  async identify(image) {
    if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: detectMediaType(image),
                  data: image.toString('base64'),
                },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);

    const body = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = body.content.find((b) => b.type === 'text')?.text ?? '';
    const json = text.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  },
};
const GEMINI_FALLBACKS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

async function callGemini(model: string, image: Buffer): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: detectMediaType(image),
                  data: image.toString('base64'),
                },
              },
              { text: PROMPT },
            ],
          },
        ],
       generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    },
  );

  if (!res.ok) {
    const err = new Error(`Gemini API ${res.status} (${model}): ${await res.text()}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

export const geminiIdentifier: PlantIdentifier = {
  name: 'gemini',
  async identify(image) {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

    const models = [env.GEMINI_MODEL, ...GEMINI_FALLBACKS.filter((m) => m !== env.GEMINI_MODEL)];
    let lastError: unknown;

    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await callGemini(model, image);
        } catch (e) {
          lastError = e;
          const status = (e as { status?: number }).status;
          // أخطاء مؤقتة فقط نعيد عليها، غير كده ننتقل للموديل التالي
          if (status !== 503 && status !== 429 && status !== 500) break;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  },
};

const providers: Record<string, PlantIdentifier> = {
  mock: mockIdentifier,
  claude: claudeIdentifier,
  gemini: geminiIdentifier,
};

/**
 * الدالة الوحيدة اللي باقي الكود بينادي عليها. تبديل المزوّد (Claude/OpenAI/Plant.id)
 * بيتم بإضافة مزوّد جديد هنا من غير ما نغيّر أي حاجة تانية.
 * الرد بيتعامل معاه كـ data: بيتحقق منه بـ Zod وماينفّذش منه أي حاجة تلقائياً.
 */
export async function identifyPlant(
  image: Buffer,
  provider: PlantIdentifier = providers[env.AI_PROVIDER] ?? mockIdentifier,
): Promise<{ identification: Identification; provider: string }> {
  const raw = await provider.identify(image);
  const identification = identificationSchema.parse(raw);
  return { identification, provider: provider.name };
}