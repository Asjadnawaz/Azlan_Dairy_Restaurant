"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Section {
  id: string;
  number: string;
  title: string;
  icon: string;
}

const SECTIONS: Section[] = [
  { id: "overview", number: "01", title: "Overview & Corporate Scope", icon: "corporate_fare" },
  { id: "information-we-collect", number: "02", title: "Information We Collect", icon: "fact_check" },
  { id: "delivery-gps", number: "03", title: "Delivery GPS & Location Data", icon: "distance" },
  { id: "how-we-use-data", number: "04", title: "How We Use Your Information", icon: "psychology" },
  { id: "data-security", number: "05", title: "Data Security & Storage", icon: "security" },
  { id: "third-parties", number: "06", title: "Third-Party Service Providers", icon: "hub" },
  { id: "cookies", number: "07", title: "Cookies & Local Storage", icon: "cookie" },
  { id: "your-rights", number: "08", title: "Your Privacy Rights & Controls", icon: "verified_user" },
  { id: "data-retention", number: "09", title: "Data Retention & Disposal", icon: "inventory_2" },
  { id: "children-privacy", number: "10", title: "Children's Privacy Protection", icon: "family_restroom" },
  { id: "contact-jurisdiction", number: "11", title: "Contact Us & Governing Law", icon: "gavel" },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  // Track active section for table of contents
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -100;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-br from-[#00230c] via-[#053a15] to-[#001708] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-950 overflow-hidden">
        {/* Subtle decorative background patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#4ade80_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-emerald-200/80 uppercase tracking-wider">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-emerald-400">Legal & Transparency</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold uppercase tracking-widest mb-4 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Official Corporate Policy
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                Privacy &amp; Data <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-200 to-white">
                  Protection Policy
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base md:text-lg text-emerald-100/90 leading-relaxed max-w-2xl font-medium">
                How <strong>Azlan Fast Food &amp; BBQ Point</strong> (a food division of <strong>Azlan Dairy</strong>) responsibly collects, safeguards, and respects your personal details, delivery locations, and ordering preferences in Malir, Karachi.
              </p>
            </div>

            {/* Meta & Print Actions */}
            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-6 text-xs text-emerald-200">
                  <span className="font-medium">Version:</span>
                  <span className="font-black text-white">2.5 (Revised)</span>
                </div>
                <div className="flex items-center justify-between gap-6 text-xs text-emerald-200">
                  <span className="font-medium">Effective Date:</span>
                  <span className="font-black text-amber-300">October 15, 2026</span>
                </div>
                <div className="flex items-center justify-between gap-6 text-xs text-emerald-200">
                  <span className="font-medium">Scope:</span>
                  <span className="font-black text-white">Web, Delivery &amp; In-Store</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print / Save Policy
              </button>
            </div>
          </div>

          {/* At A Glance Highlights Bar */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <div className="flex items-center gap-2.5 text-amber-400 mb-1.5 font-black text-sm">
                <span className="material-symbols-outlined text-[20px]">no_sim</span>
                Zero Data Selling
              </div>
              <p className="text-xs text-emerald-100/80 leading-snug">
                We never sell, rent, or trade your telephone or personal information to third-party ad networks.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <div className="flex items-center gap-2.5 text-emerald-300 mb-1.5 font-black text-sm">
                <span className="material-symbols-outlined text-[20px]">pin_drop</span>
                Accurate Delivery Only
              </div>
              <p className="text-xs text-emerald-100/80 leading-snug">
                GPS pin coordinates are captured solely to dispatch our riders and compute live road distance.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <div className="flex items-center gap-2.5 text-blue-300 mb-1.5 font-black text-sm">
                <span className="material-symbols-outlined text-[20px]">encrypted</span>
                Encrypted Storage
              </div>
              <p className="text-xs text-emerald-100/80 leading-snug">
                Data is housed in PostgreSQL with Row-Level Security (RLS) and strict cryptographic password hashing.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-2xl">
              <div className="flex items-center gap-2.5 text-purple-300 mb-1.5 font-black text-sm">
                <span className="material-symbols-outlined text-[20px]">person_remove</span>
                Customer Rights
              </div>
              <p className="text-xs text-emerald-100/80 leading-snug">
                You retain full rights to inspect, update, anonymize, or permanently delete your account &amp; phone history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout (12-col grid with sticky Table of Contents) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sticky Left Navigation (Desktop) */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Table of Contents
                  </h2>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    11 Sections
                  </span>
                </div>

                <nav className="space-y-1">
                  {SECTIONS.map((sec) => {
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                          isActive
                            ? "bg-[var(--color-primary)] text-white shadow-xs font-black"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[10px] font-mono font-bold ${isActive ? "text-emerald-200" : "text-slate-400"}`}>
                            {sec.number}
                          </span>
                          <span className="truncate">{sec.title}</span>
                        </div>
                        <span className={`material-symbols-outlined text-[16px] transition-transform ${
                          isActive ? "translate-x-0.5 text-amber-300" : "text-slate-300 group-hover:text-slate-500"
                        }`}>
                          chevron_right
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Direct Support Card in Sidebar */}
              <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-emerald-800/40">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">support_agent</span>
                  Privacy Officer
                </div>
                <h3 className="font-black text-sm text-white mb-2">
                  Questions About Your Data?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Need an immediate data deletion or an archive of your past orders? Reach out directly to our management.
                </p>
                <div className="space-y-2">
                  <a
                    href="https://wa.me/923000000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    WhatsApp Privacy Desk
                  </a>
                  <Link
                    href="/#menu"
                    className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
                    Return to Food Menu
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Legal Sections Body */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-10">
            {/* 01. Overview */}
            <article id="overview" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  01
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Introduction</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Overview &amp; Corporate Scope
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                Welcome to <strong>Azlan Fast Food &amp; BBQ Point</strong>. We operate the digital ordering platform accessible via <strong>azlanfastfood.com</strong> and associated mobile web interfaces. 
                Our fast food, pizza, burger, roll, and charcoal BBQ operations are an official commercial division of <strong>Azlan Dairy</strong>, located at Main Khokhrapar No. 2.5, Malir, Karachi, Pakistan.
              </p>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 text-emerald-950 text-xs sm:text-sm leading-relaxed">
                <strong>Corporate Identity:</strong> Whenever this document references &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or &ldquo;Azlan&rdquo;, it refers to Azlan Fast Food &amp; BBQ Point and its parent entity, Azlan Dairy. This policy applies to all customers who visit our site, browse our menu, place pickup or home delivery orders, register customer accounts, or submit culinary feedback.
              </div>
            </article>

            {/* 02. Information We Collect */}
            <article id="information-we-collect" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  02
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Data Inventory</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Information We Collect
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                To process your food orders swiftly, bake fresh pizzas, verify payment, and dispatch riders to your exact street, we collect only the necessary data points:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">badge</span>
                    Customer Identity &amp; Contact
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong>Customer Name:</strong> To address receipts and verify deliveries.</li>
                    <li><strong>Phone Number:</strong> Essential for rider calls, delivery address coordination, and WhatsApp order alerts.</li>
                    <li><strong>Email Address:</strong> Used for automated order invoices, receipts, and optional password recovery.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">home_pin</span>
                    Delivery &amp; Physical Address
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong>Street Address &amp; House Number:</strong> Physical description of your building or landmarks in Malir.</li>
                    <li><strong>Delivery Instructions:</strong> Gate codes, floor numbers, or instructions such as &ldquo;call upon arrival&rdquo;.</li>
                    <li><strong>Map Coordinates (Lat / Long):</strong> Exact pinpoint selected on our interactive Leaflet map.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">receipt_long</span>
                    Order &amp; Transaction Details
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong>Item Selections &amp; Sizes:</strong> Specific pizzas, burger flavors, and quantities chosen.</li>
                    <li><strong>Financial Totals:</strong> Line totals, applied discount coupons, and distance-based delivery fees.</li>
                    <li><strong>Payment Method:</strong> Cash on Delivery (COD) or verified electronic transfer. We do not store sensitive bank PINs or credit card CVVs.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">rate_review</span>
                    Verified Customer Reviews
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong>Food Ratings:</strong> 1 to 5 star scores for specific dishes.</li>
                    <li><strong>Public Comments:</strong> Taste feedback (customer names are automatically shortened to initial like &ldquo;Ahmed K.&rdquo; for public privacy).</li>
                    <li><strong>Phone numbers:</strong> Used strictly internally to verify the reviewer was a real customer who completed an order.</li>
                  </ul>
                </div>
              </div>
            </article>

            {/* 03. Delivery GPS */}
            <article id="delivery-gps" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  03
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Geolocation</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Delivery GPS &amp; Location Data Policy
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                Our checkout incorporates an interactive map powered by OpenStreetMap and Leaflet. When you tap to choose a delivery location:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">location_searching</span>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>No Background Geolocation Tracking:</strong> We never track your location when you are simply browsing or when our tab is closed. Location lookup only triggers if you tap the &ldquo;Use Current Location&rdquo; button on the map.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">route</span>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>Distance-Based Delivery Calculation:</strong> The coordinate pin is used by our server route to calculate exact road distance from our kitchen (Khokhrapar No. 2.5, Malir) so you are billed a transparent, fair delivery fee (e.g., PKR 60 base up to 2 km + PKR 25 per additional km).
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0 mt-0.5">delivery_dining</span>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>Rider Navigation Only:</strong> Once dispatched, the coordinates are shared only with the assigned Azlan delivery rider to guide their delivery vehicle to your door.
                  </div>
                </div>
              </div>
            </article>

            {/* 04. How We Use Data */}
            <article id="how-we-use-data" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  04
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Processing Purpose</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    How We Use Your Information
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                We adhere strictly to data minimization principles. Personal data is utilized exclusively for genuine operational requirements:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Order Preparation:</strong> Transmitting ticket lines to kitchen display screens and thermal order printers.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Rider Coordination:</strong> Enabling delivery riders to phone you when at your gate.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Invoice Generation:</strong> Generating printable PDF invoices and emailing receipts via Resend.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Account Continuity:</strong> Allowing logged-in users to review past orders and quickly reorder favorites.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Store Quality Auditing:</strong> Reviewing prep times and customer reviews to maintain dairy and food freshness.</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px] shrink-0">check_circle</span>
                  <span><strong>Security &amp; Fraud Prevention:</strong> Preventing malicious order spam, abusive prank requests, and unauthorized logins.</span>
                </div>
              </div>
            </article>

            {/* 05. Data Security */}
            <article id="data-security" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  05
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cybersecurity</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Data Security &amp; Storage Architecture
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                We invest in enterprise-grade architecture to ensure customer records cannot be intercepted or manipulated:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h3 className="font-black text-sm text-slate-900 mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">database</span>
                    Supabase PostgreSQL &amp; Row Level Security (RLS)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Our database enforces strict Row-Level Security (RLS) policies at the PostgreSQL kernel level. A customer can only query their own orders. Administrative mutations and rider status changes require cryptographically verified server-side tokens.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h3 className="font-black text-sm text-slate-900 mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">lock</span>
                    Encryption In Transit &amp; At Rest
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All network traffic between your web browser and our servers is strictly encrypted using TLS 1.3 with HTTPS enforcement, HSTS, and Content Security Policies. Passwords are never stored in plaintext and are processed via Bcrypt hashing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h3 className="font-black text-sm text-slate-900 mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">shield_person</span>
                    Role-Based Isolation
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kitchen operators and riders receive limited access views. A delivery rider only sees customer information for orders actively assigned to them on shift, preventing customer list dumps or unauthorized browsing.
                  </p>
                </div>
              </div>
            </article>

            {/* 06. Third Parties */}
            <article id="third-parties" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  06
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sub-processors</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Third-Party Service Providers
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                To guarantee high uptime and reliable food delivery, we partner with specialized cloud infrastructure providers. Each vendor processes data under contractual privacy safeguards:
              </p>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-800 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Function</th>
                      <th className="p-3.5">Shared Data</th>
                      <th className="p-3.5">Data Privacy Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900">Supabase Inc.</td>
                      <td className="p-3.5 text-slate-600">Database hosting, auth &amp; realtime messaging</td>
                      <td className="p-3.5 text-slate-600">Encrypted user profiles, orders &amp; menu items</td>
                      <td className="p-3.5">
                        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">
                          supabase.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900">Resend Inc.</td>
                      <td className="p-3.5 text-slate-600">Transactional email delivery</td>
                      <td className="p-3.5 text-slate-600">Recipient email, order receipt copy, customer name</td>
                      <td className="p-3.5">
                        <a href="https://resend.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">
                          resend.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900">OpenStreetMap / Leaflet</td>
                      <td className="p-3.5 text-slate-600">Interactive map tiles &amp; distance calculation</td>
                      <td className="p-3.5 text-slate-600">Delivery pin coordinates (Lat/Long) only</td>
                      <td className="p-3.5">
                        <a href="https://wiki.openstreetmap.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">
                          osm.org/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900">Google OAuth</td>
                      <td className="p-3.5 text-slate-600">Optional one-tap social login</td>
                      <td className="p-3.5 text-slate-600">Verified email address, full name, profile photo</td>
                      <td className="p-3.5">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">
                          policies.google.com
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* 07. Cookies & Local Storage */}
            <article id="cookies" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  07
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Client Storage</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Cookies &amp; Local Storage Disclosure
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                We do not employ intrusive tracking pixels or third-party marketing cookies. Our platform utilizes strictly necessary cookies and local storage tokens:
              </p>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-800 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Token / Storage Key</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Functional Purpose</th>
                      <th className="p-3.5">Lifespan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3.5 font-mono text-emerald-800 font-bold">azlan-cart-storage</td>
                      <td className="p-3.5 text-slate-600">Local Storage</td>
                      <td className="p-3.5 text-slate-600">Persists your selected pizzas, burgers, and quantities across tab reloads</td>
                      <td className="p-3.5 text-slate-600">Until cleared by user</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-mono text-emerald-800 font-bold">azlan_recent_orders</td>
                      <td className="p-3.5 text-slate-600">Local Storage</td>
                      <td className="p-3.5 text-slate-600">Allows guest users to track their last 5 orders without creating an account</td>
                      <td className="p-3.5 text-slate-600">30 days</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-mono text-emerald-800 font-bold">admin_auth</td>
                      <td className="p-3.5 text-slate-600">HTTP-Only Cookie</td>
                      <td className="p-3.5 text-slate-600">Protects manager dashboard access with cryptographic session signatures</td>
                      <td className="p-3.5 text-slate-600">24 hours</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-mono text-emerald-800 font-bold">rider_auth</td>
                      <td className="p-3.5 text-slate-600">HTTP-Only Cookie</td>
                      <td className="p-3.5 text-slate-600">Authorizes delivery riders to access shift manifests</td>
                      <td className="p-3.5 text-slate-600">24 hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* 08. Your Privacy Rights */}
            <article id="your-rights" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  08
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Control &amp; Autonomy</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Your Privacy Rights &amp; Controls
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                You possess full ownership of your personal profile. Under applicable privacy principles, you are entitled to:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">visibility</span>
                    Right to Access &amp; Portability
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Request an export of all recorded orders, customer delivery locations, and ratings tied to your mobile number.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">edit_note</span>
                    Right to Rectification
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Update incorrect telephone numbers, delivery notes, or email addresses through your profile or customer support.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-600">delete_forever</span>
                    Right to Erasure (&ldquo;Be Forgotten&rdquo;)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Instruct us to permanently wipe your registered account, addresses, and anonymize order logs.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">unsubscribe</span>
                    Opt-out of Communications
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We only send transactional food updates. We do not spam promotional marketing SMS messages.
                  </p>
                </div>
              </div>
            </article>

            {/* 09. Data Retention */}
            <article id="data-retention" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  09
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Lifecycle</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Data Retention &amp; Disposal
                  </h2>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed space-y-2">
                <p className="font-bold">Retention Schedule by Category:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-amber-900/90">
                  <li><strong>Active Orders:</strong> Maintained in realtime status for 24 hours until delivery completion.</li>
                  <li><strong>Financial &amp; Delivery Invoices:</strong> Retained for 3 to 7 years in compliance with Sindh Revenue Board (SRB) and sales tax audit standards.</li>
                  <li><strong>Customer Accounts:</strong> Stored indefinitely until customer requests voluntary deletion.</li>
                  <li><strong>Browser Cart Storage:</strong> Stored strictly client-side on your device and purged when you checkout or clear browser cache.</li>
                </ul>
              </div>
            </article>

            {/* 10. Children's Privacy */}
            <article id="children-privacy" className="scroll-mt-28 bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-primary)] font-black text-sm flex items-center justify-center">
                  10
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Minors</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Children&rsquo;s Privacy Protection
                  </h2>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed font-medium">
                Our food ordering platform is intended for individuals who have reached legal age to enter binding agreements in Pakistan (or with parental consent for Cash on Delivery). We do not knowingly solicit personal data from children under 13. If you believe a minor has submitted personal information without supervision, notify us immediately to delete the records.
              </p>
            </article>

            {/* 11. Contact & Jurisdiction */}
            <article id="contact-jurisdiction" className="scroll-mt-28 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                  11
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Official Channels</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Contact Us &amp; Legal Jurisdiction
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-400 shrink-0 text-[20px] mt-0.5">location_on</span>
                    <div>
                      <strong className="text-white block mb-0.5">Physical Kitchen &amp; Restaurant:</strong>
                      Azlan Fast Food &amp; BBQ Point (Azlan Dairy)<br />
                      Main Khokhrapar No. 2.5, Malir, Karachi, Sindh, Pakistan.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-400 shrink-0 text-[20px] mt-0.5">schedule</span>
                    <div>
                      <strong className="text-white block mb-0.5">Operating Hours:</strong>
                      Daily from 7:00 PM to 3:00 AM (PST)
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-400 shrink-0 text-[20px] mt-0.5">alternate_email</span>
                    <div>
                      <strong className="text-white block mb-0.5">Official Website:</strong>
                      <a href="https://azlanfastfood.com" className="text-emerald-300 hover:underline">
                        https://azlanfastfood.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <strong className="text-white block text-sm">Governing Law &amp; Dispute Resolution</strong>
                  <p className="leading-relaxed text-slate-300">
                    This Privacy Policy is governed by and construed in accordance with the laws of the Islamic Republic of Pakistan and the province of Sindh. Any dispute, claim, or action arising under or in connection with this policy shall be subject to the exclusive jurisdiction of the civil and consumer courts of Karachi, Pakistan.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                <p>© {new Date().getFullYear()} Azlan Fast Food &amp; BBQ Point. An Azlan Dairy brand. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  <Link href="/#menu" className="text-emerald-400 font-bold hover:underline">Browse Menu</Link>
                  <span>•</span>
                  <Link href="/cart" className="text-emerald-400 font-bold hover:underline">View Cart</Link>
                  <span>•</span>
                  <Link href="/orders" className="text-emerald-400 font-bold hover:underline">Track Order</Link>
                </div>
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
