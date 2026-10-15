import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlanfastfood.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy-policy"],
        disallow: [
          "/admin/",
          "/api/",
          "/rider/",
          "/profile/",
          "/orders/",
          "/cart",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
