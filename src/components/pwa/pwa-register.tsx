"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function subscribeStandalone(callback: () => void) {
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getStandaloneServerSnapshot() {
  return false;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  );

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for updates periodically
            reg.onupdatefound = () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("PWA: New version available");
                  }
                };
              }
            };
          })
          .catch((err) => console.warn("PWA: Service Worker registration skipped:", err));
      });
    }

    // 2. Listen for browser install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      toast.success("Azlan Fast Food App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // If already running inside standalone app, or dismissed, don't show prompt
  if (isStandalone || dismissed || !deferredPrompt) return null;

  return (
    <aside
      aria-label="App installation prompt"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-sm bg-gradient-to-r from-[#00230c] to-emerald-950 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 backdrop-blur-md animate-fade-in flex items-center gap-3.5"
    >
      <div className="w-11 h-11 rounded-xl bg-white p-1 shrink-0 shadow-sm flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="Azlan Logo" className="w-full h-full object-contain" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-black text-white leading-tight">Install Azlan App</h4>
        <p className="text-[11px] text-emerald-200/90 leading-tight mt-0.5 truncate">
          Instant food ordering from home screen
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Dismiss install banner"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </aside>
  );
}
