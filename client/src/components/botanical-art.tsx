"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

// ورقة مدبّبة تبدأ من (0,0) وتتجه لليمين، وبتتدوّر وتتكبّر لكل ورقة
const LEAF = "M0 0 C 18 -26, 62 -30, 96 0 C 62 30, 18 26, 0 0 Z";
const VEINS = "M30 0 L52 -13 M30 0 L52 13 M56 0 L74 -9 M56 0 L74 9";

const STEMS = [
  "M200 372 C 196 322, 150 282, 120 216",
  "M200 372 C 204 312, 242 272, 284 202",
  "M200 372 C 200 302, 194 242, 204 152",
  "M200 372 C 170 342, 112 332, 80 302",
  "M200 372 C 230 346, 290 336, 326 306",
];

// [x, y, زاوية, حجم, لون]
const LEAVES: [number, number, number, number, 1 | 2 | 3 | 4][] = [
  [120, 216, -118, 1.15, 1],
  [284, 202, -62, 1.1, 2],
  [204, 152, -92, 1.3, 1],
  [80, 302, -168, 0.95, 3],
  [326, 306, -14, 0.95, 2],
  [199, 262, -32, 0.8, 3],
  [199, 296, -148, 0.78, 2],
  [163, 288, -150, 0.7, 4],
  [247, 283, -28, 0.7, 4],
  [150, 330, -176, 0.62, 2],
  [252, 339, -6, 0.62, 3],
];

const EASE = [0.22, 1, 0.36, 1] as const;

const circleV: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: EASE } },
};

const stemV: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1, delay: 0.3 + i * 0.1, ease: "easeInOut" },
  }),
};

const leafV: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 14,
      delay: 0.8 + i * 0.07,
    },
  }),
};

const potV: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** رسمة نبات في أصيص (أصلية، بتتلوّن حسب المظهر فاتح/داكن) */
export function BotanicalArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  // أول رندر ثابت على السيرفر والكلاينت، وبعد الـ mount بنقرر
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // لو المستخدم مفعّل Reduce Motion نعرض الرسمة جاهزة بدون أنيميشن
  const animateTo = mounted ? "show" : "hidden";
  const skip = mounted && reduce;

  return (
    <motion.svg
      viewBox="0 0 400 480"
      role="img"
      aria-label="رسم توضيحي لنبات منزلي في أصيص"
      className={cn("h-full w-full", className)}
      initial="hidden"
      animate={skip ? "show" : undefined}
      whileInView={mounted && !reduce ? "show" : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={skip ? { duration: 0 } : undefined}
      suppressHydrationWarning
    >
      <motion.g
        variants={circleV}
        style={{ originX: "50%", originY: "50%" }}
        suppressHydrationWarning
      >
        <circle cx="200" cy="248" r="176" fill="var(--secondary)" />
        <circle
          cx="200"
          cy="248"
          r="176"
          fill="none"
          stroke="var(--leaf-3)"
          strokeOpacity="0.35"
          strokeDasharray="2 9"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </motion.g>

      <g
        className="motion-safe:animate-sway"
        style={{ transformOrigin: "200px 372px" }}
      >
        {STEMS.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            custom={i}
            variants={stemV}
            fill="none"
            stroke="var(--leaf-1)"
            strokeWidth="4"
            strokeLinecap="round"
            suppressHydrationWarning
          />
        ))}

        {LEAVES.map(([x, y, rot, scale, tone], i) => (
          <g
            key={i}
            transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}
          >
            <motion.g
              custom={i}
              variants={leafV}
              style={{ originX: 0, originY: 0.5 }}
              suppressHydrationWarning
            >
              <path d={LEAF} fill={`var(--leaf-${tone})`} />
              <path
                d="M4 0 L90 0"
                stroke="var(--background)"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d={VEINS}
                stroke="var(--background)"
                strokeOpacity="0.3"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </motion.g>
          </g>
        ))}
      </g>

      <motion.g variants={potV} suppressHydrationWarning>
        <ellipse cx="200" cy="374" rx="58" ry="8" fill="var(--soil)" />
        <path
          d="M146 390 H254 L242 462 Q241 474 229 474 H171 Q159 474 158 462 Z"
          fill="var(--pot)"
        />
        <path
          d="M200 390 H254 L242 462 Q241 474 229 474 H200 Z"
          fill="var(--pot-dark)"
          fillOpacity="0.45"
        />
        <rect
          x="138"
          y="372"
          width="124"
          height="26"
          rx="9"
          fill="var(--pot)"
        />
        <rect
          x="138"
          y="372"
          width="124"
          height="9"
          rx="4.5"
          fill="#fff"
          fillOpacity="0.16"
        />
        <ellipse
          cx="200"
          cy="486"
          rx="86"
          ry="6"
          fill="var(--foreground)"
          fillOpacity="0.08"
        />
      </motion.g>
    </motion.svg>
  );
}
