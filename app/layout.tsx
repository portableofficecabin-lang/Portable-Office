import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "@/index.css";

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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-B0YKT0X980" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-B0YKT0X980');
            `,
          }}
        />
        <meta name="google-site-verification" content="awkHO4TQHj5zzuD2nUNuaTOfQpuW7qb_7W_EQ-uGsC8" />
        <link rel="icon" href="/favicon.jpeg" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
