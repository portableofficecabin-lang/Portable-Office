import { Hammer, Sparkles, BadgeIndianRupee, ShieldCheck, UserCheck } from "lucide-react";
import { CabinCalculatorLoader } from "./cabin-calculator/CabinCalculatorLoader";

// Server Component: the headline/marketing copy is rendered in the HTML (SEO +
// LCP-safe). The interactive calculator underneath is a lazily-mounted client
// island (see CabinCalculatorLoader) so it stays off the critical render path.
const trustPoints = [
  { icon: Sparkles, text: "Instant Price Estimate" },
  { icon: BadgeIndianRupee, text: "100% Free" },
  { icon: UserCheck, text: "No Registration Required" },
  { icon: ShieldCheck, text: "Sales-Team Verified Quote" },
];

export function CabinCalculatorSection() {
  return (
    <section id="cabin-calculator" className="relative overflow-hidden py-16 lg:py-20 cv-section scroll-mt-24" aria-labelledby="cabin-calc-heading">
      {/* Navy gradient backdrop matching the site hero */}
      <div className="absolute inset-0 z-0" style={{ background: "var(--gradient-hero)" }} />
      <div
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="container-custom relative z-10">
        {/* Banner */}
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent backdrop-blur-sm">
            <Hammer className="h-4 w-4" /> Build Your Dream Cabin
          </span>
          <h2 id="cabin-calc-heading" className="mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Customize Your Cabin & <span className="text-gradient">Get an Instant Price Estimate</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 lg:text-lg">
            Design your portable cabin in a few simple steps — pick the size, structure, interiors, electricals and
            optional features to receive an estimated price. Our team then reviews your configuration and sends a
            detailed, verified quotation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {trustPoints.map((p) => (
              <div key={p.text} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 backdrop-blur-sm">
                <p.icon className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-white/90">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive calculator (lazy client island) */}
        <CabinCalculatorLoader />
      </div>
    </section>
  );
}
