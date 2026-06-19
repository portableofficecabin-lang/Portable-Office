import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "@/index.css";

// Origin the app connects to early (Supabase data + auth); used for the
// preconnect resource hint in <head> below.
const SUPABASE_ORIGIN =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ojemqfexagnevqbaszop.supabase.co";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portableofficecabin.com"),
  title: {
    default: "Portable Office Cabin | India's Leading Manufacturer",
    template: "%s | Portable Office Cabin",
  },
  description:
    "India's leading manufacturer of portable office cabins, site offices, container offices, prefab homes & labour colonies. PUF insulated, turnkey delivery across India.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Resource hints: open the connection (DNS + TCP + TLS) to the origins
            the app uses early — Supabase data/auth on the critical path, plus
            analytics/geo — so requests don't pay the full handshake on first use. */}
        {/* Preload the hero LCP background so the preload scanner fetches it at the
            highest priority before CSS/picture resolution. Variant matched by media. */}
        <link
          rel="preload"
          as="image"
          href="/assets/hero-bg-mobile.webp"
          media="(max-width: 768px)"
          // @ts-expect-error fetchpriority is valid HTML, not yet in React's link types
          fetchpriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/assets/hero-bg.webp"
          media="(min-width: 769px)"
          // @ts-expect-error fetchpriority is valid HTML, not yet in React's link types
          fetchpriority="high"
        />
        <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://ipapi.co" />
        <meta name="google-site-verification" content="awkHO4TQHj5zzuD2nUNuaTOfQpuW7qb_7W_EQ-uGsC8" />
        <link rel="icon" href="/favicon.jpeg" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        {/* Google Analytics — loaded on first user interaction (with a fallback
            timer) so gtag.js (~155 kB) never executes during the initial load
            window, keeping third-party main-thread blocking off the critical path.
            Engaged visitors and idle/bounce sessions are both still tracked. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
