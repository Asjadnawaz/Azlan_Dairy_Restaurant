import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Admin Login — Azlan Fast Food and B B Q point",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-primary)] relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[var(--color-mint-accent)] opacity-20 blur-[100px] animate-glow" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full bg-[var(--color-secondary-brand)] opacity-20 blur-[100px] animate-glow" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/images/logo.png"
            alt="Azlan Fast Food and B B Q point logo"
            width={72}
            height={72}
            className="mx-auto h-[72px] w-[72px] rounded-full object-cover ring-2 ring-[var(--color-mint-accent)]/40 mb-3"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Azlan Fast Food and B B Q point
          </h1>
          <p className="mt-1 text-sm text-white/60">Admin Dashboard</p>
        </div>

        {/* Login card */}
        <div className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] p-8 custom-shadow-lg animate-scale-in">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[var(--color-primary)]">lock</span>
            <h2 className="text-lg font-bold text-[var(--color-primary)]">Sign In</h2>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] animate-spin">
                progress_activity
              </span>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Authorized personnel only ·{" "}
          <a href="/" className="hover:text-white/70 underline">
            Back to site
          </a>
        </p>
      </div>
    </div>
  );
}
