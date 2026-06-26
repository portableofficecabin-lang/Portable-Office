import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "../WhatsAppButton";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { GlobalGeoSignals } from "@/components/seo/GlobalGeoSignals";
import { GlobalInternalLinks } from "@/components/seo/GlobalInternalLinks";

interface LayoutProps {
  children: ReactNode;
}

// Server Component (no "use client"). The interactive pieces are isolated client
// islands — Header (auth/cart), AnalyticsTracker, GlobalGeoSignals,
// GlobalInternalLinks — while the static chrome (Footer, WhatsAppButton) and the
// page <main> render on the server with no hydration cost. On routes whose view is
// itself a Client Component (e.g. Products, RentalService), Next bundles this as
// client as before — behavior is unchanged there; the win lands on the
// server-rendered routes (home, product detail, category, blog).
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AnalyticsTracker />
      <GlobalGeoSignals />
      <Header />
      <main className="flex-1">{children}</main>
      <GlobalInternalLinks />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
