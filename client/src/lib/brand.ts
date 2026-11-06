export const BRAND = {
  name: "نبتتي",
  tagline: "مساعدك للعناية بالنباتات",
} as const;

/**
 * صورة الواجهة الرئيسية. لو نزّلت صورة نبات (مثلاً من Unsplash أو Pexels)
 * حطها في public/images وغيّر القيمة لـ "/images/hero.jpg".
 * لو null بتظهر الرسمة الأصلية.
 */
export const HERO_PHOTO: string | null = null;