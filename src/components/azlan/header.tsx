"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { AuthModal } from "./auth-modal";
import { getCurrentUser, signOut, onAuthStateChange } from "@/lib/supabase/auth";
import { toast } from "sonner";

const CATEGORIES = [
  "Signature",
  "Broast",
  "Burgers",
  "Rolls & Wraps",
  "BBQ",
  "Sides",
  "Beverages",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } } | null>(null);
  const totalItems = useCart((s) => s.totalItems());
  const openCart = useCart((s) => s.open);
  const hasHydrated = useCart((s) => s._hasHydrated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Check auth state on mount and listen for changes
  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
    }).catch(() => {
      setUser(null);
    });

    const subscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleAuthSuccess = (userId: string) => {
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setShowAuthModal(false);
    });
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-shadow duration-300
        ${scrolled ? "custom-shadow-lg" : "shadow-sm"}
        bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-md border-b border-[var(--color-outline-variant)]/50`}
    >
      <div className="relative mx-auto flex h-[64px] max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo + Brand */}
        <Link href="/" className="group flex items-center gap-3 shrink-0 py-1">
          <div className="relative flex items-center justify-center shrink-0">
            <img
              src="/images/logo.png"
              alt="Azlan Fast Food and B B Q point logo"
              width={42}
              height={42}
              className="h-10 sm:h-11 w-10 sm:w-11 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:ring-[var(--color-primary)]/50"
            />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span
              className="text-base sm:text-lg font-black tracking-tight text-[var(--color-primary)] leading-none uppercase"
              style={{ letterSpacing: "-0.01em" }}
            >
              Azlan
            </span>
            <span
              className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-secondary-brand)] leading-none mt-1 group-hover:text-[var(--color-primary)] transition-colors"
            >
              Fast Food and B B Q point
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-sm font-medium text-[var(--color-on-surface-variant)]">
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
            Home
          </Link>
          <Link href="#menu" className="hover:text-[var(--color-primary)] transition-colors">
            Our Menu
          </Link>
          <Link href="#about" className="hover:text-[var(--color-primary)] transition-colors">
            About Us
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Auth Button or User Profile */}
          {user ? (
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors"
                aria-label="User menu"
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="material-symbols-outlined text-[20px] text-[var(--color-on-surface-variant)]">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)] shadow-lg border border-[var(--color-outline-variant)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="py-2">
                  <Link
                    href="/profile/edit"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    Edit Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                    My Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
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
              className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-container)] transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span className="hidden sm:inline">Login / Sign Up</span>
            </button>
          )}

          <Link
            href="/cart"
            className="relative p-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors"
            aria-label="View cart"
          >
            <span className="material-symbols-outlined text-[22px] text-[var(--color-on-surface)]">
              shopping_cart
            </span>
            {hasHydrated && totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary-brand)] text-[10px] font-bold text-white px-1 animate-soft-pulse">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-[22px] text-[var(--color-on-surface)]">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="w-80 max-w-[85vw] h-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] p-6 shadow-2xl animate-slide-left slim-scrollbar overflow-y-auto flex flex-col justify-between border-l border-[var(--color-outline-variant)]/50">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-outline-variant)]/40">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-extrabold text-lg text-[var(--color-primary)] uppercase tracking-tight">
                    Navigation
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
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
                  href="#menu"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">restaurant_menu</span>
                  Our Menu
                </Link>
                <Link
                  href="#about"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">info</span>
                  About Us
                </Link>
              </nav>
            </div>

            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-[var(--color-outline-variant)]/40 mt-6">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/30">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
