"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { useCart } from "@/lib/cart-store";
import { AuthModal } from "./auth-modal";
import { WelcomeModal } from "./welcome-modal";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/supabase/auth";
import { isAdminUser } from "@/lib/admin";
import { toast } from "sonner";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRider, setIsRider] = useState(false);
  const totalItems = useCart((s) => s.totalItems());
  const hasHydrated = useCart((s) => s._hasHydrated);
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Handle clicks on hash-based nav links (e.g. "/#about", "/#menu").
   *
   * - If already on the homepage: scroll directly to the target element.
   * - If on another route: navigate to "/" with the hash; the
   *   HashScrollHandler component will handle scrolling once the page loads.
   * - Handles repeated clicks on the same hash link (the URL doesn't change,
   *   so we must scroll manually).
   */
  const handleHashClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const hash = href.split("#")[1];
      if (!hash) return; // Not a hash link, let default behavior handle it

      if (pathname === "/") {
        // Already on homepage — just scroll to the element
        e.preventDefault();
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
        // Update the URL hash without triggering navigation
        window.history.replaceState(null, "", `/#${hash}`);
      } else {
        // On a different route — let Next.js navigate to "/"
        // The HashScrollHandler will pick up the hash after the page renders
        // We don't preventDefault here — Next.js Link handles the navigation
      }
    },
    [pathname]
  );

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 10;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const checkUserRole = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setIsRider(false);
      return;
    }
    setUser(currentUser);

    if (currentUser.user_metadata?.role === 'rider' || currentUser.app_metadata?.role === 'rider') {
      setIsRider(true);
      return;
    }

    try {
      const res = await fetch("/api/auth/sync-profile", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.role === "rider") {
          setIsRider(true);
          return;
        }
      }
    } catch {
      // fallback
    }
    setIsRider(false);
  }, []);

  // Check auth state on mount and listen for changes
  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      void checkUserRole(currentUser);
    }).catch(() => {
      setUser(null);
      setIsRider(false);
    });

    const subscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void checkUserRole(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRider(false);
        if (pathname.startsWith("/rider") || pathname.startsWith("/admin")) {
          router.push("/");
          router.refresh();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserRole, pathname, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsRider(false);
      toast.success("Logged out successfully");
      if (pathname.startsWith("/rider") || pathname.startsWith("/admin")) {
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Failed to logout");
    }
  };

  const handleAuthSuccess = () => {
    void getCurrentUser()
      .then((currentUser) => {
        void checkUserRole(currentUser);
        setShowAuthModal(false);
      })
      .catch(() => toast.error("Unable to refresh your profile."));
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300
        ${scrolled
          ? "shadow-[0_4px_24px_-4px_rgba(0,35,12,0.12)] border-b border-[var(--color-primary)]/10"
          : "shadow-none border-b border-transparent"
        }
        bg-white/90 backdrop-blur-xl`}
      >
        <div className="relative mx-auto flex h-[clamp(3.5rem,17vw,4.5rem)] max-w-7xl items-center justify-between gap-2 px-[clamp(0.625rem,4vw,1rem)] md:h-[72px] md:px-8">

          {/* ── LOGO + BRAND ── */}
          <Link href="/" className="group flex min-w-0 items-center gap-[clamp(0.45rem,2.5vw,0.875rem)] shrink">
            {/* Glow-halo logo container */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* Ambient glow ring */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-emerald-500/30 to-amber-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Image
                src="/images/logo.png"
                alt="Azlan Fast Food and BBQ point"
                width={48}
                height={48}
                sizes="48px"
                className="relative h-[clamp(2rem,11vw,3rem)] w-[clamp(2rem,11vw,3rem)] rounded-full object-cover ring-2 ring-white shadow-md group-hover:shadow-emerald-200 group-hover:scale-[1.06] transition-all duration-300"
              />
            </div>

            {/* Typography block */}
            <div className="flex min-w-0 flex-col justify-center leading-none gap-[clamp(0.15rem,1vw,0.3125rem)]">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-integral text-[clamp(1rem,6vw,1.5rem)] tracking-wide text-[var(--color-primary)] leading-none uppercase group-hover:text-emerald-800 transition-colors duration-300">
                  Azlan
                </span>
                {/* Gold accent pip — luxury detail */}
                <span className="w-[6px] h-[6px] rounded-full bg-[#FFC700] shadow-sm shrink-0 mb-0.5" />
              </div>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.22em] text-slate-500 leading-none group-hover:text-slate-700 transition-colors duration-300 whitespace-nowrap">
                Fast Food & BBQ Point
              </span>
            </div>
          </Link>

          {/* ── DESKTOP NAV LINKS ── */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
            {[
              { label: "Home",     href: "/" },
              { label: "Our Menu", href: "/#menu" },
              { label: "About Us", href: "/#about" },
              { label: "Privacy Policy", href: "/privacy-policy" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={href.includes("#") ? (e) => handleHashClick(e, href) : undefined}
                className="relative px-4 py-2 text-base font-semibold text-slate-600 rounded-lg hover:text-[var(--color-primary)] hover:bg-emerald-50/80 transition-all duration-200 group/nav"
              >
                {label}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[2px] w-0 rounded-full bg-[var(--color-primary)] group-hover/nav:w-4 transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* ── ACTIONS ── */}
          <div className="flex shrink-0 items-center gap-[clamp(0.125rem,1.5vw,0.375rem)]">
            {/* Auth Button or User Profile */}
            <div className="hidden md:block">
            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-slate-200 hover:border-[var(--color-primary)]/30 hover:bg-emerald-50/60 transition-all duration-200"
                  aria-label="User menu"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="Profile" width={32} height={32} sizes="32px" className="w-8 h-8 rounded-full object-cover ring-1 ring-white" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm ring-1 ring-emerald-700/20">
                      {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-semibold text-slate-700">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    expand_more
                  </span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                  <div className="py-1.5">
                    {isAdminUser(user) && (
                      <Link
                        href="/admin/orders"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">
                          admin_panel_settings
                        </span>
                        Admin Dashboard
                      </Link>
                    )}
                    {(isRider || user?.user_metadata?.role === 'rider' || user?.app_metadata?.role === 'rider') && (
                      <Link
                        href="/rider"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">
                          two_wheeler
                        </span>
                        Rider Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile/edit"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[var(--color-primary)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">person</span>
                      Edit Profile
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[var(--color-primary)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">shopping_bag</span>
                      My Orders
                    </Link>
                    <div className="my-1 mx-3 border-t border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-shine px-4 py-2 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-emerald-800 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 shadow-sm shadow-emerald-900/20"
              >
                <span className="material-symbols-outlined text-[17px]">person</span>
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-[clamp(0.4rem,2.5vw,0.625rem)] rounded-full hover:bg-emerald-50 transition-all duration-200 group/cart"
              aria-label="View cart"
            >
              <span className="material-symbols-outlined text-[clamp(1.05rem,5.5vw,1.375rem)] text-slate-600 group-hover/cart:text-[var(--color-primary)] transition-colors">
                shopping_cart
              </span>
              {hasHydrated && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC700] text-[10px] font-black text-[#00230C] px-1 shadow-sm animate-soft-pulse">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-[clamp(0.4rem,2.5vw,0.625rem)] rounded-full hover:bg-emerald-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[clamp(1.05rem,5.5vw,1.375rem)] text-slate-600">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/65 animate-fade-in lg:hidden flex justify-end transform-gpu"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="w-80 max-w-[85vw] h-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] p-6 shadow-2xl animate-slide-left slim-scrollbar overflow-y-auto flex flex-col justify-between border-l border-[var(--color-outline-variant)]/50 transform-gpu">
            <div>
              {/* Drawer header — branded */}
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Image
                      src="/images/logo.png"
                      alt="Azlan Logo"
                      width={44}
                      height={44}
                      sizes="44px"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FFC700] ring-2 ring-white" />
                  </div>
                  <div className="flex flex-col leading-none gap-[4px]">
                    <span className="font-integral text-[18px] tracking-wide text-[var(--color-primary)] leading-none uppercase">
                      Azlan
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Fast Food & BBQ Point
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              {/* Links */}
              <nav className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">home</span>
                  Home
                </Link>
                <Link
                  href="/#menu"
                  onClick={(e) => { handleHashClick(e, "/#menu"); setMobileOpen(false); }}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">restaurant_menu</span>
                  Our Menu
                </Link>
                <Link
                  href="/#about"
                  onClick={(e) => { handleHashClick(e, "/#about"); setMobileOpen(false); }}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">info</span>
                  About Us
                </Link>
                <Link
                  href="/privacy-policy"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">policy</span>
                  Privacy Policy
                </Link>
              </nav>
            </div>

            {/* Mobile Auth Section */}
            <div className="md:hidden pt-4 border-t border-[var(--color-outline-variant)]/40 mt-6">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/30">
                    {user.user_metadata?.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt="Profile" width={36} height={36} sizes="36px" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
                        {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-[var(--color-on-surface)]">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {isAdminUser(user) && (
                    <Link
                      href="/admin/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">admin_panel_settings</span>
                      Admin Dashboard
                    </Link>
                  )}
                  {(isRider || user?.user_metadata?.role === 'rider' || user?.app_metadata?.role === 'rider') && (
                    <Link
                      href="/rider"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">two_wheeler</span>
                      Rider Dashboard
                    </Link>
                  )}
                  <Link
                    href="/profile/edit"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">person</span>
                    Edit Profile
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">shopping_bag</span>
                    My Orders
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setMobileOpen(false); }}
                  className="w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-[var(--color-primary-container)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal & Welcome Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      <WelcomeModal />
    </>
  );
}
