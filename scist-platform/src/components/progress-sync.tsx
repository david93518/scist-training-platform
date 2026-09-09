"use client";

import { useEffect } from "react";
import { refreshProfile, setGuestProgressEnabled } from "@/store/progress";
import { useFeatures } from "@/components/settings-provider";

/**
 * Keeps the learner store in step with the session cookie: one GET /api/me on
 * load, another whenever the tab comes back into view. Also hands the store
 * the guest-progress toggle, which it cannot read from React context itself.
 */
export function ProgressSync() {
  const guestProgress = useFeatures().guestProgress;

  useEffect(() => {
    setGuestProgressEnabled(guestProgress);
  }, [guestProgress]);

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
