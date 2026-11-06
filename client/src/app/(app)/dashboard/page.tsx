import type { Metadata } from "next";
import { DashboardView } from "@/components/app/dashboard-view";
export const instant = false;
export const metadata: Metadata = { title: "لوحة التحكم" };

export default function DashboardPage() {
  return <DashboardView />;
}