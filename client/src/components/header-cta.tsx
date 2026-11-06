"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export function HeaderCta() {
  const { status } = useAuth();

  if (status === "loading") return <Skeleton className="h-10 w-40" />;

  if (status === "authenticated") {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">
          لوحة التحكم
          <ArrowLeft className="rtl:rotate-0" />
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">دخول</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/register">ابدأ مجاناً</Link>
      </Button>
    </div>
  );
}