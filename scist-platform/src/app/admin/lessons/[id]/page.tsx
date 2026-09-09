import type { Metadata } from "next";
import { LessonEditor } from "@/components/admin/lesson-editor";

export const metadata: Metadata = { title: "上架課程" };

export default async function Page(props: PageProps<"/admin/lessons/[id]">) {
  const { id } = await props.params;
  return <LessonEditor id={id === "new" ? undefined : id} />;
}
