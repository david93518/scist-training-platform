import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/settings-admin";

export const metadata: Metadata = { title: "設定與整合" };

export default function Page() {
  return <SettingsAdmin />;
}
