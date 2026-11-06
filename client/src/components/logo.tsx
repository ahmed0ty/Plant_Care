import Link from "next/link";
import { Sprout } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
  light = false,
}: {
  href?: string;
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}
      aria-label={`${BRAND.name} — الصفحة الرئيسية`}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl shadow-sm",
          light ? "bg-white/15 text-white" : "bg-primary text-primary-foreground",
        )}
      >
        <Sprout className="size-5" strokeWidth={2.2} />
      </span>
      <span
        className={cn(
          "font-display text-2xl font-bold leading-none tracking-tight",
          light ? "text-white" : "text-foreground",
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}