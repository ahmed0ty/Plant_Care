import { env } from '../../config/env';

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

const FALLBACKS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

function detectMediaType(buf: Buffer): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }
  return 'image/jpeg';
}

export function imagePart(buf: Buffer): GeminiPart {
  return { inline_data: { mime_type: detectMediaType(buf), data: buf.toString('base64') } };
}

async function call(model: string, parts: GeminiPart[]): Promise<unknown> {
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
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
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

export async function generateJson(parts: GeminiPart[]): Promise<unknown> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

  const models = [env.GEMINI_MODEL, ...FALLBACKS.filter((m) => m !== env.GEMINI_MODEL)];
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await call(model, parts);
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status;
        if (status !== 503 && status !== 429 && status !== 500) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
async function callChat(
  model: string,
  system: string,
  history: { role: 'user' | 'model'; text: string }[],
): Promise<string> {
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
        systemInstruction: { parts: [{ text: system }] },
        contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
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
  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error(`Gemini returned an empty reply (${model})`);
  return text;
}

/** محادثة نصية: نفس منطق إعادة المحاولة والموديلات الاحتياطية */
export async function generateChat(
  system: string,
  history: { role: 'user' | 'model'; text: string }[],
): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

  const models = [env.GEMINI_MODEL, ...FALLBACKS.filter((m) => m !== env.GEMINI_MODEL)];
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callChat(model, system, history);
      } catch (e) {
        lastError = e;
        const status = (e as { status?: number }).status;
        if (status !== 503 && status !== 429 && status !== 500) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}