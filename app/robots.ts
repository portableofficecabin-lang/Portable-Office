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
          // Paginated listing URLs (/products?page=N, /products/category/<slug>?page=N,
          // /products?category=x&page=N) are client-side views of the SAME static page,
          // so the server emits canonical=<base path> for all of them. Crawlers see that
          // as a "non-canonical URL" (Ahrefs) / "alternate page" (Search Console). Every
          // product & category already has its own clean URL in the sitemap, so blocking
          // pagination crawl removes the non-canonical duplicates WITHOUT affecting
          // discovery. Both patterns cover page= as the first (?) or a later (&) param.
          "/*?page=",
          "/*&page=",
        ],
      },
    ],
    sitemap: "https://portableofficecabin.com/sitemap.xml",
  };
}
