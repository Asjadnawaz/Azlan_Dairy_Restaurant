import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://azlandairy.pk";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/rider/", "/api/admin/", "/api/rider/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
