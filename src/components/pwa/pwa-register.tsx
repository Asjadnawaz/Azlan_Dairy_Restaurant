"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker in the background.
 * Native browser install prompts and ambient badges are left untouched
 * so the browser prompts the user automatically.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("PWA: Service Worker registration skipped:", err));
      });
    }
  }, []);

  return null;
}

