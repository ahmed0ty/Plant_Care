import { Sprout } from "lucide-react";

export function Loader({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <span className="grid size-14 animate-pulse place-items-center rounded-2xl bg-secondary text-primary motion-reduce:animate-none">
          <Sprout className="size-7" />
        </span>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}