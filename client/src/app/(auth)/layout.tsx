import { Check } from "lucide-react";
import { BotanicalArt } from "@/components/botanical-art";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = ["تعرّف على النبات من صورة", "جدول ري وتسميد وتقليم تلقائي", "سجلّ صور يوضّح نموّ نبتتك"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedirectIfAuthed>
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col px-4 py-6 sm:px-10">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle />
          </div>
          <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            {children}
          </main>
        </div>

        <aside
          aria-hidden="true"
          className="relative hidden overflow-hidden bg-[#1f4a2c] p-12 text-white lg:flex lg:flex-col lg:justify-between dark:bg-[#12261a]"
        >
          <div className="pointer-events-none absolute -top-24 -start-24 size-96 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-32 -end-20 size-[28rem] rounded-full bg-black/10" />
          <div className="relative">
            <p className="font-display text-3xl font-bold leading-snug text-balance">
              النبتة الصغيرة تحتاج انتباهاً صغيراً، لكن في وقته.
            </p>
            <ul className="mt-8 space-y-3 text-lg text-white/85">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-white/15">
                    <Check className="size-3.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto h-[26rem] w-full max-w-sm">
            <BotanicalArt />
          </div>
        </aside>
      </div>
    </RedirectIfAuthed>
  );
}