import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  CLIENT_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  ANTHROPIC_API_KEY: z.string().optional(),
ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
    // اختياري: لو مش متحدد، endpoints رفع الصور بترجّع 503
  CLOUDINARY_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(
        /^cloudinary:\/\/[^:\s]+:[^@\s]+@[^/\s]+$/,
        'صيغة CLOUDINARY_URL غير صحيحة',
      )
      .optional(),
  ),
AI_PROVIDER: z.enum(['mock', 'claude', 'gemini']).default('mock'),
GEMINI_API_KEY: z.string().optional(),
GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error('Invalid environment variables:\n' + problems);
  process.exit(1);
}

export const env = parsed.data;