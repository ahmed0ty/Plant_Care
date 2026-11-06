"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarCheck,
  Images,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Settings,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { UndoProvider } from "@/components/app/undo-provider";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { useTaskBadge } from "@/lib/badges";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** يظهر في الشريط السفلي للموبايل */
  mobile?: boolean;
  /** يعرض شارة المهام */
  badge?: boolean;
}

interface BadgeInfo {
  count: number;
  urgent: boolean;
  label: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, mobile: true },
      { href: "/plants", label: "نباتاتي", icon: Sprout, mobile: true },
      { href: "/tasks", label: "المهام", icon: CalendarCheck, mobile: true, badge: true },
    ],
  },
  {
    title: "المتابعة",
    items: [
      { href: "/gallery", label: "معرض النمو", icon: Images, mobile: true },
      { href: "/stats", label: "الإحصائيات", icon: TrendingUp, mobile: true },
    ],
  },
  {
    title: "الحساب",
    items: [{ href: "/settings", label: "الإعدادات", icon: Settings }],
  },
];

const MOBILE_ITEMS = GROUPS.flatMap((g) => g.items).filter((i) => i.mobile);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavBadge({ info, floating }: { info: BadgeInfo | null; floating?: boolean }) {
  return (
    <AnimatePresence>
      {info && info.count > 0 ? (
        <motion.span
          // key بيتغير مع الرقم فيعمل نبضة كل ما يتحدّث
          key={info.count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className={cn(
            "grid place-items-center rounded-full font-bold leading-none",
            floating
              ? "absolute -end-3 -top-1.5 min-w-4 px-1 py-0.5 text-[10px]"
              : "ms-auto min-w-6 px-1.5 py-1 text-xs",
            info.urgent ? "bg-destructive text-white" : "bg-secondary text-secondary-foreground",
          )}
        >
          <span aria-hidden="true">{info.count > 99 ? "99+" : info.count}</span>
          <span className="sr-only">{info.label}</span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

function SideLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge: BadgeInfo | null }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <motion.div whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-semibold transition-colors",
          active ? "text-primary-foreground" : "text-foreground/80 hover:bg-secondary",
        )}
      >
        {active ? (
          <motion.span
            layoutId="side-active-pill"
            className="absolute inset-0 rounded-xl bg-primary shadow-sm"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        ) : null}
        <Icon className="relative z-10 size-5" />
        <span className="relative z-10">{item.label}</span>
        <span className="relative z-10 ms-auto">
          <NavBadge info={badge} />
        </span>
      </Link>
    </motion.div>
  );
}

function BottomLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge: BadgeInfo | null }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors",
        active ? "text-primary-foreground" : "text-foreground/80 hover:bg-secondary",
      )}
    >
      {active ? (
        <motion.span
          layoutId="bottom-active-pill"
          className="absolute inset-0 rounded-xl bg-primary shadow-sm"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
      <motion.span
        className="relative z-10"
        animate={{ y: active ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        <Icon className="size-5" />
        <NavBadge info={badge} floating />
      </motion.span>
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const profile = useProfile();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { overdue, today } = useTaskBadge();
  const [leaving, setLeaving] = useState(false);

  const taskBadge: BadgeInfo | null =
    overdue > 0
      ? { count: overdue, urgent: true, label: `${overdue} مهمة متأخرة` }
      : today > 0
        ? { count: today, urgent: false, label: `${today} مهمة اليوم` }
        : null;

  // رقم المهام المتأخرة في عنوان التبويب: (3) نبتتي. بنراقب العنوان عشان Next بيغيّره مع كل تنقل
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\)\s/, "");
    const apply = () => {
      const next = (overdue > 0 ? `(${overdue}) ` : "") + strip(document.title);
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = strip(document.title);
    };
  }, [overdue]);

  async function onLogout() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <UndoProvider>
      <div className="relative isolate min-h-dvh lg:ps-72">
        {/* خلفية الصفحة */}
        <div aria-hidden="true" className="fixed inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${BACKGROUNDS.page})` }}
          />
          <div className="absolute inset-0 bg-background/40" />
        </div>

        {/* الشريط الجانبي (الشاشات الكبيرة) */}
        <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-border p-5 lg:flex">
          {/* خلفية القائمة الجانبية */}
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${BACKGROUNDS.sidebar})` }}
            />
            <div className="absolute inset-0 bg-card/20 backdrop-blur-sm" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          >
            <Logo href="/dashboard" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: 0.08 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6"
          >
            <Link
              href="/plants/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="size-5" />
              إضافة نبتة
            </Link>
          </motion.div>

          <motion.nav
            aria-label="التنقل الرئيسي"
            className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.15 } },
            }}
          >
            {GROUPS.map((group) => (
              <motion.div
                key={group.title}
                className="space-y-1.5"
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  show: { opacity: 1, x: 0, transition: { duration: reduce ? 0 : 0.5, ease: EASE } },
                }}
              >
                <p className="px-3.5 text-xs font-bold text-muted-foreground">{group.title}</p>
                {group.items.map((item) => (
                  <SideLink key={item.href} item={item} pathname={pathname} badge={item.badge ? taskBadge : null} />
                ))}
              </motion.div>
            ))}
          </motion.nav>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-3 px-1">
              <Avatar name={profile.name} src={profile.avatarUrl} className="size-10 text-lg" />
              <div className="min-w-0">
                <p className="truncate font-bold">{profile.name}</p>
                <p dir="ltr" className="truncate text-start text-sm text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onLogout} disabled={leaving}>
                {leaving ? <LoaderCircle className="animate-spin" /> : <LogOut className="rtl:-scale-x-100" />}
                تسجيل الخروج
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* الشريط العلوي (الموبايل) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md lg:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="الإعدادات"
              className="inline-flex size-10 items-center justify-center rounded-xl hover:bg-secondary"
            >
              <Settings className="size-5" />
            </Link>
            <Button variant="ghost" size="icon" onClick={onLogout} disabled={leaving} aria-label="تسجيل الخروج">
              {leaving ? <LoaderCircle className="animate-spin" /> : <LogOut className="rtl:-scale-x-100" />}
            </Button>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
          {children}
        </main>

        {/* شريط التنقل السفلي (الموبايل) */}
        <motion.nav
          aria-label="التنقل الرئيسي"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: 0.1 }}
          className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-border bg-card/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
        >
          {MOBILE_ITEMS.map((item) => (
            <BottomLink key={item.href} item={item} pathname={pathname} badge={item.badge ? taskBadge : null} />
          ))}
        </motion.nav>
      </div>
    </UndoProvider>
  );
}