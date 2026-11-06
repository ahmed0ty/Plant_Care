import Link from "next/link";
import { BotanicalArt } from "@/components/botanical-art";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto h-56 w-48">
          <BotanicalArt />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold">هذه الصفحة غير موجودة</h1>
        <p className="mt-3 text-lg text-muted-foreground">ربما تغيّر الرابط أو لم تعد الصفحة متاحة.</p>
        <Button asChild className="mt-8" size="lg">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </main>
  );
}