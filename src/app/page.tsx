import { createServerClient } from "@/lib/supabase/server";
import type { Item, Settings } from "@/lib/supabase/database.types";
import { MENU_ITEMS } from "@/data/menu-data";
import { Hero } from "@/components/azlan/hero";
import { TrustSection } from "@/components/azlan/trust-section";
import { MenuSection } from "@/components/azlan/menu-section";
import { TestimonialsSection } from "@/components/azlan/testimonials-section";
import { AboutSection } from "@/components/azlan/about-section";
import { Footer } from "@/components/azlan/footer";

export default async function Home() {
  const supabase = await createServerClient();

  const [itemsResult, settingsResult] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("is_available", true)
      .order("sort_order", { ascending: true }),
    supabase.from("settings").select("*").single(),
  ]);

  const dbItems = (itemsResult.data ?? []) as Item[];
  // If DB items are dummy or incomplete (<50 items), use full Restaurant_Menu.md menu
  const items = dbItems.length >= 50 ? dbItems : MENU_ITEMS;
  const settings = (settingsResult.data as Settings | null) ?? null;
  const isStoreActive = settings?.is_active ?? true;

  return (
    <>
      <Hero settings={settings} />
      <TrustSection />
      <MenuSection items={items} isStoreActive={isStoreActive} />
      <TestimonialsSection />
      <AboutSection />
      <Footer settings={settings} />
    </>
  );
}
