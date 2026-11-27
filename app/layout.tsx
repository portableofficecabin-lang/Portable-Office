import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "@/index.css";

// Origin the app connects to early (Supabase data + auth); used for the
// preconnect resource hint in <head> below.
const SUPABASE_ORIGIN =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qsrlfsjtuymuhvwnsegq.supabase.co";

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
    default: "Portable Office Cabin | Portable Cabin Manufacturer in India",
    template: "%s | Portable Office Cabin",
  },
  description:
    "Manufacturer of portable office cabins, site offices, container offices, prefab homes & labour colonies — PUF insulated, turnkey delivery.",
  // NOTE: index/follow is intentionally NOT set here. The root layout applies to
  // EVERY route including the not-found boundary, so a global index,follow collided
  // with Next's auto noindex on 404 renders ("index, follow" + "noindex" conflict).
  // Public SEO pages declare index,follow via buildPageMetadata instead; pages with
  // no metadata (404, private routes) correctly get no index directive here.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Resource hints: open the connection (DNS + TCP + TLS) to the origins
            the app uses early — Supabase data/auth on the critical path, plus
            analytics/geo — so requests don't pay the full handshake on first use. */}
        {/* The home hero background preloads live on the home page (app/(site)/page.tsx).
            In this root layout they were fetched at high priority on every route, including
            the city, product and promotion pages that never show that image. */}
        <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <meta name="google-site-verification" content="awkHO4TQHj5zzuD2nUNuaTOfQpuW7qb_7W_EQ-uGsC8" />
        {/* Was <link rel="icon" href="/favicon.jpeg">: a 1600 × 1600 px, 100 KB photo downloaded on every
            page view — the largest single file on most pages in the 27 Nov mobile audit. The same image
            at icon sizes: favicon.ico (16/32/48 px, ~2 KB; Google wants a multiple of 48 px), a 192 px
            PNG and a 180 px Apple touch icon. favicon.jpeg stays in public/ for any external reference. */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
