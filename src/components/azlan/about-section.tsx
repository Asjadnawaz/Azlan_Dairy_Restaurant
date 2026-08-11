const STATS = [
  { value: "2+", label: "Years Serving Malir" },
  { value: "50+", label: "Menu Items" },
  { value: "10K+", label: "Happy Local Customers" },
  { value: "100%", label: "Fresh Ingredients" },
];

const PILLARS = [
  {
    icon: "lunch_dining",
    title: "Crispy Zinger Burgers",
    desc: "Hand-breaded crispy chicken, fresh veggies, secret sauce — restaurant quality at prices everyone can afford.",
    color: "var(--color-cta-yellow)",
  },
  {
    icon: "icecream",
    title: "Fresh Ice Cream",
    desc: "Smooth, creamy, and ice-cold — our dairy-fresh ice cream is the perfect sweet finish to every meal.",
    color: "var(--color-mint-accent)",
  },
  {
    icon: "kebab_dining",
    title: "Sizzling Rolls",
    desc: "Perfectly seasoned grilled meats wrapped in soft, warm bread — bold flavours in every bite.",
    color: "var(--color-secondary-brand)",
  },
];


export function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-[80px] relative overflow-hidden"
      style={{ background: "var(--color-background)" }}
    >
      {/* Decorative top accent */}
      <div
        className="absolute top-0 inset-x-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--color-primary), var(--color-secondary-brand), var(--color-cta-yellow))",
        }}
      />

      {/* ── PART 1: Our Story ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 pt-20 pb-16 md:pt-24 md:pb-20">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">

          {/* Left: story text */}
          <div className="flex flex-col gap-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-secondary-brand)]">
              Our Story
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-[var(--color-primary)]">
              Born in Malir.{" "}
              <span className="text-[var(--color-secondary-brand)]">
                Built on Flavour.
              </span>
            </h2>
            <p className="text-base md:text-lg text-[var(--color-on-surface-variant)] leading-relaxed">
              Azlan Fast Food and B B Q point started with a simple belief: the people of
              Malir deserve <strong className="text-[var(--color-primary)]">world-class fast food</strong> made
              with real, fresh ingredients — without compromise.
            </p>
            <p className="text-base text-[var(--color-on-surface-variant)] leading-relaxed">
              From our very first Zinger Burger to today's full menu of Pizzas,
              Rolls and more, we put the same passion and care into
              every single plate. No shortcuts. No frozen shortcuts. Just bold,
              honest food cooked fresh — and delivered hot.
            </p>

            {/* Signature quote */}
            <blockquote
              className="mt-2 pl-4 py-3 border-l-4 italic text-sm text-[var(--color-on-surface-variant)]"
              style={{ borderColor: "var(--color-secondary-brand)" }}
            >
              &ldquo;We don&apos;t just serve food. We serve pride — in every bite.&rdquo;
              <br />
              <span className="not-italic font-bold text-[var(--color-primary)] text-xs uppercase tracking-wider mt-1 block">
                — Azlan, Founder
              </span>
            </blockquote>
          </div>

          {/* Right: Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center text-center p-6 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary) 0%, #0a3318 100%)",
                }}
              >
                <span
                  className="text-4xl md:text-5xl font-extrabold"
                  style={{ color: "var(--color-cta-yellow)" }}
                >
                  {s.value}
                </span>
                <span className="mt-1.5 text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-wide text-center">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PART 2: What We're Known For ── */}
      <div
        className="py-16 md:py-20"
        style={{
          background:
            "linear-gradient(160deg, var(--color-primary) 0%, #0a3318 60%, #1a1030 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-mint-accent)] mb-3">
              What We&apos;re Known For
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              The Dishes That Made Us{" "}
              <span className="text-[var(--color-cta-yellow)]">Famous</span>
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="group flex flex-col gap-4 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${p.color} 15%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${p.color} 40%, transparent)`,
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[28px]"
                    style={{ color: p.color }}
                  >
                    {p.icon}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="font-extrabold text-lg text-white leading-snug">
                    {p.title}
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <a
              href="/#menu"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-extrabold text-base transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
              style={{
                background: "var(--color-cta-yellow)",
                color: "var(--color-primary)",
                boxShadow: "0 8px 32px rgba(254,216,53,0.25)",
              }}
            >
              <span className="material-symbols-outlined text-[22px]">
                restaurant_menu
              </span>
              See Our Full Menu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
