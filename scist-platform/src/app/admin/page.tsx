import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = { title: "總覽" };

export default function AdminHome() {
  return <AdminDashboard />;
}
