"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, MessageCircle, RotateCcw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "ليه أوراقها بتصفر؟",
  "أسقيها إمتى بالظبط؟",
  "تحتاج إضاءة قد إيه؟",
  "إزاي أسمّدها صح؟",
];

const MAX_LEN = 1000;

export function PlantChat({ plantId, plantName }: { plantId: string; plantName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (history: ChatMessage[]) =>
      api<{ reply: string }>(`/plants/${plantId}/chat`, { method: "POST", body: { messages: history } }),
    onSuccess: (data) => setMessages((m) => [...m, { role: "assistant", content: data.reply }]),
  });

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chat.isPending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: content.slice(0, MAX_LEN) }];
    setMessages(next);
    setInput("");
    chat.reset();
    chat.mutate(next.slice(-10));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
          <MessageCircle className="size-6 text-primary" />
          اسأل عن {plantName}
        </h2>
        {messages.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              chat.reset();
              setMessages([]);
            }}
            disabled={chat.isPending}
          >
            <Trash2 />
            مسح المحادثة
          </Button>
        ) : null}
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              اسأل أي سؤال عن نبتتك، والمساعد عارف نوعها وجدول عنايتها وآخر نصيحة صحة ليها.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto pe-1">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 leading-7",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-secondary text-foreground",
                  )}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {chat.isPending ? (
              <div className="flex justify-end">
                <p className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  جارٍ الكتابة...
                </p>
              </div>
            ) : null}
          </div>
        )}

        {chat.isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            <span role="alert" className="flex-1">
              {chat.error.message}
            </span>
            {lastIsUser ? (
              <Button type="button" size="sm" variant="outline" onClick={() => chat.mutate(messages.slice(-10))}>
                <RotateCcw />
                إعادة المحاولة
              </Button>
            ) : null}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_LEN}
            placeholder="اكتب سؤالك..."
            aria-label="سؤالك عن النبتة"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
          <Button type="submit" disabled={chat.isPending || !input.trim()} aria-label="إرسال">
            {chat.isPending ? <LoaderCircle className="animate-spin" /> : <Send className="rtl:-scale-x-100" />}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          ردود الذكاء الاصطناعي اقتراحات وقد تخطئ، وليست تشخيصاً نهائياً.
        </p>
      </Card>
    </section>
  );
}