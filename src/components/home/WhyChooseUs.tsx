import { Zap, CloudRain, Settings, IndianRupee, Leaf, Wrench } from "lucide-react";

const reasons = [
  {
    icon: Zap,
    title: "Lightning-Fast Setup",
    description: "We can have your space up and running in a matter of days, not months — that's how quick we are.",
  },
  {
    icon: CloudRain,
    title: "Built for Indian Climate",
    description: "Our portable cabins are built with monsoons and heatwaves in mind. High-quality insulation in the walls and roof helps regulate temperature, reduce noise, and improve energy efficiency in all weather conditions. Rain or shine, they'll be just fine.",
  },
  {
    icon: Settings,
    title: "Fully Customisable",
    description: "Office, accommodation, security booth or something unique? No worries — we can make it happen. A wide range of fittings can be customized to suit your specific needs, ensuring both functionality and ease of maintenance.",
  },
  {
    icon: IndianRupee,
    title: "Up to 60% Cheaper",
    description: "Our buildings cost significantly less than building from the ground up — that's a big chunk of change saved.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly & Sustainable",
    description: "We use sustainable materials that are just as good for the planet as they are for you. Win-win all round.",
  },
  {
    icon: Wrench,
    title: "Full Utility Integration",
    description: "Electrics, plumbing, HVAC — we hook you up with everything you need so you can focus on what matters.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <div className="text-center mb-14">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5">
            Why Choose Our Portable Cabin Solutions?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg mb-3">
            From rapid deployment to eco-friendly construction — here's why hundreds of businesses across India trust us with their space needs.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Our services are designed to deliver reliable solutions while maintaining the highest standards of quality and safety in every project.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="group card-premium p-8 animate-fade-up hover:-translate-y-1 transition-all duration-500"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-5 group-hover:from-accent group-hover:to-amber-light transition-all duration-500 shadow-md group-hover:shadow-accent/30">
                <reason.icon className="w-7 h-7 text-accent group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3 group-hover:text-accent transition-colors">
                {reason.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
