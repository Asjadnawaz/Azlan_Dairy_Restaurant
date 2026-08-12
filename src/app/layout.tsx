import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/azlan/theme-provider";
import { Toaster } from "sonner";
import { LayoutChrome } from "@/components/azlan/layout-chrome";
import { createServerClient } from "@/lib/supabase/server";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch store status server-side for kill-switch
  const supabase = await createServerClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("is_active")
    .single();
  const isStoreActive = settings?.is_active ?? true;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    name: "Azlan Fast Food & BBQ Point",
    image: `${siteUrl}/images/hero-burger.jpg`,
    logo: `${siteUrl}/images/logo.png`,
    url: siteUrl,
    telephone: "+92 300 0000000",
    priceRange: "$$",
    servesCuisine: ["Fast Food", "BBQ", "Burgers", "Pizza", "Pakistani"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Main Malir Halt",
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
        opens: "12:00",
        closes: "02:00",
      },
    ],
    hasMenu: `${siteUrl}/#menu`,
  };

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/integral-cf"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/jameel-noori-nastaliq"
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
          <LayoutChrome isStoreActive={isStoreActive} />
          <main className="flex-1">{children}</main>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
