import { MapPin, PenTool, Truck, PartyPopper } from "lucide-react";

const steps = [
  {
    icon: MapPin,
    step: "01",
    title: "Site Assessment",
    description: "We come and assess your site — don't worry, it'll only take a few minutes. We'll evaluate the space, terrain and access points.",
  },
  {
    icon: PenTool,
    step: "02",
    title: "Design & Manufacture",
    description: "Leveraging our advanced manufacturing process and expertise, we work with you to design and produce high-quality portable office cabins and specialized structures—this takes around 2–3 weeks, depending on the complexity.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Delivery & Installation",
    description: "Our team of experts will deliver and install your portable office cabin efficiently and reliably, ensuring everything is set up on-site within a day or two to meet your timeline. Hassle-free, guaranteed.",
  },
  {
    icon: PartyPopper,
    step: "04",
    title: "Move In & Enjoy",
    description: "And then — ta da! You get to move straight in and start enjoying your beautiful new space. It's that simple.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-padding relative overflow-hidden cv-section">
      <div 
        className="absolute inset-0 z-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      {/* Radial glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] z-0" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-[100px] z-0" />
      {/* Subtle dot grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      
      <div className="container-custom relative z-10">
        <div className="text-center mb-14">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Our Process
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
            How Our Portable Cabin Process Works
          </h2>
          <p className="text-white/65 max-w-2xl mx-auto text-lg mb-3">
            From first conversation to move-in day — we make it simple, fast and stress-free.
          </p>
          <p className="text-white/50 max-w-2xl mx-auto text-base">
            Our team will guide you through every step, from your initial enquiry to negotiating and finalizing the deal, ensuring a smooth and transparent process.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative animate-fade-up"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[calc(100%-20%)] h-0.5 bg-gradient-to-r from-accent/50 to-accent/10" />
              )}
              
              <div className="relative bg-white/[0.07] backdrop-blur-sm rounded-2xl p-7 border border-white/10 hover:border-accent/40 transition-all duration-500 hover:-translate-y-1 h-full">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center group-hover:bg-accent transition-all duration-500">
                    <step.icon className="w-7 h-7 text-accent group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-display text-4xl font-bold text-accent/30 group-hover:text-accent/60 transition-colors">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
