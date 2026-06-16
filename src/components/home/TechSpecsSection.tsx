const rows = [
  { label: "Material", value: "MS Steel frame with galvanized C & Z purlins" },
  { label: "Wall Thickness", value: "50mm / 75mm PUF insulated sandwich panels" },
  { label: "Insulation", value: "High-density Polyurethane Foam (PUF), 40 kg/m³" },
  { label: "Flooring", value: "18mm marine plywood with vinyl or laminate finish" },
  { label: "Roofing", value: "Pre-painted GI sheet with PUF insulation, slope drainage" },
  { label: "Electrical", value: "Concealed wiring, LED lights, switches, AC point, MCB box" },
  { label: "Paint", value: "Two-coat epoxy primer + PU enamel exterior finish" },
  { label: "Standard Dimensions", value: "10x8 ft, 20x8 ft, 40x8 ft (custom sizes available)" },
];

export function TechSpecsSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <div className="text-center mb-10">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Build Quality
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Technical Specifications
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every Portable Office Cabin unit is built to the same engineering standard. Here's what goes into it.
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-left">
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <th className="px-6 py-4 font-display font-semibold text-foreground text-sm sm:text-base w-1/3 border-b border-border/50">
                    {r.label}
                  </th>
                  <td className="px-6 py-4 text-muted-foreground text-sm sm:text-base border-b border-border/50">
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
