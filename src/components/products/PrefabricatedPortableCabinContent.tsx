import { Check, Zap, Shield, Settings, Thermometer, RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function PrefabricatedPortableCabinContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Prefabricated Portable Cabin Solutions
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          High-quality prefabricated portable cabins designed for rapid deployment and long-term durability. These factory-built modular structures feature mild steel frame construction with insulated wall panels, offering versatile solutions for site office, accommodation units, security cabins, and storage units. Built with precision engineering and weather resistance materials for reliable performance across construction sites, industrial facilities, and commercial buildings.
        </p>
      </section>

      {/* Key Features Grid */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-8">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: "Quick Assembly and Installation",
              desc: "Factory-built components allow for 2-4 hour on-site assembly. Pre-engineered modular design arrives ready to install with plug-and-play electrical fittings and plumbing systems. No foundation requirements — install on level ground or precast blocks.",
            },
            {
              icon: Shield,
              title: "Durable Steel Frame Construction",
              desc: "Hot-dip galvanized MS framework delivers superior corrosion resistance. High-grade sandwich panels with PUF insulation core ensure durability. Withstands wind loads up to 180 km/h and seismic forces.",
            },
            {
              icon: Settings,
              title: "Customizable Design Options",
              desc: "Multiple size configurations from 8x10 sq ft to 40x12 ft. Choose partitioned office spaces, open room configurations, or multi-room setups. Optional AC provisions, false ceiling, and premium floor finishes — all custom built.",
            },
            {
              icon: Thermometer,
              title: "Advanced Insulation & Climate Control",
              desc: "Thermal insulation maintains comfortable temperatures year-round. Double-wall construction with vapor barrier prevents moisture damage. Acoustic insulation reduces noise by up to 40dB — ideal for focused work.",
            },
            {
              icon: RotateCcw,
              title: "Relocatable & Reusable Design",
              desc: "Bolt-together assembly allows easy disassembly and transport. Standardized components ensure consistent quality. Stackable design enables multi-story configurations. Minimal site preparation required.",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <feature.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Customers Love It */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Why Customers Love It</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Perfect for Multiple Applications", desc: "Ideal for site office, worker accommodation, security cabins, storage, portable toilet facilities, and temporary guest house solutions" },
            { title: "Significant Cost Savings", desc: "Up to 60% more cost effective than traditional construction with faster ROI" },
            { title: "Immediate Productivity", desc: "Ready-to-use facilities eliminate construction delays — porta cabins are widely appreciated for efficiency" },
            { title: "Long-Term Durability", desc: "20+ year lifespan with low maintenance requirements built from high quality materials" },
            { title: "Eco-Friendly Solution", desc: "Recyclable materials and minimal construction waste make these structures environmentally friendly" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Is This Right For You */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Is This the Right Solution for Your Project?
        </h2>
        <p className="text-muted-foreground mb-6">
          These prefabricated portable cabins offer flexibility across diverse application scenarios:
        </p>
        <ul className="space-y-3">
          {[
            "Construction companies needing temporary site office space and worker accommodation units",
            "Educational institutions requiring additional classroom facilities developed quickly",
            "Industrial facilities seeking security cabins and storage units with strong structure design",
            "Government projects requiring quick deployment of durable facilities across India",
            "Businesses needing expandable office space that's efficient and customized to requirements",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            { q: "How quickly can a prefabricated portable cabin be installed?", a: "Our factory-built cabins can be assembled on-site in just 2-4 hours. The pre-engineered modular design arrives ready to install with plug-and-play electrical fittings, eliminating traditional construction delays." },
            { q: "Do prefabricated cabins require a concrete foundation?", a: "No foundation is required. Portable cabins can be installed on level ground or precast blocks with a sturdy base frame, significantly reducing setup time and cost." },
            { q: "What sizes are available?", a: "We offer multiple configurations from compact 8x10 sq ft units to spacious 40x12 ft structures. Custom sizes can also be manufactured to your specific requirements." },
            { q: "How weather-resistant are these cabins?", a: "Our cabins feature hot-dip galvanized steel frames with PUF insulated sandwich panels. They withstand wind loads up to 180 km/h, include weather-sealed joints, and have double-wall construction with vapor barrier protection." },
            { q: "Can the cabins be relocated?", a: "Yes, the bolt-together assembly allows easy disassembly and transport to new locations. Standardized components ensure consistent quality across reinstallations." },
            { q: "What is the lifespan of a prefabricated portable cabin?", a: "With proper maintenance, our cabins last 20+ years. The corrosion-resistant galvanized steel frame and durable insulated panels ensure long-term performance." },
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-accent/10 rounded-2xl p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Transform Your Workspace Today
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Explore our latest price product details and send your enquiry for best quote approx pricing. Request callback from our manufacturing team to discuss your requirements.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/contact" className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-6 py-3 font-semibold hover:bg-accent/90 transition-colors">
            Request a Quote
          </a>
          <a href="tel:+919731897976" className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors">
            Call Us Now
          </a>
        </div>
      </section>
    </div>
  );
}
