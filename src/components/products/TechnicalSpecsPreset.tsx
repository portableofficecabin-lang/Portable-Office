import { Ruler } from "lucide-react";

const SPECS: Array<{ label: string; value: string }> = [
  {
    label: "Flooring",
    value:
      "18mm Cement Bonded Board (Visaka) with 1.5mm PVC Vinyl Carpet (Alfa) finish — waterproof and termite proof.",
  },
  {
    label: "Windows",
    value:
      "Aluminium sliding windows with 1.2mm powder-coated frame and 4mm glass, including safety grill and canopy.",
  },
  {
    label: "Main Door",
    value:
      "External opening insulated door with tubular frame, lock, handle and canopy.",
  },
  {
    label: "Sliding Door",
    value: "UPVC or Aluminium sliding door provided as per layout.",
  },
  {
    label: "Insulation",
    value:
      "50mm thick glass wool insulation (64 kg/m³) for both roof and walls — superior thermal & acoustic performance.",
  },
  {
    label: "False Ceiling",
    value: "8mm MDF ceiling with aluminium section finishing.",
  },
  {
    label: "External Wall Panel",
    value:
      "1.2mm corrugated CR MS sheet welded structure (JSW / Essar / Tata / AMNS).",
  },
  {
    label: "Internal Wall Panel",
    value: "8mm MDF paneling with aluminium finishing sections.",
  },
  {
    label: "Toilet & Pantry Wall",
    value: "4mm ACP waterproof wall paneling.",
  },
  {
    label: "Roof Sheet",
    value: "1.2mm CR MS sloped roof, water-tight and anti-rust protected.",
  },
  {
    label: "Bottom Frame",
    value: "100x50mm heavy-duty MS C Channel (VKSP / SAIL / Vizag).",
  },
  {
    label: "Top Frame",
    value: "50x50mm MS square pipe structure (Apollo / Loha).",
  },
  {
    label: "Sanitary Fixtures",
    value: "Premium Jaquar fittings throughout toilet and pantry.",
  },
  {
    label: "Finishing",
    value:
      "Fully furnished portable cabin complete with interior finishing — ready to use on delivery.",
  },
];

interface Props {
  title?: string;
  description?: string;
}

export function TechnicalSpecsPreset({
  title = "Technical Specifications & Materials",
  description = "Portable Office Cabin follows BIS/NBC guidelines and industry best practices for structural design, fabrication, insulation, and safety. Below is our standard premium build preset:",
}: Props) {
  return (
    <section>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
        <Ruler className="h-7 w-7 text-accent" />
        {title}
      </h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">{description}</p>

      <div className="bg-card rounded-xl shadow-md overflow-hidden mb-4 border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-accent/10">
              <th className="px-6 py-4 text-left font-semibold text-foreground text-sm w-1/3">
                Component
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground text-sm">
                Specification
              </th>
            </tr>
          </thead>
          <tbody>
            {SPECS.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}
              >
                <td className="px-6 py-4 font-medium text-foreground text-sm align-top">
                  {row.label}
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm leading-relaxed">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Specifications represent our standard preset. Custom sizes, finishes and material grades are available on request.
      </p>
    </section>
  );
}
