"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/loader";
import { useAuth } from "@/lib/auth";
import { safeNextPath } from "@/lib/validation";

/** صفحات الدخول والتسجيل: لو المستخدم داخل فعلاً نحوّله (مع احترام ?next=) */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    router.replace(next ?? "/dashboard");
  }, [status, router]);

  if (status === "authenticated") return <Loader label="جارٍ تحويلك..." />;
  return <>{children}</>;
}