"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    avatar?: string | null;
    isGoogle?: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerWelcome = (user: User, provider?: string) => {
    if (!user) return;

    const storageKey = `azlan_welcome_shown_${user.id}`;
    if (sessionStorage.getItem(storageKey)) {
      return; // Already welcomed in this session
    }

    const meta = user.user_metadata || {};
    const fullName =
      meta.full_name ||
      meta.name ||
      meta.first_name ||
      user.email?.split("@")[0] ||
      "Valued Customer";

    const avatar = meta.avatar_url || meta.picture || null;
    const isGoogle =
      provider === "google" ||
      user.app_metadata?.provider === "google" ||
      !!avatar;

    setUserInfo({
      name: fullName,
      avatar,
      isGoogle,
    });

    setIsOpen(true);
    sessionStorage.setItem(storageKey, "true");
  };

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    // 1. Check query parameters (e.g. from OAuth redirect ?login=success)
    const urlParams = new URLSearchParams(window.location.search);
    const hasLoginParam =
      urlParams.get("login") === "success" ||
      urlParams.get("login") === "google_success";

    if (hasLoginParam) {
      // Clean up URL parameter seamlessly
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Fetch current user & listen for auth state
    getCurrentUser()
      .then((user) => {
        if (user && hasLoginParam) {
          triggerWelcome(user, "google");
        }
      })
      .catch(() => {});

    const subscription = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        triggerWelcome(session.user, session.user.app_metadata?.provider);
      }
    });

    // 3. Custom window event from local AuthModal
    const handleCustomWelcome = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.user) {
        triggerWelcome(customEvent.detail.user, customEvent.detail.provider);
      }
    };
    window.addEventListener("azlan_user_logged_in", handleCustomWelcome);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("azlan_user_logged_in", handleCustomWelcome);
    };
  }, []);

  if (!mounted || !isOpen || !userInfo) return null;

  const firstName = userInfo.name.split(" ")[0];
  const initials = firstName ? firstName.charAt(0).toUpperCase() : "A";

  const handleExploreMenu = () => {
    setIsOpen(false);
    const menuElement = document.getElementById("menu");
    if (menuElement) {
      menuElement.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#menu";
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0c1810] text-slate-900 dark:text-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-emerald-800/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand Accent Top Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-[#FFC700] to-emerald-700" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 dark:bg-emerald-950/80 hover:bg-slate-200 dark:hover:bg-emerald-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          aria-label="Close welcome modal"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="p-6 sm:p-8 text-center flex flex-col items-center">
          {/* Avatar Section */}
          <div className="relative mb-3.5">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full ring-4 ring-emerald-500/20 dark:ring-emerald-400/30 p-1 bg-white dark:bg-[#14281b] shadow-md flex items-center justify-center">
              {userInfo.avatar ? (
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-[#00230c] text-[#FFC700] font-bold text-2xl sm:text-3xl flex items-center justify-center">
                  {initials}
                </div>
              )}
            </div>

            {/* Google Icon Badge if signed in via Google */}
            {userInfo.isGoogle && (
              <div
                className="absolute -bottom-0.5 -right-0.5 bg-white p-1 rounded-full shadow-md border border-slate-200"
                title="Signed in with Google"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold tracking-wide mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Account Active</span>
          </div>

          {/* Greeting Headline */}
          <h2
            id="welcome-modal-title"
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
          >
            Welcome, {firstName}!
          </h2>

          {/* Subtext */}
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
            Assalam-o-Alaikum! We are delighted to serve you. Explore farm-fresh
            dairy, crispy fast food & sizzling BBQ prepared fresh for you.
          </p>

          {/* 3 Quick Value Highlights */}
          <div className="w-full grid grid-cols-3 gap-2 my-5 text-left">
            <div className="bg-slate-50 dark:bg-[#112417] p-2.5 rounded-2xl border border-slate-100 dark:border-emerald-900/40 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px] mb-1">
                verified
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                100% Pure
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">
                Farm Fresh
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#112417] p-2.5 rounded-2xl border border-slate-100 dark:border-emerald-900/40 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-amber-500 text-[20px] mb-1">
                bolt
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Fast Delivery
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">
                Hot & Fresh
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#112417] p-2.5 rounded-2xl border border-slate-100 dark:border-emerald-900/40 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-blue-500 text-[20px] mb-1">
                moped
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Live Tracking
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">
                Doorstep
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <button
              onClick={handleExploreMenu}
              className="w-full py-3 px-5 rounded-xl bg-[#00230c] hover:bg-[#073615] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.99]"
            >
              <span>Explore Menu & Order</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-xs transition-colors cursor-pointer"
            >
              Continue to Website
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
