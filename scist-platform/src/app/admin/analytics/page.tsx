import type { Metadata } from "next";
import { AnalyticsAdmin } from "@/components/admin/analytics-admin";

export const metadata: Metadata = { title: "數據" };

export default function Page() {
  return <AnalyticsAdmin />;
}
