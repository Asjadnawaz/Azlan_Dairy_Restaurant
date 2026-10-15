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

function subscribeIos() {
  return () => {};
}

function getIosSnapshot() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function getIosServerSnapshot() {
  return false;
}

export function RiderPwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  );

  const isIos = useSyncExternalStore(
    subscribeIos,
    getIosSnapshot,
    getIosServerSnapshot
  );

  useEffect(() => {
    // Listen for rider install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      toast.success("Azlan Rider App installed on home screen!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosTip(!showIosTip);
    }
  };

  // If already running standalone, no need to show install banner
  if (isStandalone) return null;

  // If not standalone and either prompt is available or iOS device
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 text-white shadow-lg animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/rider-icon-192.png" alt="Rider App Icon" className="w-8 h-8 rounded-lg object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide">
              Install Azlan Rider App
            </h4>
            <p className="text-[11px] text-slate-300 leading-tight">
              One-tap access to your shift &amp; delivery manifest
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">install_mobile</span>
          <span>{isIos ? "Add to Phone" : "Install"}</span>
        </button>
      </div>

      {showIosTip && (
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-amber-200/90 leading-relaxed bg-black/40 p-2.5 rounded-xl">
          👉 <strong>iPhone Safari:</strong> Tap the <strong>Share</strong> button (box with upward arrow) at the bottom of Safari, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> to install the Rider App!
        </div>
      )}
    </div>
  );
}
