"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/loader";
import { useAuth } from "@/lib/auth";

/** أي صفحة جوّه التطبيق: لو مفيش جلسة نحوّل للدخول ونرجّعه لنفس الصفحة بعدها */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const here = window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(here)}`);
  }, [status, router]);

  if (status !== "authenticated") return <Loader />;
  return <>{children}</>;
}