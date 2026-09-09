import type { Metadata } from "next";
import { UsersAdmin } from "@/components/admin/users-admin";

export const metadata: Metadata = { title: "學員與角色" };

export default async function Page(props: PageProps<"/admin/users">) {
  const sp = await props.searchParams;
  const u = typeof sp.u === "string" ? sp.u : undefined;
  return <UsersAdmin initialUserId={u} />;
}
