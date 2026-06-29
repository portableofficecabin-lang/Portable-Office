import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Public/SEO pages (/, /products, /products/category/*, /products/*, /blog,
        // /blog/*, static pages) are all crawlable via the broad allow. Only private,
        // non-SEO sections are blocked. These also send X-Robots-Tag: noindex,nofollow
        // (see next.config.ts) so they can't be indexed even if linked.
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/cart",
          "/checkout",
          "/my-account",
        ],
      },
    ],
    sitemap: "https://portableofficecabin.com/sitemap.xml",
  };
}
