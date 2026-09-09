import type { Metadata } from "next";
import { InstructorsAdmin } from "@/components/admin/instructors-admin";

export const metadata: Metadata = { title: "講師" };

export default async function Page(props: PageProps<"/admin/instructors">) {
  const sp = await props.searchParams;
  const edit = typeof sp.edit === "string" ? sp.edit : undefined;
  return <InstructorsAdmin editId={edit} />;
}
