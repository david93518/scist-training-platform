import type { Metadata } from "next";
import { AuditAdmin } from "@/components/admin/audit-admin";

export const metadata: Metadata = { title: "操作紀錄" };

export default function Page() {
  return <AuditAdmin />;
}
