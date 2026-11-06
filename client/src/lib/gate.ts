export const GATE_ID = "nabtety-gate";
export const GATE_KEY = "nabtety-gate-seen";

/** false = تظهر حتى لو الجهاز مفعّل تقليل الحركة */
export const RESPECT_REDUCED_MOTION = false;
/** true = مرة واحدة لكل تبويب/جلسة، false = في كل تحميل كامل للصفحة */
export const ONCE_PER_SESSION = true;

/** صورة السياج (داخل client/public) */
export const GATE_IMAGES = {
  hedge: "/gate/hedge.jpg",
} as const;

/** شبكة القطع (أعمدة × صفوف). زوّدها لو عايز قطع أصغر وأكتر */
export const GATE_GRID = { cols: 11, rows: 7 } as const;

/** التوقيتات بالثواني */
export const GATE_TIMING = {
  sealIn: 0.4, // ظهور الشعار
  breakAt: 1.8, // بداية تطاير أول قطع من النص
  spread: 2.0, // الفاصل بين أول قطعة وآخر قطعة تبدأ الطيران
  flight: 2.4, // مدة طيران القطعة الواحدة (±15% عشوائي)
} as const;

/** المدة الكلية بالملّي ثانية (محسوبة تلقائياً) */
export const GATE_TOTAL_MS = Math.ceil(
  (GATE_TIMING.breakAt + GATE_TIMING.spread + GATE_TIMING.flight * 1.15 + 0.2) * 1000,
);