import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({ env: { AI_PROVIDER: 'mock' } }));

import { identificationSchema, identifyPlant, mockIdentifier, type PlantIdentifier } from './identify';

describe('identifyPlant', () => {
  it('المزوّد الوهمي بيرجّع نتيجة صالحة لأي صورة', async () => {
    for (let i = 0; i < 50; i++) {
      const { identification, provider } = await identifyPlant(Buffer.from(`image-${i}`));
      expect(provider).toBe('mock');
      expect(identification.suggestions.length).toBe(3);
      const confs = identification.suggestions.map((s) => s.confidence);
      expect(confs).toEqual([...confs].sort((a, b) => b - a));
      const names = new Set(identification.suggestions.map((s) => s.species));
      expect(names.size).toBe(3);
    }
  });

  it('نفس الصورة تدّي نفس النتيجة', async () => {
    const a = await identifyPlant(Buffer.from('same'));
    const b = await identifyPlant(Buffer.from('same'));
    expect(a).toEqual(b);
  });

  it('needsBetterPhoto مرتبط بنسبة الثقة', async () => {
    for (let i = 0; i < 50; i++) {
      const { identification } = await identifyPlant(Buffer.from(`x${i}`));
      expect(identification.needsBetterPhoto).toBe(identification.suggestions[0]!.confidence < 0.5);
    }
  });

  it('يرفض رد مزوّد غير مطابق للـ schema', async () => {
    const bad: PlantIdentifier = {
      name: 'bad',
      identify: async () => ({ suggestions: [{ species: '', confidence: 7 }], needsBetterPhoto: 'no' }),
    };
    await expect(identifyPlant(Buffer.from('a'), bad)).rejects.toThrow();
  });

  it('يرفض أرقام عناية خارج المدى (حماية من رد مضلل)', () => {
    const r = mockIdentifier.identify(Buffer.from('a'));
    return r.then((raw) => {
      const copy = structuredClone(raw) as { suggestions: { care: { wateringEveryDays: number } }[] };
      copy.suggestions[0]!.care.wateringEveryDays = 0;
      expect(identificationSchema.safeParse(copy).success).toBe(false);
    });
  });
});