export const revalidate = 3600; // 1 hour

import Index from "@/views/Index";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  absoluteTitle: "Portable Office Cabin Manufacturer in India | PUF Cabins",
  description:
    "Portable Office Cabin manufactures PUF portable cabins, site offices, container offices, prefab homes and labour colonies with turnkey delivery across India.",
  path: "/",
});

export default function Page() {
  return (
    <>
      {/* Preload the home hero LCP background (HeroSection's <picture>) so the preload scanner
          fetches the matching variant early. React hoists these <link>s into <head>. They live
          on this page, not in the root layout, so other routes don't download an image they
          never show. */}
      <link rel="preload" as="image" href="/assets/hero-bg-mobile.webp" media="(max-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/assets/hero-bg.webp" media="(min-width: 769px)" fetchPriority="high" />
      <Index />
    </>
  );
}
