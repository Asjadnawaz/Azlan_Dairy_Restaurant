const TRUST_BADGES = [
  { icon: "verified", title: "Pure Quality", desc: "Premium ingredients, every time." },
  { icon: "sanitizer", title: "Hygiene First", desc: "Clean kitchen, safe food." },
  { icon: "delivery_dining", title: "Express Delivery", desc: "Hot food at your door." },
  { icon: "restaurant_menu", title: "Easy Ordering", desc: "Order in under a minute." },
];

export function TrustSection() {
  return (
    <section className="bg-[var(--color-primary)] text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-10 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {TRUST_BADGES.map((b) => (
          <div key={b.title} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-[var(--color-mint-accent)]">
                {b.icon}
              </span>
            </div>
            <div>
              <p className="font-bold text-sm">{b.title}</p>
              <p className="text-xs text-white/60">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
