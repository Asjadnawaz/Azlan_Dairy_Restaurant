"use client";

import { useSyncExternalStore } from "react";

/**
 * "Am I on the client yet?" — hydration-safe.
 *
 * Portals and anything that reads `document` must not run during SSR or the
 * first hydration pass, or the server and client trees disagree. A `useState` +
 * `useEffect(() => setMounted(true))` does this, but React 19 flags the
 * synchronous setState in the effect as an error (it triggers a cascading
 * render). `useSyncExternalStore` with a subscription that never fires gives the
 * same answer for free: `false` on the server, `true` on the client, no effect.
 *
 * This is the same shim `order-card.tsx` grew for the admin modals; the customer
 * modals import it from here so they don't pull the admin bundle in with it.
 */

const subscribeNothing = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}
