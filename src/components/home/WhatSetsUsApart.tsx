import Link from "next/link";
import { Layers, Move, Plug, HeadphonesIcon } from "lucide-react";

const differentiators = [
  {
    icon: Layers,
    title: "Premium Sandwich Panel Construction",
    description: "Our premium sandwich panel construction keeps your cabin comfortable year round — no drafts or cold spots to worry about.",
  },
  {
    icon: Move,
    title: "Modular & Relocatable",
    description: "Because we build in sections, it's easy to expand, relocate or reconfigure as and when your needs change.",
  },
  {
    icon: Plug,
    title: "Complete Utility Integration",
    description: "We hook you up with all necessary utilities — electrics, plumbing and HVAC systems — so you can focus on what really matters.",
  },
  {
    icon: HeadphonesIcon,
    title: "Warranty & After-Sales Support",
    description: "We stand behind our cabins with a comprehensive warranty and responsive after-sales support — every step of the way.",
  },
];

export function WhatSetsUsApart() {
  return (
    <section className="section-padding bg-muted/50">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Content */}
          <div>
            <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
              Our Edge
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5">
              What Sets Our Portable Cabins Apart?
            </h2>
            <p className="text-muted-foreground text-lg mb-4 leading-relaxed">
              We don't just build cabins — we engineer spaces that work as hard as you do. 
              Premium materials, smart design, and support that goes the distance.
            </p>
            <p className="text-muted-foreground text-base mb-8 leading-relaxed">
              For detailed information on features, pricing, and customization options, please visit our{" "}
              <Link href="/products" className="text-accent font-semibold hover:underline">portable office cabin product page</Link>.
            </p>

            <div className="space-y-6">
              {differentiators.map((item, index) => (
                <div
                  key={item.title}
                  className="flex gap-5 animate-fade-up group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center group-hover:from-accent group-hover:to-amber-light transition-all duration-500 shadow-sm">
                    <item.icon className="w-7 h-7 text-accent group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground mb-1.5 group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-accent/15 via-amber-light/10 to-accent/15 rounded-3xl blur-3xl" />
            <div className="relative bg-gradient-to-br from-primary via-navy-medium to-primary rounded-2xl p-8 lg:p-10 text-primary-foreground border border-accent/20 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/8 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-light/8 rounded-full blur-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-accent to-amber-light rounded-full" />
                  <h3 className="font-display text-2xl font-bold text-white">
                    Industry-Leading Standards
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "500+", label: "Projects Completed" },
                    { value: "98%", label: "Client Satisfaction" },
                    { value: "15+", label: "Years Experience" },
                    { value: "24/7", label: "Customer Support" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-5 bg-white/[0.08] rounded-xl border border-white/10 hover:border-accent/40 transition-all duration-300 hover:scale-[1.03]">
                      <div className="font-display text-3xl lg:text-4xl font-bold text-accent mb-1.5">{stat.value}</div>
                      <div className="text-sm font-medium text-white/70">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                  <p className="text-white/50 text-sm">
                    Trusted by construction companies, schools, hospitals & government agencies across India
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
