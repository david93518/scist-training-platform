"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True only after hydration. Use it to gate anything read from localStorage so
 * the server and the first client render agree.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * A clock that ticks every `intervalMs`. Returns 0 on the server and during the
 * first client render, so callers can fall back to a fixed reference time
 * instead of calling Date.now() while rendering.
 */
export function useNow(intervalMs = 1000) {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    // bucketed so the snapshot is stable between ticks
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
