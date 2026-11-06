import { z } from 'zod';

export const chatSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(1000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine((d) => d.messages[d.messages.length - 1]?.role === 'user', 'آخر رسالة لازم تكون من المستخدم');