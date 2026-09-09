import type { Metadata } from "next";
import { TrackEditor } from "@/components/admin/track-editor";

export const metadata: Metadata = { title: "編輯學習路徑" };

export default async function Page(props: PageProps<"/admin/tracks/[id]">) {
  const { id } = await props.params;
  return <TrackEditor id={id === "new" ? undefined : id} />;
}
