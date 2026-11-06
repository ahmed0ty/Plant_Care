import { describe, expect, it } from 'vitest';
import { chatSchema } from './chat';

const user = (content: string) => ({ role: 'user' as const, content });
const bot = (content: string) => ({ role: 'assistant' as const, content });

describe('chatSchema', () => {
  it('بيقبل سؤال واحد', () => {
    expect(chatSchema.safeParse({ messages: [user('أسقيها إمتى؟')] }).success).toBe(true);
  });

  it('بيقبل محادثة طويلة آخرها من المستخدم', () => {
    expect(chatSchema.safeParse({ messages: [user('س'), bot('ج'), user('س2')] }).success).toBe(true);
  });

  it('بيرفض لو آخر رسالة من المساعد', () => {
    const r = chatSchema.safeParse({ messages: [user('س'), bot('ج')] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('آخر رسالة لازم تكون من المستخدم');
  });

  it('بيرفض قائمة فاضية', () => {
    expect(chatSchema.safeParse({ messages: [] }).success).toBe(false);
  });

  it('بيرفض أكتر من 20 رسالة', () => {
    const many = Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? user('س') : bot('ج')));
    expect(chatSchema.safeParse({ messages: many }).success).toBe(false);
  });

  it('بيرفض رسالة فاضية أو كلها مسافات', () => {
    expect(chatSchema.safeParse({ messages: [user('   ')] }).success).toBe(false);
  });

  it('بيرفض رسالة أطول من 1000 حرف', () => {
    expect(chatSchema.safeParse({ messages: [user('ا'.repeat(1001))] }).success).toBe(false);
    expect(chatSchema.safeParse({ messages: [user('ا'.repeat(1000))] }).success).toBe(true);
  });

  it('بيرفض دور غير معروف', () => {
    expect(chatSchema.safeParse({ messages: [{ role: 'system', content: 'x' }] }).success).toBe(false);
  });
});