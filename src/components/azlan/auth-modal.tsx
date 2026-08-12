"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { isAdminUser } from "@/lib/admin";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userId: string) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const supabase = createBrowserClient();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // The redirect will handle the rest, but we'll show a message
      toast.success("Redirecting to Google...");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to sign in with Google"));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;
        toast.success("Account created! You can now place your order.");

        if (data.user) {
          onAuthSuccess(data.user.id);
          onClose();
        }
      } else {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          if (isAdminUser(data.user)) {
            toast.success("Welcome back, Admin!");
            onClose();
            router.push("/admin/orders");
            router.refresh();
            return;
          }

          toast.success("Signed in successfully!");
          onAuthSuccess(data.user.id);
          onClose();
        }
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[var(--color-inverse-surface)]/60 backdrop-blur-sm animate-fade-in"
      style={{ height: '100vh', minHeight: '100vh' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] custom-shadow-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-4">
          <h2 className="text-xl font-bold">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {isSignUp
              ? "Sign up to track your orders and get personalized service"
              : "Sign in to place your order"}
          </p>
        </div>

        {/* Google OAuth Button */}
        <div className="p-6 pt-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 rounded-full border-2 border-[var(--color-outline-variant)] bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Connecting to Google...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]"></div>
            <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-[var(--color-outline-variant)]"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow disabled:opacity-50"
            >
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}
