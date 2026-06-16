"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import shippingContainerPortYard from "@/assets/products/shipping-container-port-yard.webp";
import shippingContainerStacked from "@/assets/products/shipping-container-stacked.webp";
import shippingContainerStorageYard from "@/assets/products/shipping-container-storage-yard.webp";

const tradeContainerTypes = [
  {
    name: "Standard Dry Containers",
    details: "20 ft and 40 ft ISO containers used for general cargo, warehousing, and later modular conversion.",
  },
  {
    name: "High Cube Containers",
    details: "Roughly 1 ft taller than standard units, preferred for office and home conversions where extra ceiling height improves comfort.",
  },
  {
    name: "Reefer Containers",
    details: "Insulated temperature-controlled containers for food, pharma, and climate-sensitive uses. Also useful for specialized conversions.",
  },
  {
    name: "Specialized Containers",
    details: "Open-top, flat-rack, and tank containers for oversized machinery, equipment, and liquid transport.",
  },
];

const sizeRows = [
  {
    type: "20 ft Standard",
    dimensions: "6.1m × 2.4m × 2.6m",
    volume: "~33 cubic metres",
    payload: "~25,000 kg",
  },
  {
    type: "40 ft Standard",
    dimensions: "12.2m × 2.4m × 2.6m",
    volume: "~67 cubic metres",
    payload: "~30,480 kg",
  },
];

const priceRows = [
  { type: "20 ft standard", condition: "Used", price: "₹100,000 – ₹130,000" },
  { type: "40 ft standard", condition: "Used", price: "₹150,000 – ₹180,000" },
  { type: "40 ft high cube", condition: "Used", price: "₹180,000 – ₹220,000" },
  { type: "20 ft one-trip", condition: "New", price: "₹180,000 – ₹250,000" },
  { type: "40 ft one-trip", condition: "New", price: "₹280,000 – ₹350,000" },
];

const solutionUses = [
  "Container offices for construction sites and industrial facilities",
  "Container homes, cafés, canteens, and commercial kiosks",
  "Worker accommodation and prefab labour colonies",
  "Security cabins, QA labs, portable toilets, and rooftop cabins",
  "Storage boxes and logistics-ready cargo containers for factories and warehouses",
];

const bengaluruHubs = [
  "Peenya Industrial Area",
  "Bommasandra",
  "Jigani",
  "Attibele",
  "Harohalli",
  "Kumbalgodu",
  "Bidadi",
  "Doddaballapur",
  "Nelamangala",
  "Hoskote",
  "Devanahalli Aerospace Park",
  "Whitefield",
  "Electronics City",
];

const tamilNaduHubs = [
  "Ambattur",
  "Guindy",
  "Thirumudivakkam",
  "Sriperumbudur",
  "Oragadam",
  "Irungattukottai",
  "Pillaipakkam",
  "Hosur",
  "Ranipet",
  "Gummidipoondi",
  "Cheyyar",
  "Thoothukudi",
];

const customizationRows = [
  ["Insulation", "PUF panels, rockwool, glasswool"],
  ["Internal walls", "Pre-laminated boards, painted panels"],
  ["Flooring", "Marine plywood, vinyl, tiles, epoxy"],
  ["External finish", "Painted steel, ACP cladding, metal sheet finish"],
  ["Openings", "Sliding doors, hinged doors, aluminium or uPVC windows"],
  ["Services", "Electrical, data, plumbing, AC drainage, lighting"],
];

const procurementChecklist = [
  "Structural condition and grading of the base container",
  "Corrosion treatment and paint protection system",
  "Insulation type and thermal performance for Indian climate",
  "Electrical load capacity and wiring layout",
  "Compliance with site fire and building norms",
  "Warranty coverage, service support, and relocation scope",
];

const topGalleryImages = [
  { src: resolveImageUrl(shippingContainerPortYard),
    alt: "Shipping containers lined up at a busy cargo port for international logistics operations by Portable Office Cabin",
  },
  { src: resolveImageUrl(shippingContainerStacked),
    alt: "Stacked steel shipping containers ready for storage and modular conversion projects by Portable Office Cabin",
  },
  { src: resolveImageUrl(shippingContainerStorageYard),
    alt: "Shipping container storage yard supporting industrial cargo and modular building use in South India by Portable Office Cabin",
  },
];

