"use client";

import type { ReactNode } from "react";

/**
 * ThemeProvider stub.
 *
 * The app uses a fixed "light" theme with no dark-mode toggle, so the
 * previous `next-themes` dependency was unnecessary overhead.  It also
 * injected an inline <script> tag that triggered a React 19+ console
 * error ("Encountered a script tag while rendering React component…")
 * and contributed to hydration mismatches on every page load.
 *
 * This stub preserves the same API surface so nothing else in the app
 * needs to change — it simply renders its children.
 */
export function ThemeProvider({
  children,
}: {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  [key: string]: unknown;
}) {
  return <>{children}</>;
}
