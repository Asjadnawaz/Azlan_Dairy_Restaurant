"use client";

const TRUST_BADGES = [
  {

    icon: "lunch_dining",
    title: "100% Fresh Ingredients",
    desc: "Every burger, pizza & roll made with premium-quality produce.",
    accent: "var(--color-mint-accent)",
  },
  {
    icon: "bolt",
    title: "Fast Hot Delivery",
    desc: "From our kitchen to your door — piping hot, every time.",
    accent: "var(--color-cta-yellow)",
  },
  {
    icon: "sanitizer",
    title: "Hygiene Certified",
    desc: "A spotless kitchen and safe food handling — always.",
    accent: "var(--color-mint-accent)",
  },
  {
    icon: "map",
    title: "Live Order Tracking",
    desc: "Know exactly where your order is, in real time.",
    accent: "var(--color-cta-yellow)",
  },
];

export function TrustSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, #0a3318 60%, #1a1030 100%)",
      }}
    >
      {/* Subtle top border line */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-mint-accent), var(--color-cta-yellow), var(--color-mint-accent), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-10 md:py-14">
        {/* Section label */}
        <p className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-mint-accent)] mb-8 opacity-80">
          Why Choose Azlan Dairy Restaurant
        </p>

        {/* Badges grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TRUST_BADGES.map((b, i) => (
            <div
              key={b.title}
              className="group relative flex flex-col items-start gap-3 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  i % 2 === 0
                    ? "rgba(163,210,169,0.35)"
                    : "rgba(254,216,53,0.35)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(255,255,255,0.08)";
              }}
            >
              {/* Icon circle */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                style={{
                  background: `${b.accent}18`,
                  border: `1.5px solid ${b.accent}40`,
                }}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ color: b.accent }}
                >
                  {b.icon}
                </span>
              </div>

              {/* Text */}
              <div className="flex flex-col gap-1">
                <p
                  className="font-extrabold text-sm sm:text-base text-white leading-snug"
                >
                  {b.title}
                </p>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subtle bottom border line */}
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </section>
  );
}
