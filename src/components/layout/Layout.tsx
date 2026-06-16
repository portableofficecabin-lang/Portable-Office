"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "../WhatsAppButton";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { GlobalGeoSignals } from "@/components/seo/GlobalGeoSignals";
import { GlobalInternalLinks } from "@/components/seo/GlobalInternalLinks";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  useAnalyticsTracking();

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalGeoSignals />
      <Header />
      <main className="flex-1">{children}</main>
      <GlobalInternalLinks />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
