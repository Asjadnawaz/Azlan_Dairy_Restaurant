import { getSettings } from "@/lib/settings.server";
import { getMenuItems } from "@/lib/menu.server";
import { Hero } from "@/components/azlan/hero";
import { TrustSection } from "@/components/azlan/trust-section";
import { MenuSection } from "@/components/azlan/menu-section";
import { TestimonialsSection } from "@/components/azlan/testimonials-section";
import { AboutSection } from "@/components/azlan/about-section";
import { Footer } from "@/components/azlan/footer";
import { getPublicReviews } from "@/lib/reviews.server";

export const dynamic = "force-dynamic";

export default async function Home() {
  // All three reads are cached and cookie-free, so this page can be prerendered
  // instead of re-rendered per request. Live changes still reach an open tab
  // through the `items` and `settings` realtime channels.
  const [items, settings, reviews] = await Promise.all([
    getMenuItems(),
    getSettings(),
    getPublicReviews(),
  ]);

  return (
    <>
      <Hero settings={settings} />
      <TrustSection />
      <MenuSection items={items} />
      <TestimonialsSection reviews={reviews} address={settings?.address ?? null} />
      <AboutSection />
      <Footer settings={settings} />
    </>
  );
}
