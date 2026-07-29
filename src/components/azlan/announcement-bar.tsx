"use client";

export function AnnouncementBar() {
  const messages = [
    "🏆 Malir's #1 Fast Food Destination",
    "🍔 Crispy Zinger Burgers – Made Fresh Daily",
    "🍕 Cheesy Hot Pizzas – Every Slice Counts",
    "🌯 Loaded Rolls & Karahis – Bold & Flavourful",
    "⚡ Fast Hot Delivery – Exclusively in Malir",
    "🎯 Order Now & Get It at Your Door",
  ];
  const repeated = [...messages, ...messages, ...messages, ...messages];

  return (
    <div className="relative z-[60] overflow-hidden bg-[var(--color-primary)] text-white text-xs font-semibold tracking-wide py-1.5 select-none">
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((msg, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-1.5">
            {msg}
            <span className="text-[var(--color-cta-yellow)] mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
