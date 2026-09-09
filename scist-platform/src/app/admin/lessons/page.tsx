import type { Metadata } from "next";
import { LessonsAdmin } from "@/components/admin/lessons-admin";

export const metadata: Metadata = { title: "課程與影片" };

export default function Page() {
  return <LessonsAdmin />;
}
