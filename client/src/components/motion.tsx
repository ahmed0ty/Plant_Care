"use client";

import {
  animate,
  motion,
  useAnimationControls,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

// 1 = السرعة الأصلية | 1.6 = أبطأ | 2 = ضعف المدة
export const SLOW = 1.6;

const ease = [0.22, 1, 0.36, 1] as const;

type DivProps = Omit<HTMLMotionProps<"div">, "children">;

/** يظهر لما العنصر يدخل الشاشة (للأقسام اللي تحت) */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
  ...props
}: DivProps & { children: ReactNode; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: reduce ? 0 : 0.7 * SLOW,
        delay: reduce ? 0 : delay * SLOW,
        ease,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** يظهر أول ما الصفحة تفتح (للـ hero وأول الصفحة) */
export function Rise({
  children,
  delay = 0,
  y = 24,
  x = 0,
  className,
  ...props
}: DivProps & { children: ReactNode; delay?: number; y?: number; x?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y, x }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        duration: reduce ? 0 : 0.8 * SLOW,
        delay: reduce ? 0 : delay * SLOW,
        ease,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** حاوية بتظهّر أولادها واحد ورا التاني */
export function Stagger({
  children,
  className,
  gap = 0.08,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  as?: "div" | "ul" | "ol";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : gap * SLOW } },
      }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.6 * SLOW, ease },
        },
      }}
    >
      {children}
    </Comp>
  );
}

/** حركة طفو خفيفة مستمرة (للكروت الزخرفية) */
export function Float({
  children,
  className,
  amount = 8,
  duration = 5,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -amount, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** اهتزاز أفقي كل ما trigger يزيد (لأخطاء الفورم) */
export function Shake({
  children,
  trigger,
  className,
}: {
  children: ReactNode;
  trigger: number;
  className?: string;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (trigger === 0 || reduce) return;
    controls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.5 * SLOW, ease: "easeInOut" },
    });
  }, [trigger, reduce, controls]);

  return (
    <motion.div animate={controls} className={className}>
      {children}
    </motion.div>
  );
}

/** صورة بتتحرك أبطأ من السكرول (parallax خفيف). الأب لازم يكون له ارتفاع */
export function ParallaxImage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? ["0%", "0%"] : ["-8%", "8%"]
  );

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        style={{ y, scale: reduce ? 1 : 1.18 }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

/** عدّاد أرقام بيعد من 0 للقيمة لما يظهر على الشاشة */
export function CountUp({
  to,
  duration = 1.2 * SLOW,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduce) {
      el.textContent = String(to);
      return;
    }
    if (!inView) return;

    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      0
    </span>
  );
}