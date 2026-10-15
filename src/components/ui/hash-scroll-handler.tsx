"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global hash-scroll handler.
 *
 * After Next.js completes a client-side navigation to "/#section",
 * the target element may not exist in the DOM yet (the new page is still
 * rendering). This component watches for hash changes and retries scrolling
 * until the element appears, covering:
 *
 *  1. Cross-route hash links  (e.g. /cart → /#about)
 *  2. Same-page hash links    (e.g. /#menu → /#about)
 *  3. Direct URL entry / refresh with a hash
 */
export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;

    // Try to scroll immediately — works if the element is already in the DOM
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Element not found yet — poll until it appears (page is still rendering)
    let attempts = 0;
    const maxAttempts = 30; // 30 × 100ms = 3s max wait
    const interval = setInterval(() => {
      attempts++;
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [pathname]); // Re-run whenever the route changes

  return null;
}
