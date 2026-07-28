const FEATURES = [
  { icon: "agriculture", title: "Our Own Dairy Farm", desc: "100% pure, fresh & organic dairy from our very own local farm.", color: "var(--color-secondary-brand)" },
  { icon: "spa", title: "Farm-Fresh Quality", desc: "From our farm to your plate — no middlemen, no compromises.", color: "var(--color-mint-accent)" },
  { icon: "verified", title: "Certified Pure", desc: "Every batch tested and verified for purity.", color: "var(--color-primary)" },
];

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-[130px] mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-20">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-secondary-brand)]">
            Our Story
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-primary)]">
            Straight from Our <span className="text-[var(--color-secondary-brand)]">Own Farm</span> to Your Table
          </h2>
          <p className="mt-5 text-[var(--color-on-surface-variant)] leading-relaxed">
            Azlan Dairy Restaurant is proudly owned by <strong className="text-[var(--color-primary)]">Azlan Dairy</strong> —
            a local dairy farm dedicated to delivering 100% pure, fresh, and organic dairy products.
            From our farm in Malir to your doorstep, we ensure every dish is made with farm-fresh milk,
            cream, and ingredients — untouched by preservatives or middlemen.
          </p>
          <p className="mt-3 text-[var(--color-on-surface-variant)] leading-relaxed">
            Our restaurant brings the wholesome goodness of our own farm to your plate through a menu
            crafted with passion: from char-grilled BBQ to crispy broast, juicy burgers, and creamy dairy
            specialties — all prepared with the same purity our farm stands for.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-[var(--color-surface-container-lowest)] border border-[var(--color-surface-variant)] lift-on-hover"
            >
              <div
                className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${f.color} 20%, transparent)`, color: f.color }}
              >
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <div>
                <p className="font-bold">{f.title}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
