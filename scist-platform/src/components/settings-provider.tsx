"use client";

/**
 * Makes the admin's settings readable from client components.
 *
 * Server components can call getSettings() directly; the header, the rank
 * ladder and the feature toggles live in client components that have no way
 * to await the database, so the root layout injects the values here.
 */
import { createContext, useContext, useMemo } from "react";
import type { AdminSettings } from "@/admin/types";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { ladder, type Rank } from "@/lib/xp";
import { certLadder, type CertRule } from "@/lib/certifications";

const SettingsContext = createContext<AdminSettings>(DEFAULT_SETTINGS);

export function SettingsProvider({ value, children }: { value: AdminSettings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): AdminSettings {
  return useContext(SettingsContext);
}

/** The configured rank ladder, sorted by threshold. */
export function useRanks(): Rank[] {
  const ranks = useSettings().ranks;
  return useMemo(() => ladder(ranks), [ranks]);
}

/** The configured three-tier certifications, falling back to the built-in set. */
export function useCertifications(): CertRule[] {
  const certifications = useSettings().certifications;
  return useMemo(() => certLadder(certifications), [certifications]);
}

export function useFeatures() {
  return useSettings().features;
}
