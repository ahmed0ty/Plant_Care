export class Busy extends Error {
  constructor() {
    super('BUSY');
    this.name = 'Busy';
  }
}

/** بيسمح بعدد max مهام في نفس الوقت، والباقي بيستنى في طابور، ولو الطابور اتملى بيرمي Busy */
export function createLimiter(max: number, maxQueue: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  const release = () => {
    const next = waiting.shift();
    if (next) next(); // المكان بيتسلّم للي بعده، فـ active ما بيتغيرش
    else active--;
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      if (waiting.length >= maxQueue) throw new Busy();
      await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
      active++;
    }
    try {
      return await fn();
    } finally {
      release();
    }
  };
}