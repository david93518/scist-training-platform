"use client";

import { usePathname } from "next/navigation";

/** The admin console has its own chrome; keep the public footer off it. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
