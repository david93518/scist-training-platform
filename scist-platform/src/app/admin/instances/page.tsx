import type { Metadata } from "next";
import { InstancesAdmin } from "@/components/admin/instances-admin";

export const metadata: Metadata = { title: "靶機環境" };

export default function Page() {
  return <InstancesAdmin />;
}
