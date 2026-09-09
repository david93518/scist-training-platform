import type { Metadata } from "next";
import { QuestionsAdmin } from "@/components/admin/questions-admin";

export const metadata: Metadata = { title: "問答" };

export default function Page() {
  return <QuestionsAdmin />;
}
