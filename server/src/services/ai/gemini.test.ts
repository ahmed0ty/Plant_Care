import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
  GEMINI_API_KEY: 'test-key' as string | undefined,
  GEMINI_MODEL: 'primary-model',
}));
vi.mock('../../config/env', () => ({ env: mockEnv }));

import { generateChat } from './gemini';

const okBody = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const errBody = (status: number) =>
  new Response(JSON.stringify({ error: { message: 'x' } }), { status });

const fetchMock = vi.fn<typeof fetch>();
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));
const ask = () => generateChat('SYSTEM', [{ role: 'user', text: 'سؤال' }]);

beforeEach(() => {
  vi.useFakeTimers();
  mockEnv.GEMINI_API_KEY = 'test-key';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('generateChat', () => {
  it('بيرجّع نص الرد وبيبعت التعليمات والرسائل والمفتاح صح', async () => {
    fetchMock.mockResolvedValueOnce(okBody('أهلاً'));
    const p = ask();
    await vi.runAllTimersAsync();
    expect(await p).toBe('أهلاً');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/models/primary-model:generateContent');
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(String(init?.body));
    expect(body.systemInstruction.parts[0].text).toBe('SYSTEM');
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'سؤال' }] }]);
  });

  it('بيجمّع النص لو الرد جه على كذا جزء', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'أ' }, { text: 'ب' }] } }] }),
        { status: 200 },
      ),
    );
    const p = ask();
    await vi.runAllTimersAsync();
    expect(await p).toBe('أب');
  });

  it('بيعيد المحاولة على نفس الموديل لما يجي 503 مؤقت', async () => {
    fetchMock.mockResolvedValueOnce(errBody(503)).mockResolvedValueOnce(okBody('تمام'));
    const p = ask();
    await vi.runAllTimersAsync();
    expect(await p).toBe('تمام');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urls().every((u) => u.includes('primary-model'))).toBe(true);
  });

  it('بيعيد المحاولة على 429 كمان', async () => {
    fetchMock.mockResolvedValueOnce(errBody(429)).mockResolvedValueOnce(okBody('تمام'));
    const p = ask();
    await vi.runAllTimersAsync();
    expect(await p).toBe('تمام');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('بينتقل لموديل احتياطي لما الأساسي يفضل مشغول', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).includes('primary-model') ? errBody(503) : okBody('من الاحتياطي'),
    );
    const p = ask();
    await vi.runAllTimersAsync();
    expect(await p).toBe('من الاحتياطي');
    expect(fetchMock).toHaveBeenCalledTimes(3); // محاولتين على الأساسي + واحدة ناجحة
    expect(urls().at(-1)).not.toContain('primary-model');
  });

  it('لو كل الموديلات مشغولة بيرمي الخطأ بعد ما يجرّب الكل', async () => {
    fetchMock.mockImplementation(async () => errBody(503));
    const assertion = expect(ask()).rejects.toThrow(/503/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(6); // 3 موديلات × محاولتين
  });

  it('الأخطاء غير المؤقتة (زي 400) ما بتتعادش على نفس الموديل', async () => {
    fetchMock.mockImplementation(async () => errBody(400));
    const assertion = expect(ask()).rejects.toThrow(/400/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3); // محاولة واحدة لكل موديل
  });

  it('رد فاضي بيتعامل كخطأ', async () => {
    fetchMock.mockImplementation(async () => okBody('   '));
    const assertion = expect(ask()).rejects.toThrow(/empty reply/);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('من غير مفتاح API بيفشل من غير ما يكلّم الشبكة', async () => {
    mockEnv.GEMINI_API_KEY = undefined;
    await expect(ask()).rejects.toThrow('GEMINI_API_KEY is not set');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});