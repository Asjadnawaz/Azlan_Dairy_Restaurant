import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { LayoutChrome } from "@/components/layout/layout-chrome";
import { StoreStatusProvider } from "@/hooks/use-store-status";
import { ReviewWatcher } from "@/components/orders/review-watcher";
import { PwaRegister } from "@/components/pwa/pwa-register";
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

// Self-hosted subset of Material Symbols (see scripts/build-icon-font.mjs).
// `display: "block"` + same-origin preload means icons never render as their
// ligature text ("schedule", "shopping_cart") while the font loads.
const materialSymbols = localFont({
  src: "../assets/fonts/material-symbols-subset.woff2",
  variable: "--font-material-symbols",
  weight: "100 700",
  display: "block",
  adjustFontFallback: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlanfastfood.com";

export const viewport: Viewport = {
  themeColor: "#00230c",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Azlan Fast Food & BBQ Point — By Azlan Dairy | Malir, Karachi",
    template: "%s | Azlan Fast Food (Azlan Dairy)",
  },
  description:
    "Official fast food & BBQ branch of Azlan Dairy. Order piping hot Zinger burgers, cheesy pizzas, loaded rolls, and charcoal BBQ online from Azlan Fast Food & BBQ Point in Malir, Karachi. 100% fresh dairy & quality ingredients with fast delivery.",
  keywords: [
    "Azlan Dairy",
    "Azlan Dairy Restaurant",
    "Azlan Dairy Fast Food",
    "Azlan Dairy Malir",
    "Azlan Dairy Karachi",
    "Azlan Dairy BBQ Point",
    "Azlan Dairy Farm",
    "Azlan Fast Food",
    "Azlan BBQ Point",
    "Fast Food Malir Karachi",
    "Zinger Burger Malir",
    "BBQ Malir Karachi",
    "Online Food Delivery Malir",
    "Best Burger Malir",
    "Pizza Delivery Malir",
    "Fast Food Khokhrapar",
    "Best BBQ in Malir Karachi",
    "Azlan Fast Food Karachi",
  ],
  authors: [{ name: "Azlan Fast Food & BBQ Point (Azlan Dairy)" }],
  creator: "Azlan Fast Food (Azlan Dairy)",
  publisher: "Azlan Fast Food & BBQ Point",
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-PK": siteUrl,
      en: siteUrl,
    },
  },
  openGraph: {
    title: "Azlan Fast Food & BBQ Point — By Azlan Dairy | Malir, Karachi",
    description:
      "Hot, crispy Zinger burgers, cheesy pizzas, loaded rolls & charcoal BBQ by Azlan Dairy delivered fresh in Malir, Karachi.",
    url: siteUrl,
    siteName: "Azlan Fast Food & BBQ Point (Azlan Dairy)",
    images: [
      {
        url: `${siteUrl}/images/hero-burger.jpg`,
        width: 1200,
        height: 630,
        alt: "Azlan Fast Food & BBQ Point (Azlan Dairy) Menu",
      },
    ],
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Azlan Fast Food & BBQ Point — By Azlan Dairy | Malir, Karachi",
    description:
      "Hot, crispy Zinger burgers, cheesy pizzas, loaded rolls & charcoal BBQ by Azlan Dairy delivered fresh in Malir, Karachi.",
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Azlan Fast Food",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/images/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    "@graph": [
      {
        "@type": ["FastFoodRestaurant", "Restaurant"],
        "@id": `${siteUrl}/#restaurant`,
        name: settings?.store_name || "Azlan Fast Food & BBQ Point",
        alternateName: [
          "Azlan Dairy",
          "Azlan Dairy Restaurant",
          "Azlan Dairy Fast Food",
          "Azlan Dairy BBQ Point",
          "Azlan Fast Food",
          "Azlan Fast Food & BBQ Point",
        ],
        description:
          "Official fast food and BBQ branch of Azlan Dairy in Malir, Karachi. Famous for crispy Zinger burgers, loaded pizzas, juicy rolls, and charcoal BBQ made with fresh dairy and quality ingredients.",
        image: [
          `${siteUrl}/images/hero-burger.jpg`,
          `${siteUrl}/images/hero-burger.webp`,
          `${siteUrl}/images/pizza.webp`,
        ],
        logo: `${siteUrl}/images/logo.png`,
        url: siteUrl,
        telephone: settings?.phone || "+92 302 9359694",
        priceRange: "$$",
        currenciesAccepted: "PKR",
        paymentAccepted: ["Cash", "Cash on Delivery"],
        servesCuisine: [
          "Fast Food",
          "BBQ",
          "Burgers",
          "Pizza",
          "Pakistani",
          "Dairy",
        ],
        parentOrganization: {
          "@type": "Organization",
          name: "Azlan Dairy",
          alternateName: "Azlan Dairy Farm",
          url: siteUrl,
        },
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
        sameAs: [
          "https://www.facebook.com/p/Aazlan-dairy-fast-foods-B-B-Q-point-61580115230642/",
          "https://www.instagram.com/azlan_dairy_fast_food_/",
          "https://www.youtube.com/channel/UCBuexULFg1nRAW0x7ZhWCtg",
          "https://www.tiktok.com/@talha_meo",
        ],
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
        potentialAction: {
          "@type": "OrderAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/#menu`,
            inLanguage: "en-PK",
            actionPlatform: [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform",
            ],
          },
          deliveryMethod: [
            "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Azlan Fast Food & BBQ Point | Azlan Dairy",
        alternateName: ["Azlan Dairy", "Azlan Fast Food"],
        description:
          "Online food ordering for Azlan Fast Food & BBQ Point (Azlan Dairy) in Malir, Karachi.",
        publisher: {
          "@id": `${siteUrl}/#restaurant`,
        },
        inLanguage: "en-PK",
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${integralCf.variable} ${materialSymbols.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Safeguard: hide ligature text until the subset icon font is ready */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("fonts" in document && !document.fonts.check("24px 'Material Symbols Outlined'")){document.documentElement.classList.add("icons-loading");document.fonts.ready.then(function(){document.documentElement.classList.remove("icons-loading")});setTimeout(function(){document.documentElement.classList.remove("icons-loading")},3000);}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <StoreStatusProvider seed={storeSeed}>
          <LayoutChrome deliveryFee={settings?.delivery_fee ?? 0} />
          <main className="flex-1">{children}</main>
          <ReviewWatcher />
          <PwaRegister />
        </StoreStatusProvider>
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            duration: 3000,
            className: "azlan-brand-toast",
          }}
        />
      </body>
    </html>
  );
}
