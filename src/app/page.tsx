import { getSettings } from "@/lib/settings.server";
import { getMenuItems } from "@/lib/menu.server";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { MenuSection } from "@/components/home/menu-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { AboutSection } from "@/components/home/about-section";
import { Footer } from "@/components/layout/footer";
import { getPublicReviews } from "@/lib/reviews.server";

// Every read below is cached and cookie-free (see lib/settings.server.ts), so
// the page can be prerendered instead of rebuilt per request. Live changes
// still reach an open tab through the `items` and `settings` realtime
// channels; server HTML may lag by at most this many seconds.
export const revalidate = 60;

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
