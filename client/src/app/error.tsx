"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-4xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-lg text-muted-foreground">لا تقلق، بياناتك بأمان. جرّب إعادة تحميل الصفحة.</p>
        <Button className="mt-8" size="lg" onClick={reset}>
          إعادة المحاولة
        </Button>
      </div>
    </main>
  );
}