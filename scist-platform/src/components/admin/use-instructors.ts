"use client";

import { getAdminApi } from "@/admin/api";
import type { AdminInstructor } from "@/admin/types";
import { useAsync } from "@/components/admin/ui";

/** Instructor roster for dropdowns (tracks, challenge authors, event hosts). */
export function useInstructors(): AdminInstructor[] {
  const api = getAdminApi();
  const { data } = useAsync(() => api.instructors.list());
  return data ?? [];
}
