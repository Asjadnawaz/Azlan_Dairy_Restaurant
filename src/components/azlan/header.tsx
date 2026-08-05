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
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const totalItems = useCart((s) => s.totalItems());
  const openCart = useCart((s) => s.open);

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
    <header
      className={`sticky top-0 z-50 w-full transition-shadow duration-300
        ${scrolled ? "custom-shadow-lg" : "shadow-sm"}
        bg-[var(--color-surface-container-lowest)]/90 backdrop-blur-md`}
    >
      <div className="relative mx-auto flex h-[57px] max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/images/logo.png"
            alt="Azlan Dairy Restaurant logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--color-mint-accent)]/40 shrink-0"
          />
          <span className="flex flex-col leading-none gap-1.5">
            <span
              className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-primary)] leading-none"
              style={{ letterSpacing: "-0.02em" }}
            >
              Azlan Dairy
            </span>
            <span
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-secondary-brand)] leading-none -mt-0.5"
            >
              Fast Food & B B Q point
            </span>
          </span>
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
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
                  {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
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

          <button
            onClick={openCart}
            className="relative p-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors"
            aria-label="Open cart"
          >
            <span className="material-symbols-outlined text-[22px] text-[var(--color-on-surface)]">
              shopping_cart
            </span>
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary-brand)] text-[10px] font-bold text-white px-1 animate-soft-pulse">
                {totalItems}
              </span>
            )}
          </button>

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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-[var(--color-inverse-surface)]/50 animate-fade-in lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="ml-auto w-80 h-full bg-[var(--color-surface-container-lowest)] p-6 animate-slide-up slim-scrollbar overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2" aria-label="Close">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium hover:text-[var(--color-primary)] transition-colors"
              >
                Home
              </Link>
              <Link
                href="#menu"
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium hover:text-[var(--color-primary)] transition-colors"
              >
                Our Menu
              </Link>
              <Link
                href="#about"
                onClick={() => setMobileOpen(false)}
                className="block py-2 font-medium hover:text-[var(--color-primary)] transition-colors"
              >
                About Us
              </Link>

              {/* Mobile Auth Section */}
              <div className="pt-4 mt-4 border-t border-[var(--color-outline-variant)]">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-2 py-2 bg-[var(--color-surface-container-low)] rounded-[var(--radius-md)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
                        {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {user.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link href="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:text-[var(--color-primary)]">
                      <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                      My Orders
                    </Link>
                    <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-[var(--color-error)]">
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAuthModal(true); setMobileOpen(false); }}
                    className="w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    Login / Sign Up
                  </button>
                )}
              </div>
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
    </header>
  );
}
