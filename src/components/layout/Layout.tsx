import { ReactNode } from "react";
import { Header } from "./Header";
import { LocationStrip } from "./LocationStrip";
import { Footer } from "./Footer";
import { WhatsAppButton } from "../WhatsAppButton";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { GlobalInternalLinks } from "@/components/seo/GlobalInternalLinks";

interface LayoutProps {
  children: ReactNode;
}

// Server Component (no "use client"). The interactive pieces are isolated client
// islands — Header (auth/cart), AnalyticsTracker, GlobalInternalLinks — while the
// static chrome (Footer, WhatsAppButton) and the
// page <main> render on the server with no hydration cost. On routes whose view is
// itself a Client Component (e.g. Products, RentalService), Next bundles this as
// client as before — behavior is unchanged there; the win lands on the
// server-rendered routes (home, product detail, category, blog).
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AnalyticsTracker />
      {/* GlobalGeoSignals was mounted here until 2026-10-10. It rewrote the canonical, og:url,
          og:image and twitter:image in the browser after hydration, overriding the per-page values
          the server already emits via buildPageMetadata (a product's own og:image became the generic
          site image). Retired — see src/components/seo/GlobalGeoSignals.tsx. */}
      {/* Server-rendered geo/SEO line at the very top of the page, ABOVE the trust bar and
          verified badges, on every Layout page. Sits outside the Header client island so it
          is in the initial HTML for crawlers, and outside the sticky element so the header's
          h-9/-top-9 offset contract is untouched — the strip scrolls away first, then the
          header pins exactly as before. */}
      <LocationStrip />
      <Header />
      {/* Target of the header's "Skip to main content" link. tabIndex={-1} makes it
          programmatically focusable so activating the skip link actually moves focus
          here rather than only scrolling; the outline is suppressed because the user
          did not focus it directly. */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <GlobalInternalLinks />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
