export const revalidate = 3600; // 1 hour

import Index from "@/views/Index";

export default function Page() {
  return (
    <>
      {/* Preload the LCP hero background so the browser starts fetching it
          immediately instead of waiting until the hero markup is parsed.
          Media-scoped to mirror the <picture> art-direction in HeroSection, so
          only the variant for the current viewport is fetched (no double load).
          Scoped to the home route so other pages don't preload an unused image. */}
      <link
        rel="preload"
        as="image"
        href="/assets/hero-bg-mobile.webp"
        type="image/webp"
        media="(max-width: 768px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/assets/hero-bg.webp"
        type="image/webp"
        media="(min-width: 769px)"
        fetchPriority="high"
      />
      <Index />
    </>
  );
}
