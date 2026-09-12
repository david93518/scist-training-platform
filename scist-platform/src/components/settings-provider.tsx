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

/**
 * Things the client needs to know that come from the deployment, not the
 * database. Kept apart from AdminSettings because nobody edits these in the
 * console — they follow whatever the server has been given.
 */
export interface RuntimeFlags {
  /** Discord OAuth is actually configured on the server */
  discordLogin: boolean;
}

const RUNTIME_DEFAULTS: RuntimeFlags = { discordLogin: false };
const RuntimeContext = createContext<RuntimeFlags>(RUNTIME_DEFAULTS);

export function SettingsProvider({
  value,
  runtime = RUNTIME_DEFAULTS,
  children,
}: {
  value: AdminSettings;
  runtime?: RuntimeFlags;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): AdminSettings {
  return useContext(SettingsContext);
}

export function useRuntimeFlags(): RuntimeFlags {
  return useContext(RuntimeContext);
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
