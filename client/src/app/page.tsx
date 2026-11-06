import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Camera,
  CalendarCheck,
  Images,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { BotanicalArt } from "@/components/botanical-art";
import { HeaderCta } from "@/components/header-cta";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  FadeIn,
  Float,
  Rise,
  Stagger,
  StaggerItem,
} from "@/components/motion";
import { BRAND, HERO_PHOTO } from "@/lib/brand";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "تعرّف من الصورة",
    text: "ارفع صورة نبتتك فيقترح النظام نوعها وملف العناية المناسب، وأنت تراجع وتعدّل قبل الحفظ.",
  },
  {
    icon: CalendarCheck,
    title: "جدول عناية تلقائي",
    text: "مواعيد الري والتسميد والتقليم تُحسب من نوع النبات، وتقدر تعدّلها كما يناسبك.",
  },
  {
    icon: BellRing,
    title: "تنبيهات في موعدها",
    text: "بريد إلكتروني أو إشعارات المتصفح، وأنت تختار القناة التي تناسبك.",
  },
  {
    icon: Images,
    title: "سجلّ النمو بالصور",
    text: "صور مرتبة زمنياً لكل نبات، مع ملاحظة قصيرة عن صحته عند كل صورة جديدة.",
  },
];

const STEPS = [
  { n: "١", title: "صوّر نبتتك", text: "التقط صورة واضحة أو ارفع واحدة من معرضك." },
  { n: "٢", title: "راجع الاقتراح", text: "اطّلع على النوع المقترح وعدّل ما تراه مناسباً." },
  { n: "٣", title: "اتبع الجدول", text: "ستصلك المهام في وقتها، وتعلّم ما أنجزته بضغطة." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <HeaderCta />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ===== الواجهة الرئيسية ===== */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <Rise y={16}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-secondary-foreground">
                <Sparkles className="size-4 text-accent" />
                {BRAND.tagline}
              </span>
            </Rise>

            <Rise delay={0.1}>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.25] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                نباتاتك بخير،
                <br />
                <span className="text-primary">ولن تنسى موعد الري بعد اليوم.</span>
              </h1>
            </Rise>

            <Rise delay={0.2}>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground text-pretty">
                سجّل نباتاتك بصورة، واحصل على جدول عناية تلقائي وتنبيهات في موعدها، وسجلّ صور يوضّح لك كيف تنمو نبتتك أسبوعاً بعد أسبوع.
              </p>
            </Rise>

            <Rise delay={0.3}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/register">
                    أنشئ حسابك مجاناً
                    <ArrowLeft />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">لدي حساب</Link>
                </Button>
              </div>
            </Rise>

            <Rise delay={0.4} y={12}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
                {["تعرّف على النبات من صورة", "ري وتسميد وتقليم", "تنبيهات بالبريد أو المتصفح"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </Rise>
          </div>

          {/* بطاقة العيّنة النباتية */}
          <Rise delay={0.2} y={32} className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[5/6] overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-xl shadow-primary/10">
              <div className="relative h-full w-full overflow-hidden rounded-3xl bg-secondary/50">
                {HERO_PHOTO ? (
                  <Image
                    src={HERO_PHOTO}
                    alt="نبات منزلي أخضر"
                    fill
                    priority
                    sizes="(min-width: 1024px) 420px, 90vw"
                    className="object-cover"
                  />
                ) : (
                  <BotanicalArt />
                )}
              </div>
            </div>

            <Rise
              delay={0.7}
              y={20}
              className="absolute -bottom-6 start-4 end-4 sm:start-8 sm:end-8"
            >
              <Float amount={6} duration={5}>
                <div className="rotate-[-1.5deg] rounded-2xl border border-dashed border-primary/40 bg-card p-4 shadow-lg">
                  <p className="text-xs font-semibold text-accent">مثال توضيحي لبطاقة نبات</p>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <p className="font-display text-xl font-bold">مونستيرا</p>
                    <p dir="ltr" className="text-sm italic text-muted-foreground">Monstera deliciosa</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">الري كل ٧ أيام · تسميد كل ٣٠ يوماً</p>
                </div>
              </Float>
            </Rise>
          </Rise>
        </section>

        {/* ===== المميزات ===== */}
        <section className="border-y border-border/70 bg-card/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">كل ما تحتاجه نبتتك في مكان واحد</h2>
              <p className="mt-3 text-lg text-muted-foreground">لا تحتاج أن تعرف اسم نبتتك ولا مواعيد عنايتها، فهذا دورنا.</p>
            </FadeIn>

            <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <StaggerItem key={title} className="h-full">
                  <article className="group h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{text}</p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ===== كيف تعمل ===== */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">ثلاث خطوات فقط</h2>
          </FadeIn>

          <Stagger as="ol" className="mt-12 grid gap-6 md:grid-cols-3" gap={0.15}>
            {STEPS.map((s) => (
              <StaggerItem as="li" key={s.n} className="h-full">
                <div className="relative h-full rounded-2xl border border-border bg-card p-6">
                  <span className="font-display text-5xl font-bold text-primary/25">{s.n}</span>
                  <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{s.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <FadeIn y={32}>
            <div className="mt-16 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-12">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-bold">جاهز تبدأ؟</h2>
                <p className="mt-2 text-lg opacity-90">سجّل أول نبتة خلال دقيقة، ودع التذكيرات علينا.</p>
              </div>
              <Button asChild size="lg" variant="accent">
                <Link href="/register">
                  <Camera />
                  ابدأ الآن
                </Link>
              </Button>
            </div>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{BRAND.name} — {BRAND.tagline}</p>
          <p>اقتراحات التعرّف على النباتات إرشادية وليست تشخيصاً نهائياً.</p>
        </div>
      </footer>
    </div>
  );
}