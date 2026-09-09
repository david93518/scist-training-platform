"use client";

import { useEffect } from "react";

/**
 * Adds .is-visible to any .reveal element as it scrolls into view.
 *
 * Elements already inside (or just below) the viewport are shown immediately
 * without waiting for IntersectionObserver, so first paint never depends on
 * observer timing. One observer for the whole app; re-scans on DOM changes.
 */
export function RevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );

    const scan = () => {
      const limit = window.innerHeight * 1.15;
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
        if (reduce || el.getBoundingClientRect().top < limit) {
          el.classList.add("is-visible");
        } else {
          io.observe(el);
        }
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    // a tab opened in the background has no live viewport; rescan when it shows
    document.addEventListener("visibilitychange", scan);

    // belt and braces: nothing stays hidden for long even if observers misfire
    const fallback = window.setTimeout(() => {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 2) {
          el.classList.add("is-visible");
        }
      });
    }, 2500);

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", scan);
      window.clearTimeout(fallback);
    };
  }, []);

  return <>{children}</>;
}
