import { cn } from "@/lib/utils";
import { CloudImage } from "./cloud-image";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const initial = name.trim().charAt(0) || "؟";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-display font-bold text-primary",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
       <CloudImage src={src} alt="" widths={[96, 192]} sizes="96px" priority className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}