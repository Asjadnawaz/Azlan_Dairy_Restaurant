"use client";

export function AnnouncementBar() {
  const messages = [
    "🛵 Delivery Timings: 07:00 PM to 03:00 AM",
    "⚡ Fast Hot Delivery Daily: 7:00 PM – 3:00 AM",
    "⏰ Delivery Hours: 07:00 PM to 03:00 AM",
    "🚀 Azlan Fast Food & BBQ Point – Delivery 7:00 PM to 3:00 AM",
  ];
  const repeated = [...messages, ...messages, ...messages, ...messages];

  return (
    <div className="relative z-[60] overflow-hidden bg-[var(--color-primary)] text-white text-xs font-bold tracking-wider py-2 select-none border-b border-emerald-900/40">
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((msg, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-2">
            <span>{msg}</span>
            <span className="text-[var(--color-cta-yellow)] mx-2 font-black">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
