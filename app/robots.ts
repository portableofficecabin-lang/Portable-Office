import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
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
