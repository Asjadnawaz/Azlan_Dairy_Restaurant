"use client";

import { usePathname } from "next/navigation";
import { StoreClosedBanner } from "@/components/azlan/store-closed-banner";
import { WelcomeStrip } from "@/components/azlan/welcome-strip";
import { Header } from "@/components/azlan/header";
import { FloatingButtons } from "@/components/azlan/floating-buttons";
import { HashScrollHandler } from "@/components/azlan/hash-scroll-handler";

/**
 * Everything that wraps a customer page. `/admin` and `/rider` have their own
 * shells, so they get none of it.
 *
 * The scrolling announcement marquee used to live here. It repeated the same
 * "Delivery 07:00 PM to 03:00 AM" sentence four times, hardcoded — contradicting
 * both the row in `settings` and the 4 AM the rest of the code used — and ran an
 * infinite animation on every page. `WelcomeStrip` replaced it: same
 * information, derived rather than typed, plus the area and payment facts the
 * old blocking welcome modal was carrying, and dismissible.
 */
export function LayoutChrome({ deliveryFee }: { deliveryFee: number }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/rider")) {
    return null;
  }

  return (
    <>
      <HashScrollHandler />
      <StoreClosedBanner />
      <Header />
      <WelcomeStrip deliveryFee={deliveryFee} />
      <FloatingButtons />
    </>
  );
}
