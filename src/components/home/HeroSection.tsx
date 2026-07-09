import Link from "next/link";
import { ArrowRight, CheckCircle, Zap, IndianRupee, Leaf, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IsoCertificationBadge } from "@/components/IsoCertificationBadge";
import heroCabin from "@/assets/hero-cabin-900.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { startingFromEstimate, formatINR } from "@/components/home/cabin-calculator/pricing";

const highlights = [
  { icon: Zap, text: "Up & Running in Days" },
  { icon: IndianRupee, text: "60% Cheaper Than Traditional" },
  { icon: Leaf, text: "Eco-Friendly Materials" },
];

export function HeroSection() {
  // Computed at render time from the calculator's pricing engine (single source of
  // truth) — NOT a hardcoded number. Server-rendered into the HTML so it is present
  // for anonymous/public visitors and search engines, with no backend dependency.
  const fromPrice = startingFromEstimate();

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* ▶ LCP ELEMENT (home page, mobile): this full-bleed hero background image
          (hero-bg-mobile.webp ≈ 26 KB on mobile / hero-bg.webp ≈ 74 KB desktop) is
          the Largest Contentful Paint candidate. On wider viewports the H1 below can
          win instead — both paint immediately.
          It is intentionally a preloaded, art-directed <picture>/<img> (NOT a CSS
          background-image and NOT next/image):
            • <link rel=preload as=image fetchpriority=high> in app/layout.tsx makes
              the preload scanner fetch the correct variant at <head> parse — same
              priority next/image priority would give, but earlier.
            • <picture media> art-directs a smaller, differently-cropped file to
              mobile; next/image cannot do per-breakpoint art direction.
            • Static pre-optimized webp → no request-time sharp on the origin.
            • width/height set → zero CLS.
          Do NOT "convert to next/image" — it would lose art direction and add origin
          CPU for no LCP gain. The CSS-background anti-pattern this guards against is
          already avoided. */}
      <picture className="absolute inset-0 z-0">
        <source media="(max-width: 768px)" srcSet="/assets/hero-bg-mobile.webp" type="image/webp" />
        <source srcSet="/assets/hero-bg.webp" type="image/webp" />
        <img
          src="/assets/hero-bg.webp"
          alt=""
          aria-hidden="true"
          width="1920"
          height="1080"
          fetchPriority="high"
          decoding="async"
          loading="eager"
          className="w-full h-full object-cover object-center"
        />
      </picture>
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, hsla(222, 47%, 11%, 0.93) 0%, hsla(222, 35%, 20%, 0.88) 50%, hsla(222, 47%, 11%, 0.92) 100%)",
        }}
      />
      <div 
        className="absolute inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/15 rounded-full px-5 py-2.5 mb-6 animate-fade-up border border-accent/30">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-accent font-semibold text-sm tracking-wide">
                Revolutionising Modular Buildings
              </span>
            </div>
            
            <h1 
              className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-white leading-[1.1] mb-4"
            >
              <span className="text-gradient">Portable Office Cabin</span> Manufacturer
            </h1>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-white/90 leading-snug mb-6">
              India's Trusted Portable Cabin & Container Office Supplier
            </h2>
            
            <p 
              className="text-lg lg:text-xl text-white/75 mb-5 max-w-xl mx-auto lg:mx-0 animate-fade-up leading-relaxed"
              style={{ animationDelay: "0.2s" }}
            >
              Construction companies, educational institutions and businesses all need space — and fast. Our portable cabins are the answer to all your temporary and permanent accommodation needs.
            </p>

            <p 
              className="text-base text-white/60 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-up"
              style={{ animationDelay: "0.25s" }}
            >
              Up to 60% cheaper than traditional construction. Kinder to the planet. 
              Ready in days, not months.
            </p>

            {/* Customized cabin estimated price — highlighted, computed live from the
                pricing engine (no hardcoded value). Tapping it jumps to the calculator. */}
            <a
              href="#cabin-calculator"
              className="group mb-6 inline-flex w-full max-w-md items-center gap-4 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/20 to-amber-light/10 px-5 py-4 backdrop-blur-sm animate-fade-up transition-colors hover:border-accent/70 hover:from-accent/25"
              style={{ animationDelay: "0.28s" }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/25 ring-1 ring-accent/40">
                <Calculator className="h-6 w-6 text-accent" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                  Customized Cabin · Estimated Price
                </span>
                <span className="block font-display text-2xl font-extrabold leading-tight text-white lg:text-3xl">
                  from {formatINR(fromPrice)}
                  <span className="ml-1.5 text-sm font-medium text-white/60">incl. GST</span>
                </span>
                <span className="block text-xs text-white/60">Customize size &amp; features for your exact price</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
            </a>

            {/* Highlights */}
            <div
              className="flex flex-wrap justify-center lg:justify-start gap-5 mb-6 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              {highlights.map((item) => (
                <div key={item.text} className="flex items-center gap-2.5 bg-white/[0.08] px-4 py-2.5 rounded-xl border border-white/10">
                  <item.icon className="h-5 w-5 text-accent" />
                  <span className="text-sm font-semibold text-white/90">{item.text}</span>
                </div>
              ))}
            </div>

            <div
              className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 mb-4 animate-fade-up lg:justify-start"
              style={{ animationDelay: "0.34s" }}
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent shrink-0" />
                <span className="text-sm font-semibold text-white">GST Verified</span>
                <span className="text-sm text-white/65">GST No:</span>
                <span className="text-sm font-mono font-semibold text-white tracking-wide">33FVKPK6238Q1ZT</span>
              </span>
              <span className="hidden h-4 w-px bg-white/20 sm:block" />
              <span className="inline-flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent shrink-0" />
                <span className="text-sm font-semibold text-white">MSME / Udyam</span>
                <span className="text-sm text-white/65">Reg. No:</span>
                <span className="text-sm font-mono font-semibold text-white tracking-wide">UDYAM-TN-11-0068545</span>
              </span>
            </div>

            {/* ISO 9001:2015 certification — premium trust badge */}
            <div className="mb-10 animate-fade-up" style={{ animationDelay: "0.37s" }}>
              <IsoCertificationBadge variant="onDark" />
            </div>

            {/* CTAs */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up"
              style={{ animationDelay: "0.4s" }}
            >
              <Button variant="hero" size="xl" asChild>
                <Link href="/products">
                  Explore Products
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline-light" size="xl" asChild>
                <Link href="/contact">
                  Free Consultation
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/10 animate-fade-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl lg:text-4xl font-bold text-accent">500+</div>
                <div className="text-white/50 text-sm mt-1">Cabins Delivered</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl lg:text-4xl font-bold text-accent">15+</div>
                <div className="text-white/50 text-sm mt-1">Years in Business</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl lg:text-4xl font-bold text-accent">2</div>
                <div className="text-white/50 text-sm mt-1">Factories</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl lg:text-4xl font-bold text-accent">98%</div>
                <div className="text-white/50 text-sm mt-1">Happy Clients</div>
              </div>
            </div>
          </div>

          {/* Hero Image (decorative, DESKTOP ONLY — NOT the LCP element).
              `hidden lg:block` + loading="lazy" means mobile browsers never download
              this 900px cabin photo: a display:none lazy image is not fetched, so
              mobile (the field-CWV audience) pays zero bytes for it. Keeping it lazy
              is correct — the LCP is the full-bleed background above, not this. */}
          <div
            className="hidden lg:block relative animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-accent/30 to-amber-light/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-white/12 to-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-2xl">
                <img
                  src={resolveImageUrl(heroCabin)}
                  alt="Premium Portable Cabin - Ready to Deploy"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto rounded-xl object-cover shadow-xl"
                />
                <div className="absolute bottom-8 left-6 right-6">
                  <div className="bg-gradient-to-r from-primary via-navy-deep to-primary rounded-xl p-5 border border-accent/40 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-8 bg-gradient-to-b from-accent to-amber-light rounded-full" />
                      <h3 className="text-white font-display font-bold text-xl tracking-wide">
                        Premium Portable Structures
                      </h3>
                    </div>
                    <p className="text-white/70 text-sm font-medium pl-5">Porta cabins, shipping containers & more</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
