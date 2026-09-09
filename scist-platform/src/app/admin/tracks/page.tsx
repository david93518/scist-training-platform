import type { Metadata } from "next";
import { TracksAdmin } from "@/components/admin/tracks-admin";

export const metadata: Metadata = { title: "學習路徑" };

export default function Page() {
  return <TracksAdmin />;
}
