"use client";

import { useEffect } from "react";
import { refreshProfile } from "@/store/progress";

/**
 * Keeps the learner store in step with the session cookie: one GET /api/me on
 * load, another whenever the tab comes back into view.
 */
export function ProgressSync() {
  useEffect(() => {
    void refreshProfile(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshProfile();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
