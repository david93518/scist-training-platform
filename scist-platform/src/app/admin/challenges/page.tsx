import type { Metadata } from "next";
import { ChallengesAdmin } from "@/components/admin/challenges-admin";

export const metadata: Metadata = { title: "題庫" };

export default function Page() {
  return <ChallengesAdmin />;
}
