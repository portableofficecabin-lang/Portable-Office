import Link from "next/link";
import { Shield, Building, Factory, Landmark, School, Hospital, Truck, CheckCircle, ArrowRight, Phone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import securityCabinResidential from "@/assets/products/security-cabin-residential-gate.webp";
import securityCabinIndustrial from "@/assets/products/security-cabin-industrial-gate.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

// Cabin families and where each one fits. No price column: the cabin sold on this page has
// one fixed, GST-inclusive price (shown in the header above), and publishing ranges alongside
// it would contradict the cart, the JSON-LD offer and the Merchant Center feed.
const cabinTypeRows = [
  ["Entry-level MS cabins (4'×4')", "Gates, small sites"],
  ["Mid-range GI/FRP cabins (6'×4' – 8'×5')", "Industrial, coastal"],
  ["Premium Steel/PUF cabins (8'×6'+)", "Plants, pharma, labs"],
  ["ACP modern cabins", "Corporate campuses"],
  ["Container office cabins (20–40 ft)", "Command centres"],
];

const applicationAreas = [
  { icon: Building, label: "Gated communities & residential townships" },
  { icon: Factory, label: "Industrial plants, warehouses & SEZs" },
  { icon: School, label: "Educational institutes & hospitals" },
  { icon: Landmark, label: "Toll plazas, metro & rail projects" },
  { icon: Hospital, label: "Government offices & police checkpoints" },
  { icon: Truck, label: "Construction sites & logistics hubs" },
];

const faqs = [
  {
    q: "What sizes are available for portable security cabins?",
    a: "Standard sizes range from 3'×3' compact kiosks to 10'×8' multi-person cabins. Popular mid-sizes include 4'×4', 4'×6', 6'×4', and 8'×5'. Custom dimensions are available on request to match specific site requirements."
  },
  {
    q: "Which material is best for security cabins — MS, GI, or FRP?",
    a: "MS (mild steel) is the most economical option for standard sizes. GI offers 20–30% better corrosion resistance — ideal for coastal or high-rainfall areas. FRP is maintenance-free and corrosion-proof, best for institutional and corporate settings. Choose based on location, budget, and expected service life."
  },
  {
    q: "How long does a security cabin last?",
    a: "MS cabins last 10–15 years with periodic repainting. GI cabins serve 12–18 years with minimal maintenance. Steel and container-based units can last 15–25 years. FRP cabins offer 15+ years with virtually no corrosion maintenance required."
  },
  {
    q: "Can security cabins be air-conditioned?",
    a: "Yes. All cabin types come with pre-provisioned AC cut-outs, drainage provisions, and adequate electrical capacity for split AC units. PUF-insulated cabins offer the best energy efficiency for air-conditioned applications."
  },
  {
    q: "What is the delivery timeline for security cabins?",
    a: "Standard sizes ship within 7–15 working days. Fully customised designs or bulk orders take 15–25 days. Stock configurations may ship within one week. Metro city delivery is typically faster than remote locations."
  },
  {
    q: "Can security cabins be relocated?",
    a: "Yes. MS portable security cabins feature forklift pockets and lifting hooks for easy relocation. Transport and crane setup for a later move are arranged and quoted separately at the time. Cabins can be safely relocated 4–6 times with structural integrity checks."
  },
  {
    q: "Do I need permissions to install a security cabin?",
    a: "Temporary structures under 200 sq m often need minimal permissions. For placements exceeding one year, check with local panchayat or municipal authorities. Most gate-level security cabins don't require formal building approvals."
  },
  {
    q: "What is the minimum order quantity for security cabins?",
    a: "Single units are available for most MS, GI, FRP, and steel security cabins — the cabin listed on this page can be ordered as one unit at the price shown. PVC cabins may have minimum order quantity requirements (e.g., 5 units). Bulk orders of 10+ units are quoted separately by our sales team."
  },
];

export function SecurityCabinContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Security Cabin – Portable Security Guard & Watchman Cabins for All Sites
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Security cabins have become essential infrastructure across India in 2026. From residential society gates to industrial plants, toll plazas, and construction sites, these prefabricated structures provide protected working environments for security personnel manning entry points and checkpoints.
            </p>
            <p>
              We manufacture and supply a complete range of portable security cabins including MS, GI, FRP, ACP, PVC, PUF, and steel variants with pan-India delivery. Every cabin is engineered for durability, weather resistance, quick installation, and minimal maintenance requirements.
            </p>
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-foreground mb-2">Product families covered:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Portable security guard cabins (MS, GI, steel)</li>
                <li>FRP security cabins and ACP security cabins</li>
                <li>PVC and PUF insulated cabins</li>
                <li>Prefabricated security cabins and modern designs</li>
                <li>Specialised: police booths, toll booths, container offices</li>
              </ul>
            </div>
          </div>
          <OptimizedImage
            src={resolveImageUrl(securityCabinResidential)}
            alt="Portable security guard cabin at residential gate entrance with boom barrier in Bangalore"
            className="rounded-xl shadow-lg"
            aspectRatio="16/10"
            productName="Security Cabin"
          />
        </div>
      </section>

      {/* Portable Security Guard Cabin */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Portable Security Guard Cabin</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A portable security guard cabin serves as a compact shelter for guards stationed at residential gates, industrial entrances, and commercial complexes. These cabins are designed for single or two-person operations with quick deployment capabilities.
            </p>
            <h4 className="font-semibold text-foreground">Standard sizes available:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>4' × 4' × 8' (compact single-guard)</li>
              <li>4' × 6' × 8.5' (two-person use)</li>
              <li>6' × 6' × 8.5' (enhanced space)</li>
              <li>Custom sizes on request</li>
            </ul>
            <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
              <strong className="text-foreground">Pricing:</strong> The cabin sold on this page is priced at the amount shown above, inclusive of 18% GST. Transport and optional installation are calculated at checkout from your delivery pincode.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Key construction features:</h4>
            <ul className="space-y-2">
              {[
                "Insulated wall panels (40–60mm thickness)",
                "Powder-coated MS door and windows",
                "Ergonomic writing counter at 2.5–3 feet height",
                "Anti-skid flooring with FRP coating",
                "Basic electrical fittings with MCB protection",
                "Exterior weather-proof paint system",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Typical applications:</strong> Society gate security, factory guard room, school entrance monitoring, warehouse checkpoint, temporary event security point.
            </p>
          </div>
        </div>
      </section>

      {/* Steel Security Cabin */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Steel Security Cabin</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              When structural strength and vandal resistance matter most, a steel security cabin delivers exceptional long-term value. These robust units serve industrial plants, ports, and logistics hubs where durability is non-negotiable.
            </p>
            <h4 className="font-semibold text-foreground">Technical specifications:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>MS or steel sheet outer skin (1–1.6mm thickness)</li>
              <li>Internal insulation with glass wool or mineral wool</li>
              <li>Square-tube frame construction</li>
              <li>Epoxy or PU coated exterior finish</li>
              <li>Heavy-duty door with mortise lock</li>
              <li>Safety glass windows</li>
            </ul>
            <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
              <strong className="text-foreground">Note:</strong> Steel variants such as the 8' × 6' × 8.5' cabin are built to order and quoted separately, as insulation thickness, AC provision, and interior finishes change the specification.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Optional add-ons:</h4>
            <ul className="space-y-2">
              {[
                "Split AC cut-outs with drainage provision",
                "Additional plug points and fan point",
                "LED lighting system",
                "CCTV conduit routing",
                "External weather canopy",
                "Fire extinguisher mounting bracket",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Steel cabins cost more than standard portable guard cabins but offer significantly longer service life and reduced maintenance over time.
            </p>
          </div>
        </div>
      </section>

      {/* GI Section */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">GI Portable Security Cabin</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              GI (Galvanized Iron) portable security cabins occupy a mid-segment position, offering superior corrosion resistance compared to plain MS at competitive pricing. The galvanization process creates an inherent protective barrier against rust.
            </p>
            <h4 className="font-semibold text-foreground">Construction details:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Hot-dip galvanized exterior sheet</li>
              <li>MS structural framework</li>
              <li>Insulated panel walls (40–60mm)</li>
              <li>Powder-coated aluminum sliding window with grill</li>
              <li>Single FRP or metal door</li>
            </ul>
            <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
              <strong className="text-foreground">Note:</strong> GI cabins in 6' × 4' and larger 8' × 6' formats are built to order and quoted separately from the unit listed on this page.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(securityCabinIndustrial)}
            alt="GI portable security cabin at industrial gate entrance with boom barrier in India"
            className="rounded-xl shadow-lg"
            aspectRatio="16/10"
            productName="GI Security Cabin"
          />
        </div>
      </section>

      {/* GI Guard Cabin Details */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">GI Security Cabin & GI Security Guard Cabin</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              The distinction between a generic GI security cabin and a GI security guard cabin lies in optimisation. Guard cabins feature compact footprints with integrated writing counters designed specifically for single-guard deployment.
            </p>
            <h4 className="font-semibold text-foreground">Popular guard cabin sizes (l × b):</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>4' × 4' (compact gate duty)</li>
              <li>4' × 5' (enhanced comfort)</li>
              <li>5' × 5' (standard recommendation)</li>
              <li>Height: typically 8'–8.5' for comfortable standing</li>
            </ul>
            <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
              <strong className="text-foreground">Note:</strong> A 7' × 4' GI security guard cabin is a made-to-order size and is quoted separately once fittings are confirmed.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Guard-specific design features:</h4>
            <ul className="space-y-2">
              {[
                "3-side visibility with sliding windows",
                "Inside and outside counters for documentation",
                "Insulated roof overhang (1–2 feet) for rain protection",
                "Provision for fan and light points",
                "Internal switchboard at ergonomic height (4.5–5 feet)",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* MS Section */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">MS Portable & MS Security Cabins</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            MS (mild steel) portable cabins remain the most widely used, economical option for security applications across India. The material allows easy fabrication and supports rapid customization for various site requirements.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Example configurations:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>4' × 4' × 8.5' MS security cabin for small gates</li>
                <li>4' × 6' × 8.6' cabin for two-person operations</li>
                <li>6' × 4' cabin with 60mm wall thickness for better insulation</li>
              </ul>
              <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20 mt-3">
                <strong className="text-foreground">Note:</strong> Single-guard MS sizes other than the unit listed on this page are made to order and quoted separately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Features summary:</h4>
              <ul className="space-y-2">
                {[
                  "1–1.2mm MS sheet construction",
                  "Square tube framing",
                  "Glass wool or mineral wool insulation",
                  "18mm plywood flooring with coating",
                  "Basic electrical points with MCB",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm italic">
            <strong>Key distinction:</strong> An MS portable security cabin emphasises ease of movement (forklift pockets, lifting hooks), while a standard MS security cabin may be more permanent with foundation integration and heavier section thickness.
          </p>
        </div>
      </section>

      {/* Outdoor & Gate Cabins */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Outdoor MS Security Cabin & Gate Security Cabins</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Outdoor MS security cabins are engineered specifically for continuous exposure, featuring enhanced coatings, proper roof slope, and rainwater management systems. Gate security cabins integrate with boom barriers, RFID readers, and CCTV systems for comprehensive access control.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Construction", detail: "MS sheet walls with glass wool insulation, laminated interior panels" },
              { label: "Visibility", detail: "270° viewing angle with weather sheds on windows, toughened glass option" },
              { label: "Utilities", detail: "Provision for AC/exhaust fan, console area for registers and computers" },
            ].map((item, i) => (
              <div key={i} className="bg-background rounded-lg p-4 border">
                <h4 className="font-semibold text-foreground text-sm mb-1">{item.label}</h4>
                <p className="text-xs">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
            <strong className="text-foreground">Note:</strong> Outdoor 4' × 4' and 4' × 6' configurations are made to order. Accessories such as air-conditioning, extra glazing, and branding panels change the specification and are quoted separately.
          </p>
        </div>
      </section>

      {/* FRP & ACP */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">FRP & ACP Security Cabins</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              FRP (Fibre Reinforced Plastic) security cabins offer lightweight, corrosion-free performance ideal for coastal, industrial, and institutional environments. These cabins require no repainting or rust prevention measures.
            </p>
            <h4 className="font-semibold text-foreground">FRP configurations:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Sizes: 8' × 5' × 8' and 4' × 4'</li>
              <li>Two-track aluminium sliding window</li>
              <li>FRP door with quality material finish</li>
              <li>18mm ply flooring with FRP coating</li>
              <li>Pyramid or Kaul style FRP roof</li>
            </ul>
            <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
              <strong className="text-foreground">Note:</strong> FRP and ACP cabins are a different build from the steel cabin listed on this page and are quoted separately.
            </p>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              ACP security cabins (e.g., 4' × 4' × 9') use aluminium composite panel cladding for modern facades at corporate campuses and commercial projects where visual presentation carries significant weight.
            </p>
            <h4 className="font-semibold text-foreground">Key benefits:</h4>
            <ul className="space-y-2">
              {[
                "Smooth finish, attractive design",
                "Low maintenance, no corrosion",
                "Colour customisation available",
                "Integrated electrical points and writing counters",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PVC & PUF */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">PVC & PUF Security Cabins</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <h4 className="font-semibold text-foreground">PVC security cabins:</h4>
            <p>Cost-effective, easy-to-clean solutions made from PVC or Sintex-type panel systems. Ideal for residential societies, ticket counter applications, and temporary setups requiring frequent relocation.</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Light weight, quick installation</li>
              <li>Washable surfaces</li>
              <li>Good thermal performance with insulation</li>
            </ul>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <h4 className="font-semibold text-foreground">PUF security cabins:</h4>
            <p>Polyurethane Foam insulated solutions for hospitals, laboratories, pharma plants, cold-chain facilities, and noise-sensitive sites.</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Starting sizes from 3' × 3'</li>
              <li>Modular expansion options</li>
              <li>Hidden electrical conduits inside panels</li>
              <li>Superior thermal efficiency</li>
            </ul>
            <p className="text-xs italic">PUF cabins command premium pricing but offer energy savings in air-conditioned applications.</p>
          </div>
        </div>
      </section>

      {/* Prefabricated & Modern */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Prefabricated & Modern Security Cabins</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Prefabricated security cabin units ship factory-built and ready-to-install, minimising on-site disruption while ensuring consistent quality across multiple locations. Modern designs feature sleek rectangular forms with concealed wiring, large glazed panels, integrated LED lighting, and company branding panels.
          </p>
          <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/20">
            <strong className="text-foreground">Note:</strong> Modern and prefabricated variants are configured to the site — custom glass, surface treatment, and built-in amenities are specified and quoted per project.
          </p>
        </div>
      </section>

      {/* Specialised Cabins */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Specialised Cabins: Police Booths, Toll Booths & Container Offices</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-background rounded-lg p-5 border">
            <h4 className="font-semibold text-foreground mb-2">Portable Police Booths</h4>
            <p className="text-sm text-muted-foreground">Robust, high-visibility structures for junctions, public events, and checkpoints. Features signage mounting points and siren/light provisions.</p>
          </div>
          <div className="bg-background rounded-lg p-5 border">
            <h4 className="font-semibold text-foreground mb-2">Portable Toll Booths</h4>
            <p className="text-sm text-muted-foreground">Compact cabins with large front glazing, money handling counter, and cable routing for toll systems. Built to order and quoted per project.</p>
          </div>
          <div className="bg-background rounded-lg p-5 border">
            <h4 className="font-semibold text-foreground mb-2">Container Office Cabins</h4>
            <p className="text-sm text-muted-foreground">20 ft or 40 ft units serving as control rooms or security command centres with AC, CCTV monitoring desks, and meeting areas. Quoted per project.</p>
          </div>
        </div>
      </section>

      {/* Cabin types, lead times & ordering */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Cabin Types, Lead Times & Ordering Process</h2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Category</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Best For</th>
              </tr>
            </thead>
            <tbody>
              {cabinTypeRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="border border-border px-4 py-3 font-semibold text-foreground">{row[0]}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          The security cabin listed on this page is sold at the single price shown above, inclusive of 18% GST. Transport and optional installation are added at checkout from your delivery pincode. Other materials, sizes and custom layouts are quoted separately.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-foreground mb-2">Standard delivery time:</h4>
            <p className="text-sm text-muted-foreground">7–15 working days for common sizes; 15–25 days for fully customised designs or large orders. One week turnaround possible for stock configurations.</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Ordering steps (custom cabins):</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Site assessment or client brief</li>
              <li>Selection of size and material</li>
              <li>Drawing/layout approval</li>
              <li>Final quotation</li>
              <li>Order confirmation and fabrication</li>
              <li>Dispatch and installation guidance</li>
            </ol>
            <p className="mt-2 text-sm text-muted-foreground">
              The standard cabin listed on this page skips all of that — add it to the cart and pay the full price shown online.
            </p>
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="bg-muted/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Applications & Industries Using Security Cabins</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {applicationAreas.map((app, i) => (
            <div key={i} className="flex items-center gap-3 bg-background rounded-lg p-4 border">
              <app.icon className="w-5 h-5 text-accent shrink-0" />
              <span className="text-sm text-muted-foreground">{app.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Why Choose Our Security Cabins</h2>
        <div className="grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
          <div>
            <h4 className="font-semibold text-foreground mb-2">Our strengths:</h4>
            <ul className="space-y-2">
              {[
                "Design flexibility across all material categories",
                "Adherence to quality standards with tested raw materials",
                "Experienced fabrication teams",
                "Support for site measurements and material selection guidance",
                "Transport logistics assistance",
                "After-sales support for repairs or modifications",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Long-term value:</h4>
            <ul className="space-y-2">
              {[
                "Low maintenance coatings",
                "Corrosion-resistant construction",
                "Relocation capability to new projects",
                "Compatibility with modern security equipment",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent/10 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Get Your Security Cabin Quote Today</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Send your enquiry with required size, location, and preferred material. Our team will provide a customised quote with complete specifications.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
          >
            Request a Quote <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+919731897976"
            className="inline-flex items-center gap-2 border border-accent text-accent px-6 py-3 rounded-lg font-semibold hover:bg-accent/5 transition-colors"
          >
            <Phone className="w-4 h-4" /> +91-9731897976
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions About Security Cabins</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