export function ShippingContainerContent() {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const showPreviousImage = () => {
    setActiveImageIndex((current) => {
      if (current === null) return 0;
      return current === 0 ? topGalleryImages.length - 1 : current - 1;
    });
  };

  const showNextImage = () => {
    setActiveImageIndex((current) => {
      if (current === null) return 0;
      return current === topGalleryImages.length - 1 ? 0 : current + 1;
    });
  };

  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImageIndex(null);
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex]);

  return (
    <>
      <div className="space-y-12">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {topGalleryImages.map((image, index) => (
              <button
                key={image.alt}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className="overflow-hidden rounded-3xl border border-border bg-card text-left shadow-card transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Open image ${index + 1} of ${topGalleryImages.length}`}
              >
                <OptimizedImage
                  src={resolveImageUrl(image.src)}
                  alt={image.alt}
                  title={image.alt}
                  className="h-full min-h-[240px] w-full object-cover"
                  aspectRatio="square"
                />
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="max-w-4xl space-y-4">
              <h2 className="font-display text-3xl font-bold text-foreground">
                Shipping Container: From Global Cargo to Modular Buildings in South India
              </h2>
              <p className="text-muted-foreground leading-7">
                The standardized steel shipping container changed world trade by making cargo movement faster, safer, and cheaper.
                Today, the same 20 ft and 40 ft boxes that move through ports like Chennai and Krishnapatnam are also repurposed into offices,
                homes, cafés, labour accommodation, and industrial support spaces across Bengaluru, Hosur, Sriperumbudur, and Oragadam.
              </p>
              <p className="text-muted-foreground leading-7">
                Portable Office Cabin fabricates and repurposes shipping containers into turnkey modular buildings for industrial,
                commercial, and institutional clients across South India.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Types of shipping containers used in trade</h3>
              <div className="space-y-4">
                {tradeContainerTypes.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Why 20 ft and 40 ft containers dominate</h3>
              <p className="text-muted-foreground leading-7 mb-4">
                ISO standardization allows the same container to move from ship to rail to truck without unloading the goods inside.
                That intermodal flow is what made modern container shipping practical for industrial supply chains across India.
              </p>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Size</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">External Dimensions</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Internal Volume</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Max Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row, index) => (
                      <tr key={row.type} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                        <td className="px-4 py-3 text-foreground">{row.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.dimensions}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.volume}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.payload}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border bg-muted/20 p-8">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">How container shipping works in practice</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Packing and stuffing at origin",
              "Port handling and sea voyage",
              "Indian port discharge and inland delivery",
            ].map((step) => (
              <div key={step} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <p className="font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-muted-foreground leading-7">
            For example, machinery loaded in Shanghai can arrive sealed at Chennai port, clear customs, and move straight to a plant in
            Peenya, Bommasandra, or Ambattur without repeated unloading and reloading. That simplicity is the core advantage of containerization.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">New, used and second-hand shipping containers in India</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Container Type</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Condition</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Price Range</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.map((row, index) => (
                  <tr key={`${row.type}-${row.condition}`} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 text-foreground">{row.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.condition}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-muted-foreground leading-7">
            Buyers typically choose cargo-worthy or high-grade wind-and-watertight units for storage and modular conversion projects.
            One-trip containers suit premium client-facing facilities, while second-hand units make sense for internal operations and budget-led deployments.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Reusing containers as modular buildings</h3>
              <ul className="space-y-3 text-muted-foreground">
                {solutionUses.map((item) => (
                  <li key={item} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Key modification steps</h3>
              <ul className="space-y-3 text-muted-foreground leading-7">
                <li>Structural openings for doors and windows with steel reinforcement</li>
                <li>Insulation using PUF panels, rockwool, or glasswool</li>
                <li>Interior finishing with wall panels, flooring, and ceiling treatment</li>
                <li>Electrical wiring, lighting, and MCB-backed distribution boards</li>
                <li>Plumbing for toilets, pantries, and drainage points</li>
                <li>HVAC provisions with split AC mounting and ventilation planning</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Container-based solutions by Portable Office Cabin</h3>
          <p className="text-muted-foreground leading-7 mb-6">
            Portable Office Cabin converts raw containers into offices, homes, canteens, labour accommodation, laboratories, security cabins,
            portable toilets, and rooftop workspace units with complete electrical and plumbing fit-out.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Container offices and site cabins for industrial and construction projects",
              "Container homes, cafés, and commercial spaces with faster deployment",
              "Worker accommodation blocks using multiple connected or stacked units",
              "Specialized units like labs, guard cabins, and portable sanitation blocks",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-muted/20 p-4 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Bengaluru industrial clusters served</h3>
              <div className="flex flex-wrap gap-2">
                {bengaluruHubs.map((hub) => (
                  <span key={hub} className="rounded-full border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {hub}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Chennai and Tamil Nadu hubs served</h3>
              <div className="flex flex-wrap gap-2">
                {tamilNaduHubs.map((hub) => (
                  <span key={hub} className="rounded-full border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {hub}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Design and customisation options</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                {customizationRows.map(([label, value], index) => (
                  <tr key={label} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-4 py-3 font-medium text-foreground w-1/3">{label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Indicative fitted unit pricing</h3>
              <ul className="space-y-3 text-muted-foreground leading-7">
                <li>Basic used 20 ft storage container: ₹100,000 – ₹130,000</li>
                <li>Basic used 40 ft storage container: ₹150,000 – ₹180,000</li>
                <li>20 ft fitted office cabin: ₹200,000 – ₹350,000</li>
                <li>40 ft fitted office cabin: ₹350,000 – ₹550,000</li>
                <li>Container laboratory: ₹400,000 – ₹800,000</li>
                <li>Multi-container complex: project-specific pricing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Typical lead times</h3>
              <ul className="space-y-3 text-muted-foreground leading-7">
                <li>Standard guard cabins: 1–2 weeks</li>
                <li>20 ft office cabins: 3–4 weeks</li>
                <li>40 ft office cabins: 4–5 weeks</li>
                <li>Multi-container complexes: 6+ weeks</li>
                <li>Container laboratories: 4–8 weeks depending on complexity</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border bg-muted/20 p-8">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Procurement checklist</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {procurementChecklist.map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card px-4 py-3 text-muted-foreground shadow-card">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h3 className="font-display text-2xl font-semibold text-foreground mb-4">Sustainability and future of container-based construction</h3>
          <p className="text-muted-foreground leading-7 mb-6">
            Reusing cargo containers supports circular construction by extending the life of existing steel assets, reducing waste,
            and enabling faster site deployment with less disruption than conventional building methods.
          </p>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="limitations">
              <AccordionTrigger>Addressing limitations honestly</AccordionTrigger>
              <AccordionContent>
                Original marine coatings need proper treatment, timber floors often require replacement or sealing, Indian climate needs real insulation,
                and every structural cut must be reinforced to maintain frame integrity.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="future-trends">
              <AccordionTrigger>Future trends in container projects</AccordionTrigger>
              <AccordionContent>
                Demand is growing for hybrid PEB plus container structures, solar-ready roof systems, multi-storey office blocks,
                modular data centres, and specialized technical facilities in dense industrial corridors.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>

      {activeImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Shipping container image gallery"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close gallery overlay"
            onClick={() => setActiveImageIndex(null)}
          />

          <div className="relative z-10 flex w-full max-w-6xl items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={showPreviousImage} aria-label="Previous image">
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="relative flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-4 top-4 z-20"
                onClick={() => setActiveImageIndex(null)}
                aria-label="Close gallery"
              >
                <X className="h-5 w-5" />
              </Button>

              <OptimizedImage
                src={topGalleryImages[activeImageIndex].src}
                alt={topGalleryImages[activeImageIndex].alt}
                title={topGalleryImages[activeImageIndex].alt}
                className="max-h-[80vh] w-full"
                aspectRatio="auto"
                objectFit="contain"
                priority
              />

              <div className="border-t border-border bg-card/95 px-6 py-4">
                <p className="text-sm text-muted-foreground">{topGalleryImages[activeImageIndex].alt}</p>
              </div>
            </div>

            <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={showNextImage} aria-label="Next image">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
