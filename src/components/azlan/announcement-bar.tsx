"use client";

export function AnnouncementBar() {
  const messages = [
    "🏆 Farm-to-Table Premium – Best Quality",
    "🍔 Fresh Broast – Fried to Perfection",
    "🐄 100% Pure, Fresh & Organic Dairy from Our Own Farm",
    "📍 Delivering Exclusively in Malir",
  ];
  const repeated = [...messages, ...messages, ...messages, ...messages];

  return (
    <div className="relative z-[60] overflow-hidden bg-primary text-on-primary text-xs font-semibold tracking-wide py-1.5 select-none">
      <div className="flex animate-marquee whitespace-nowrap">
        {repeated.map((msg, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-1.5">
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
