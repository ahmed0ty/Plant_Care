import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/error', () => ({
  AppError: class AppError extends Error {
    constructor(
      public status: number,
      message: string,
      public code = 'ERROR',
    ) {
      super(message);
    }
  },
}));

import { detectImageType, processImage } from './images';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#2e7d32' } })
    .png()
    .toBuffer();

describe('detectImageType', () => {
  it('يتعرف على PNG وJPEG وWebP من البايتات', async () => {
    const base = sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } });
    expect(detectImageType(await base.clone().png().toBuffer())).toBe('image/png');
    expect(detectImageType(await base.clone().jpeg().toBuffer())).toBe('image/jpeg');
    expect(detectImageType(await base.clone().webp().toBuffer())).toBe('image/webp');
  });

  it('يرفض أي ملف تاني حتى لو اسمه صورة', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('processImage', () => {
  it('يصغّر الصور الكبيرة ويحوّلها WebP', async () => {
    const out = await processImage(await png(3000, 2000));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(1067);
  });

  it('مايكبّرش الصور الصغيرة', async () => {
    const meta = await sharp(await processImage(await png(300, 200))).metadata();
    expect(meta.width).toBe(300);
  });

  it('يرفض ملف نصي بـ 415', async () => {
    await expect(processImage(Buffer.from('hello world'))).rejects.toMatchObject({ status: 415 });
  });

  it('يرفض صورة تالفة (header صح وباقي الملف زبالة) بـ 400', async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('garbage-data')]);
    await expect(processImage(fake)).rejects.toMatchObject({ status: 400 });
  });
});