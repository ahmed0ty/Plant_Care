import { describe, expect, it } from 'vitest';
import { Busy, createLimiter } from './concurrency';

describe('createLimiter', () => {
  it('بيشغّل لحد max مهام في نفس الوقت والباقي بيستنى', async () => {
    const run = createLimiter(2, 10);
    let active = 0;
    let peak = 0;
    const task = async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return 1;
    };
    const results = await Promise.all(Array.from({ length: 6 }, () => run(task)));
    expect(results).toEqual([1, 1, 1, 1, 1, 1]);
    expect(peak).toBe(2);
  });

  it('بيرفض لما الطابور يتملي، وبيكمّل اللي مستني بعد ما المكان يفضى', async () => {
    const run = createLimiter(1, 1);
    let release!: () => void;
    const hold = new Promise<void>((r) => (release = r));

    const first = run(() => hold);
    const second = run(async () => 2); // في الطابور
    await expect(run(async () => 3)).rejects.toBeInstanceOf(Busy);

    release();
    await first;
    expect(await second).toBe(2);
  });

  it('بيحرّر المكان حتى لو المهمة فشلت', async () => {
    const run = createLimiter(1, 0);
    await expect(
      run(async () => {
        throw new Error('x');
      }),
    ).rejects.toThrow('x');
    expect(await run(async () => 5)).toBe(5);
  });
});