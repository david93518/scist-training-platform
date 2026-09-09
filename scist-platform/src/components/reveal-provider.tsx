"use client";

import { useEffect } from "react";

/**
 * Fades .reveal elements in as they scroll into view.
 *
 * The reveal is a Web Animation, not a class or attribute toggle. Streamed
 * segments (loading.tsx boundaries) reach the DOM before React hydrates
 * them, and this provider's effect has usually run by then; mutating those
 * elements would make React report a hydration mismatch. `element.animate()`
 * leaves attributes and inline styles untouched, so hydration sees exactly
 * the server HTML. `fill: "forwards"` keeps the final state. Only opacity
 * and the `translate` property are animated, so hover `transform`s still work.
 *
 * Stagger comes from the element's inline `transition-delay` (kept from the
 * CSS-transition version so the components did not have to change).
 *
 * Elements already inside (or just below) the viewport are shown immediately
 * without waiting for IntersectionObserver, so first paint never depends on
 * observer timing. One observer for the whole app; re-scans on DOM changes.
 */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = 800;
const shown = new WeakSet<Element>();

function delayOf(el: Element) {
  const raw = (el as HTMLElement).style.transitionDelay.trim();
  if (!raw) return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.endsWith("ms") ? n : n * 1000;
}

function show(el: Element, reduce: boolean) {
  if (shown.has(el)) return;
  shown.add(el);
  if (typeof el.animate !== "function") {
    // very old browser: the CSS fallback rule takes over
    el.setAttribute("data-shown", "");
    return;
  }
  const anim = el.animate(
    [
      { opacity: 0, translate: "0 18px" },
      { opacity: 1, translate: "none" },
    ],
    reduce
      ? { duration: 0, fill: "forwards" }
      : { duration: DURATION, delay: delayOf(el), easing: EASE, fill: "forwards" },
  );
  // A forward-filling animation stays live for the life of the page, and a page
  // holding sixty of them keeps sixty layers on the compositor. Write the last
  // frame into the element and let the animation go.
  void anim.finished
    .then(() => {
      anim.commitStyles();
      anim.cancel();
    })
    .catch(() => {
      /* element left the DOM before the animation ended */
    });
}

export function RevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target, reduce);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );

    const scan = () => {
      const limit = window.innerHeight * 1.15;
      document.querySelectorAll(".reveal").forEach((el) => {
        if (shown.has(el)) return;
        if (reduce || el.getBoundingClientRect().top < limit) show(el, reduce);
        else io.observe(el);
      });
    };

    // scan() measures every .reveal on the page, so a burst of mutations
    // (a streamed segment arriving, or a browser extension rewriting the DOM)
    // must collapse into one pass instead of one pass per mutation.
    let queued = 0;
    const queueScan = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    };

    scan();
    const mo = new MutationObserver(queueScan);
    mo.observe(document.body, { childList: true, subtree: true });
    // a tab opened in the background has no live viewport; rescan when it shows
    document.addEventListener("visibilitychange", queueScan);

    // belt and braces: nothing stays hidden for long even if observers misfire
    const fallback = window.setTimeout(() => {
      document.querySelectorAll(".reveal").forEach((el) => {
        if (!shown.has(el) && el.getBoundingClientRect().top < window.innerHeight * 2) show(el, reduce);
      });
    }, 2500);

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", queueScan);
      window.clearTimeout(fallback);
      cancelAnimationFrame(queued);
    };
  }, []);

  return <>{children}</>;
}
