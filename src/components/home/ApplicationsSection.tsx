import { HardHat, Building2, GraduationCap, Stethoscope, Shield, Warehouse } from "lucide-react";

const apps = [
  { icon: HardHat, name: "Construction Sites", desc: "Site offices, supervisor cabins, and labour accommodation that move with your project." },
  { icon: Building2, name: "IT & Corporate Offices", desc: "Quick-build satellite offices, training rooms, and breakout spaces for growing teams." },
  { icon: GraduationCap, name: "Schools & Institutions", desc: "Modular classrooms, exam halls, and admin blocks ready before the term starts." },
  { icon: Stethoscope, name: "Hospitals & Clinics", desc: "Sample collection rooms, OPDs, and triage cabins for hospitals and health camps." },
  { icon: Shield, name: "Security Posts", desc: "Guard booths and checkpoint cabins for gated communities, factories, and tech parks." },
  { icon: Warehouse, name: "Warehousing & Logistics", desc: "Container-based storage, dispatch offices, and yard supervision cabins." },
];

export function ApplicationsSection() {
  return (
    <section className="section-padding bg-muted/30 cv-section">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Where We Build
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Applications
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Portable cabins solve real problems across industries. Here's where ours show up most.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {apps.map((a) => (
            <div key={a.name} className="bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <a.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">{a.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
