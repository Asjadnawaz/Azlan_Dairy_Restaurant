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

export const metadata: Metadata = {
  title: "Azlan Fast Food & BBQ point",
  description: "Farm to Table Premium - Azlan Fast Food & BBQ point, Karachi",
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png" }
    ],
    apple: [{ url: "/images/logo.png", type: "image/png" }]
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

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400..700&display=swap"
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
