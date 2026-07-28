import type { Settings } from "@/lib/supabase/database.types";

const CATEGORIES = [
  "Signature",
  "Broast",
  "Burgers",
  "Rolls & Wraps",
  "BBQ",
  "Sides",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Footer({ settings }: { settings: Settings | null }) {
  return (
    <footer className="bg-[var(--color-primary)] text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo.png"
              alt="Azlan Dairy Restaurant logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
            />
            <h3 className="text-xl font-extrabold leading-tight">
              {settings?.store_name ?? "Azlan Dairy Restaurant"}
            </h3>
          </div>
          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Farm to Table Premium.
          </p>
        </div>

        {/* Menu links */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--color-mint-accent)]">
            Menu
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <a href={`#${slugify(c)}`} className="hover:text-white transition-colors">
                  {c}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Info */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--color-mint-accent)]">
            Information
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <a href="#about" className="hover:text-white transition-colors">About Us</a>
            </li>
            <li>
              <a href="#menu" className="hover:text-white transition-colors">Full Menu</a>
            </li>
            <li>
              <a href="/admin/orders" className="hover:text-white transition-colors">Admin Dashboard</a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--color-mint-accent)]">
            Contact
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
              <span>{settings?.address ?? "Main Khokhrapar no. 2 1/2, Malir, Karachi."}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{settings?.hours ?? "7:00 PM – 3:00 AM"}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <p>© {new Date().getFullYear()} {settings?.store_name ?? "Azlan Dairy Restaurant"}. All rights reserved.</p>
          <p>Farm to Table Premium · Karachi, Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
