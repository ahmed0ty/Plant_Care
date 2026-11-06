"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cloudUrl } from "@/lib/image";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> {
  src: string;
  /** المقاس اللي الصورة بتتعرض بيه، عشان المتصفح يختار أنسب نسخة */
  sizes: string;
  /** عروض النسخ بالبكسل (كل نسخة جديدة بتتحسب مرة واحدة في Cloudinary) */
  widths?: number[];
  /** للصور اللي فوق الصفحة: تتحمّل فوراً بدل التحميل الكسول */
  priority?: boolean;
}

export function CloudImage({
  src,
  sizes,
  widths = [400, 800, 1200],
  priority = false,
  alt = "",
  onError,
  ...rest
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const first = cloudUrl(src, widths[0]!);
  const optimized = failedSrc !== src && first !== src;
  const mid = widths[Math.min(1, widths.length - 1)]!;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      alt={alt}
      src={optimized ? cloudUrl(src, mid) : src}
      srcSet={optimized ? widths.map((w) => `${cloudUrl(src, w)} ${w}w`).join(", ") : undefined}
      sizes={optimized ? sizes : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={(e) => {
        setFailedSrc(src); // نرجع للصورة الأصلية
        onError?.(e);
      }}
    />
  );
}