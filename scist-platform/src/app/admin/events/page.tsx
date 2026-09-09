import type { Metadata } from "next";
import { EventsAdmin } from "@/components/admin/events-admin";

export const metadata: Metadata = { title: "活動" };

export default function Page() {
  return <EventsAdmin />;
}
