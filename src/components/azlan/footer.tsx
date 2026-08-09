import type { Settings } from "@/lib/supabase/database.types";

const CATEGORIES = [
  "Signature",
  "Broast",
  "Burgers",
  "Rolls & Wraps",
  "BBQ",
  "Sides",
];

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/p/Aazlan-dairy-fast-foods-B-B-Q-point-61580115230642/",
    ariaLabel: "Follow us on Facebook",
    hoverBg: "hover:bg-[#1877F2]",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/azlan_dairy_fast_food_/",
    ariaLabel: "Follow us on Instagram",
    hoverBg: "hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UCBuexULFg1nRAW0x7ZhWCtg",
    ariaLabel: "Subscribe on YouTube",
    hoverBg: "hover:bg-[#FF0000]",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@talha_meo",
    ariaLabel: "Follow us on TikTok",
    hoverBg: "hover:bg-black hover:ring-1 hover:ring-cyan-400",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.07-1.3 1.8-.24.83-.06 1.78.43 2.47.53.78 1.45 1.25 2.4 1.23.94-.01 1.83-.49 2.34-1.27.42-.61.64-1.37.63-2.12V.02z" />
      </svg>
    ),
  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Footer({ settings }: { settings: Settings | null }) {
  return (
    <footer className="bg-[var(--color-primary)] text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand & Socials */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/images/logo.png"
                alt="Azlan Fast Food and B B Q point logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
              />
              <h3 className="text-xl font-extrabold leading-tight">
                Azlan Fast Food and B B Q point
              </h3>
            </div>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Farm to Table Premium fast food & charcoal BBQ.
            </p>
          </div>

          {/* Social Icons */}
          <div className="mt-6">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-mint-accent)] mb-3">
              Connect With Us
            </h4>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.ariaLabel}
                  className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 ${s.hoverBg} hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-md`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
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
              <span>{settings?.address ?? "Main Khokhrapar no. 2.5, Malir, Karachi."}</span>
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
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Azlan Fast Food and B B Q point. All rights reserved.</p>

          {/* Social Icons duplicate for bottom bar */}
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-white/40">Follow us:</span>
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.ariaLabel}
                className="text-white/60 hover:text-[var(--color-mint-accent)] transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>

          <p>Farm to Table Premium · Karachi, Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
