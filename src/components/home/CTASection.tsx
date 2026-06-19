import Link from "next/link";
import { ArrowRight, Phone, MapPin, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const ctaPoints = [
  { icon: Phone, text: "Free consultation & site survey — no obligation" },
  { icon: MapPin, text: "National teams of experts all over India" },
  { icon: Award, text: "15+ years delivering outstanding results" },
  { icon: Clock, text: "From enquiry to move-in, faster than you'd think" },
];

export function CTASection() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden cv-section">
      <div 
        className="absolute inset-0 z-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div 
        className="absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Get Your Portable Cabin Solution{" "}
            <span className="text-gradient">In Place Today</span>
          </h2>
          <p className="text-lg lg:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Whether you need a portable cabin, container office, or a shipping container for cargo storage — 
            give us a call for a free consultation and site survey. No obligation.
          </p>
          
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            {ctaPoints.map((point) => (
              <div key={point.text} className="flex items-center gap-3 text-left bg-white/[0.06] backdrop-blur-sm px-5 py-3.5 rounded-xl border border-white/10">
                <point.icon className="w-5 h-5 text-accent shrink-0" />
                <span className="text-white/80 text-sm font-medium">{point.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link href="/contact">
                Request a Free Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline-light" size="xl" asChild>
              <a href="tel:+919731897976">
                <Phone className="mr-2 h-5 w-5" />
                Call Us Now
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
