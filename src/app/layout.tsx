import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/azlan/theme-provider";
import { Toaster } from "sonner";
import { LayoutChrome } from "@/components/azlan/layout-chrome";
import { StoreStatusProvider } from "@/hooks/use-store-status";
import { ReviewWatcher } from "@/components/azlan/review-watcher";
import { getSettings, getStoreStatus } from "@/lib/settings.server";
import { DEFAULT_CLOSE_HOUR, DEFAULT_OPEN_HOUR } from "@/lib/store-hours";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const integralCf = localFont({
  src: "../../public/fonts/Demo_Fonts/Fontspring-DEMO-integralcf-bold.otf",
  variable: "--font-integral",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlandairy.pk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Azlan Fast Food & BBQ Point — Crispy Burgers, Pizzas & BBQ in Malir, Karachi",
    template: "%s | Azlan Fast Food & BBQ Point",
  },
  description:
    "Order piping hot Zinger burgers, cheesy pizzas, loaded rolls, and charcoal BBQ online from Azlan Fast Food & BBQ Point in Malir, Karachi. 100% fresh ingredients & fast delivery.",
  keywords: [
    "Azlan Fast Food",
    "Azlan BBQ Point",
    "Fast Food Malir Karachi",
    "Zinger Burger Malir",
    "BBQ Malir Karachi",
    "Online Food Delivery Malir",
    "Best Burger Malir",
    "Pizza Delivery Malir",
    "Azlan Dairy Restaurant",
  ],
  authors: [{ name: "Azlan Fast Food & BBQ Point" }],
  creator: "Azlan Fast Food",
  publisher: "Azlan Fast Food & BBQ Point",
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Azlan Fast Food & BBQ Point — Malir, Karachi",
    description:
      "Hot, crispy Zinger burgers, cheesy pizzas, loaded rolls & charcoal BBQ delivered fresh in Malir, Karachi.",
    url: siteUrl,
    siteName: "Azlan Fast Food & BBQ Point",
    images: [
      {
        url: `${siteUrl}/images/hero-burger.jpg`,
        width: 1200,
        height: 630,
        alt: "Azlan Fast Food & BBQ Point Menu",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Azlan Fast Food & BBQ Point — Malir, Karachi",
    description:
      "Hot, crispy Zinger burgers, cheesy pizzas, loaded rolls & charcoal BBQ delivered fresh in Malir, Karachi.",
    images: [`${siteUrl}/images/hero-burger.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/images/logo.png", type: "image/png" }],
    apple: [{ url: "/images/logo.png", type: "image/png" }],
  },
};

/** "19:00" — the 24-hour form schema.org wants for openingHours. */
function toIsoTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Cached and cookie-free (see src/lib/settings.server.ts). The previous
  // cookie-bound read here made every page in the site dynamic.
  const [settings, storeStatus] = await Promise.all([getSettings(), getStoreStatus()]);

  const openHour = settings?.open_hour ?? DEFAULT_OPEN_HOUR;
  const closeHour = settings?.close_hour ?? DEFAULT_CLOSE_HOUR;

  // Seed for the shared client-side store status. The schedule travels with the
  // status so the browser can re-derive the answer from its own clock without
  // going back to the server.
  const storeSeed = {
    status: storeStatus,
    schedule: {
      is_active: settings?.is_active ?? true,
      open_mode: settings?.open_mode ?? null,
      force_open_until: settings?.force_open_until ?? null,
      open_hour: settings?.open_hour ?? null,
      close_hour: settings?.close_hour ?? null,
    },
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    name: settings?.store_name || "Azlan Fast Food & BBQ Point",
    image: `${siteUrl}/images/hero-burger.jpg`,
    logo: `${siteUrl}/images/logo.png`,
    url: siteUrl,
    // Real values from `settings` — this used to publish a placeholder number,
    // the wrong street and 12:00–02:00 opening hours.
    telephone: settings?.phone || "+92 302 9359694",
    priceRange: "$$",
    servesCuisine: ["Fast Food", "BBQ", "Burgers", "Pizza", "Pakistani"],
    address: {
      "@type": "PostalAddress",
      streetAddress: settings?.address || "Main Khokhrapar no. 2.5",
      addressLocality: "Malir",
      addressRegion: "Karachi",
      postalCode: "75080",
      addressCountry: "PK",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 24.8967,
      longitude: 67.1956,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: toIsoTime(openHour),
        closes: toIsoTime(closeHour),
      },
    ],
    hasMenu: `${siteUrl}/#menu`,
  };

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${integralCf.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          Material Symbols is an icon font: until it arrives every icon renders
          as its ligature text ("search", "call"), so loading it non-blocking
          would look worse than the extra round trip. next/font cannot host it —
          Google Fonts does not publish it through the API next/font uses — so
          the stylesheet link stays, with a preconnect to start the fetch sooner.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <StoreStatusProvider seed={storeSeed}>
            <LayoutChrome deliveryFee={settings?.delivery_fee ?? 0} />
            <main className="flex-1">{children}</main>
            <ReviewWatcher />
          </StoreStatusProvider>
          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              duration: 3000,
              className: "azlan-brand-toast",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
