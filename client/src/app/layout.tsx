import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo/wght.css";
import "@fontsource-variable/reem-kufi/wght.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";
import { THEME_SCRIPT } from "@/lib/theme";
import { GateIntro } from "@/components/gate-intro";
export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "سجّل نباتاتك بصورة، واحصل على جدول عناية تلقائي وتنبيهات في موعدها وسجلّ صور يوضّح تطوّر نموّها.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1812" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: السكريبت بيضيف class="dark" قبل ما React يشتغل
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
         <GateIntro />
        <a
          href="#main"
          className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
        >
          انتقل إلى المحتوى
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}