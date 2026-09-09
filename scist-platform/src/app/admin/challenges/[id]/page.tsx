import type { Metadata } from "next";
import { ChallengeEditor } from "@/components/admin/challenge-editor";

export const metadata: Metadata = { title: "編輯題目" };

export default async function Page(props: PageProps<"/admin/challenges/[id]">) {
  const { id } = await props.params;
  return <ChallengeEditor id={id === "new" ? undefined : id} />;
}
