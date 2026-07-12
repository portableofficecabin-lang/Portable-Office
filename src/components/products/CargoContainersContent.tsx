import Link from "next/link";
import { OptimizedImage } from "@/components/OptimizedImage";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Box,
  Truck,
  Shield,
  Thermometer,
  Home,
  Building2,
  HardHat,
  CheckCircle2,
  ArrowRight,
  Anchor,
  Factory,
  Leaf,
} from "lucide-react";

import cargoContainersMain from "@/assets/products/cargo-containers-main.webp";
import cargoContainersShipping from "@/assets/products/cargo-containers-shipping.webp";
import cargoContainersYard from "@/assets/products/cargo-containers-yard.webp";
import cargoContainersModular from "@/assets/products/cargo-containers-modular.webp";
import cargoContainersReefer from "@/assets/products/cargo-containers-reefer.webp";

const containerSizes = [
  { size: "20 ft GP", dimensions: "6.1m × 2.44m × 2.59m", volume: "~33 m³", use: "General freight, site offices" },
  { size: "40 ft GP", dimensions: "12.2m × 2.44m × 2.59m", volume: "~67 m³", use: "Large shipments, container homes" },
  { size: "40 ft High Cube", dimensions: "12.2m × 2.44m × 2.90m", volume: "~76 m³", use: "Voluminous cargo, premium offices" },
];

const quickGuide = [
  { scenario: "Exporting dry goods from India in 2026", recommendation: "20 ft or 40 ft General Purpose, or High Cube for lighter, bulkier items" },
  { scenario: "Heavy machinery or construction equipment", recommendation: "Flat Rack or Open Top for crane loading" },
  { scenario: "Perishable food, pharmaceuticals, vaccines", recommendation: "ISO Reefer or Super Freezer depending on temperature requirements" },
  { scenario: "On-site office for a 12–24 month project", recommendation: "20 ft or 40 ft Container Office by Portable Office Cabin" },
  { scenario: "Long-term labour accommodation on remote projects", recommendation: "Customised container homes or prefab labour colonies" },
  { scenario: "Rooftop café or canteen on existing building", recommendation: "Structural-checked container café with rooftop shed system" },
  { scenario: "Dense raw materials like ore or scrap", recommendation: "Half-Height containers for stability" },
  { scenario: "Chemicals or liquids in transit", recommendation: "ISO Tank Containers with proper certifications" },
];

const faqs = [
  {
    q: "What is the difference between a cargo container and a shipping container?",
    a: "The terms are largely interchangeable. 'Cargo container' emphasises the unit's role in carrying goods, while 'shipping container' refers to its use in maritime transport. Both follow ISO standards and can be repurposed for storage and modular buildings.",
  },
  {
    q: "What sizes of cargo containers are available in India?",
    a: "The most common sizes are 20 ft GP, 40 ft GP, and 40 ft High Cube. Specialised sizes include 10 ft containers for urban sites, 45 ft pallet-wide units for European trade, and half-height containers for dense bulk cargo.",
  },
  {
    q: "Can cargo containers be converted into offices or homes?",
    a: "Yes. Portable Office Cabin converts GP and High Cube containers into offices, homes, cafés, labour colonies, and security cabins with insulation, electrical fit-outs, HVAC, and plumbing—extending container life by 20–30 years.",
  },
  {
    q: "What is a High Cube container and when should I use one?",
    a: "A High Cube container stands 9 ft 6 in (2.90 m) tall—1 ft more than standard. It provides ~13% more volume, ideal for bulky cargo and modular building conversions where ceiling height improves comfort.",
  },
  {
    q: "How do I choose between new and used cargo containers?",
    a: "New containers offer pristine condition and 30+ year life but cost 50–100% more. Used wind-water-tight units suit static storage at 70–80% savings. For offices, refurbished or one-trip containers are recommended.",
  },
  {
    q: "What materials are cargo containers made from?",
    a: "Most containers use Corten (weathering) steel with 355 MPa yield strength and self-passivating corrosion resistance. Mild steel (IS 2062 Grade B) is 20–30% cheaper for inland use. Stainless steel (AISI 304/316L) serves food and pharma applications.",
  },
  {
    q: "Does Portable Office Cabin deliver cargo containers across India?",
    a: "Yes. We provide PAN-India delivery with hydraulic ramps, crane positioning, and grout foundations. Major hubs include Bengaluru, Chennai, Mumbai, Delhi, Hyderabad, Pune, and Ahmedabad.",
  },
  {
    q: "What certifications should I check when buying a cargo container?",
    a: "Verify the CSC plate for container number, max gross weight, tare weight, and approval dates. For transport use, CSC validity is essential. For static storage, physical condition matters more than paperwork.",
  },
];

export function CargoContainersContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Introduction to Cargo Containers</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Cargo containers are the steel backbone of global commerce. Since the 1960s, these standardised metal boxes have revolutionised how goods move across oceans, rail networks, and roads. Today, approximately 90% of non-bulk freight travels inside shipping containers, with ports worldwide handling 780 million TEUs in 2023 alone.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The International Organization for Standardization established standard sizes that remain foundational: 20 ft, 40 ft, and 40 ft High Cube units dominate the industry. A standard 20 ft container measures roughly 6.1 metres long, 2.44 metres wide, and 2.59 metres high externally. The 40 ft variant doubles the length while maintaining the same width and height profile.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              At Portable Office Cabin, we use the same ISO-grade containers and engineered steel frames as the foundation for modular offices, container homes, and site facilities. The structural integrity that protects goods during sea transport translates directly into durable, relocatable buildings.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cargoContainersMain)}
            alt="New cargo container with corten steel body and double doors at Portable Office Cabin yard in Bengaluru"
            className="rounded-xl shadow-lg"
            aspectRatio="4/3"
          />
        </div>

        {/* Size Table */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-primary/10">
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Size</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">External Dimensions</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Internal Volume</th>
                <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {containerSizes.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <td className="border border-border px-4 py-3 font-medium text-foreground">{row.size}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row.dimensions}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row.volume}</td>
                  <td className="border border-border px-4 py-3 text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Guide */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Quick Guide: Which Cargo Container Do You Need?</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Choosing the right container depends on what you're transporting or building. Here's a practical breakdown to help you make faster decisions, whether you're shipping goods internationally or setting up project infrastructure.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {quickGuide.map((item, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <p className="font-semibold text-foreground text-sm mb-1">{item.scenario}</p>
                <p className="text-muted-foreground text-sm flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  {item.recommendation}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Standard GP Containers */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Standard General Purpose Cargo Containers</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              General purpose containers, also called dry vans, are fully enclosed, weather-tight units designed to carry the vast majority of cargo types. They represent approximately 90% of all containers in global circulation.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Dimensions and capacity:</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                <li><strong>20 ft GP:</strong> External length 20 ft, width 8 ft, height 8 ft 6 in; payload limit ~28–29 tonnes</li>
                <li><strong>40 ft GP:</strong> External length 40 ft, width 8 ft, height 8 ft 6 in; payload limit ~26–27 tonnes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Construction features:</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                <li>Corten steel (weathering steel) structure for corrosion resistance</li>
                <li>Corrugated walls providing structural strength</li>
                <li>Plywood or bamboo floor capable of withstanding cargo pressure</li>
                <li>Double door cargo access with locking bars for complete weather protection</li>
              </ul>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm">
              <strong>Common cargo:</strong> Consumer goods, textiles, engineering components, packaged foods, furniture, electronics, and vegetables. These containers accommodate liner bags for dry bulk commodities and flexi-tanks for certain liquids.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Portable Office Cabin repurposes 20 ft and 40 ft GP containers into portable cabins, container offices, prefab classrooms, security booths, and micro-warehouses—delivering the same structural reliability for building applications.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cargoContainersYard)}
            alt="Stacked cargo containers at Indian port yard with crane handling operations by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* High Cube Containers */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">High Cube Containers for Extra Volume</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            High cube containers share the same footprint as standard GP units but stand 1 ft taller at 9 ft 6 in (2.90 m). They're mainly available as 40 ft and 45 ft units, offering roughly 13% more internal volume than standard height containers.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Key benefits:</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                <li>Extra internal height for bulky but lighter cargo</li>
                <li>Better stacking compatibility on ships and double-stack rail</li>
                <li>Compatible with gooseneck chassis for efficient truck transport</li>
                <li>Commonly used since 2020–2026 for e-commerce, textiles, electronics, and furniture shipments</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Why modular builders prefer High Cubes:</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                <li>Additional headroom simplifies false ceiling installation</li>
                <li>Better insulation and wiring spaces within walls</li>
                <li>More comfortable interior environments for occupants</li>
                <li>Enables loft storage in container homes</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Portable Office Cabin applications using 40 ft High Cube:</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
              <li>8–10 seat site offices with conference areas</li>
              <li>Container homes featuring loft storage</li>
              <li>Dual-cabin layouts with internal partitions</li>
              <li>Double-height reception areas by combining two stacked units</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Specialised Containers */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Specialised Cargo Containers for Project & Oversize Loads</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Not all cargo fits standard boxes. Project cargo, heavy goods, and awkwardly-shaped items require specially designed container solutions. These specialised containers maintain ISO frame dimensions for intermodal compatibility while offering unique loading configurations.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardContent className="p-6">
              <Box className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-bold text-foreground mb-2">Flat Rack Containers</h3>
              <p className="text-muted-foreground text-sm mb-2">Strong end walls without fixed side walls, with collapsible ends forming a flat platform for oversize loads.</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Available in 20 ft and 40 ft sizes</li>
                <li>• Loading capacity up to 40–45 metric tonnes</li>
                <li>• Typical cargo: excavators, generators, steel coils, wind turbine components</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <HardHat className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-bold text-foreground mb-2">Open Top & Hard Top Containers</h3>
              <p className="text-muted-foreground text-sm mb-2">Removable tarpaulins or steel roof panels for over-height cargo requiring crane loading.</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Standard 20 ft and 40 ft sizes</li>
                <li>• Industrial boilers, tall machinery, marble blocks</li>
                <li>• Hard top preferred for security and stackable strength</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <Building2 className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-bold text-foreground mb-2">Open Side & Double Door</h3>
              <p className="text-muted-foreground text-sm mb-2">Full-length side doors or doors on both ends for through-access and quick unloading.</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Long steel sections, timber, oversized pallets</li>
                <li>• Retail pop-up shops, container cafés</li>
                <li>• Exhibition stands and showrooms</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Temperature-Controlled Containers */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Temperature-Controlled Cargo Containers</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Global supply chain operations depend on temperature control for perishable goods. Fruits, meat, dairy, pharmaceuticals, and biologics require precise climate management during transit.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "ISO Reefer", range: "+25°C to -25°C", use: "Most perishables" },
                { type: "High Cube Reefer", range: "Same range, extra volume", use: "Bulk perishables" },
                { type: "Blast Freezer", range: "Rapid cooling", use: "Meat & seafood" },
                { type: "Super Freezer", range: "-60°C", use: "Sashimi-grade products" },
              ].map((item, i) => (
                <div key={i} className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-semibold text-foreground text-sm">{item.type}</p>
                  <p className="text-xs text-muted-foreground">{item.range}</p>
                  <p className="text-xs text-primary">{item.use}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              While Portable Office Cabin doesn't manufacture marine reefers, we integrate insulated container rooms, cold rooms, and food-grade prefab canteens for land-based applications. We can dock reefers to prefab buildings, creating integrated cold-chain warehouses and canteen storage.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cargoContainersReefer)}
            alt="Refrigerated cargo container with stainless steel interior for temperature-controlled storage by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Bulk, Liquid and Special Containers */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Bulk, Liquid and Special Cargo Containers</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Some cargo is too dense, fluid, or hazardous for standard dry containers. Dedicated bulk and tank units follow ISO frame standards externally while differing significantly in internal structure.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-2">Half-Height Containers</h3>
              <p className="text-muted-foreground text-sm">Lower-profile, heavy-duty boxes for ore, coal, stones, and scrap metal. Lower centre of gravity improves stability. Easier loading by excavator without specialised equipment.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-2">ISO Tank Containers</h3>
              <p className="text-muted-foreground text-sm">Cylindrical tanks within a 20 ft ISO frame, constructed from stainless steel. Used for food-grade liquids, chemicals, solvents, fuels, and liquefied gases. Safe filling: 80–95% capacity.</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-2">Swap Bodies</h3>
              <p className="text-muted-foreground text-sm">Non-stackable containers without upper corner fittings, primarily for road and rail in Europe. Convertible tops enable side and top loading. Growing in door-to-door distribution.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Regional Variations */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Regional Variations in Cargo Container Design</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          While ISO standards dominate international shipping, different regions have adapted container dimensions for local road limits, rail clearances, and pallet sizes.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">North American 53 ft Containers</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• 48 ft (introduced ~1986) and 53 ft (since ~1989)</li>
              <li>• Often 102 in (2.59 m) wide, 9 ft 6 in high</li>
              <li>• Widely used on double-stack trains and trucks</li>
              <li>• Internal volume up to 60% greater than standard 40 ft</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">European Pallet-Wide Containers</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Increased internal width (~2.44 m) with shallower corrugations</li>
              <li>• Accommodates two Euro pallets side by side</li>
              <li>• 45 ft pallet-wide High Cube replacing older swap bodies</li>
              <li>• Ideal for automotive, FMCG, and retail logistics</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Australian & Japanese Containers</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Australian RACE: slightly wider, sometimes 41 ft long</li>
              <li>• Optimised for Australian Standard Pallets</li>
              <li>• Japanese 12 ft: domestic freight on narrow-gauge rail</li>
              <li>• Demonstrate local infrastructure adaptation</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Containerization History */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">The Rise of Containerization & Global Standards</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(cargoContainersShipping)}
            alt="Cargo containers being loaded onto vessel with crane at major Indian port - global containerization standards"
            className="rounded-xl shadow-lg"
            aspectRatio="16/9"
          />
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Container shipping transformed global trade through standardisation. Before containers, longshoremen manually handled individual crates, barrels, and boxes—consuming massive time and costs.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Key milestones:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• <strong>1932:</strong> Enola, Pennsylvania container terminal for rail freight</li>
                <li>• <strong>1948–1952:</strong> US military "Transporter" and CONEX boxes</li>
                <li>• <strong>1956:</strong> Malcolm McLean's first container vessel voyage</li>
                <li>• <strong>1968–1970:</strong> Publication of ISO container standards</li>
                <li>• <strong>1972:</strong> International Convention for Safe Containers (CSC)</li>
              </ul>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Standardised dimensions, corner castings, and twistlocks enabled safe stacking, crane handling, and intermodal transport worldwide. Handling time decreased 27.3% while theft and damage dropped significantly inside sealed steel boxes. By the 2020s, mega-ships carrying over 19,000 TEU rely entirely on standardised containers.
            </p>
          </div>
        </div>
      </section>

      {/* 2020-2026 Supply Chain */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Cargo Containers in the 2020–2026 Supply Chain</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The COVID-19 pandemic exposed global dependence on container availability and port capacity. Container shortages, port congestion, and freight rate spikes affected Asia–Europe and trans-Pacific routes throughout 2020–2021.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardContent className="p-5">
                <Anchor className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-bold text-foreground mb-2 text-sm">Current Fleet</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• ~90% dry freight GP units</li>
                  <li>• Predominantly 20 ft and 40 ft sizes</li>
                  <li>• Growing High Cube share</li>
                  <li>• Over 17 million containers globally</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <Shield className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-bold text-foreground mb-2 text-sm">Modernisation Trends</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Improved corrosion protection</li>
                  <li>• RFID and GPS tracking</li>
                  <li>• Smart containers with sensors</li>
                  <li>• Enhanced security screening</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <Factory className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-bold text-foreground mb-2 text-sm">India's Growth</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Mundra, JNPT, Chennai throughput rising</li>
                  <li>• Expanding ICDs and logistics parks</li>
                  <li>• Growing container handling demand</li>
                  <li>• POC supports with site offices & colonies</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Cargo to Modular Building */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">From Cargo Container to Modular Building</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Container architecture emerged around 2000 as developers recognised the potential of repurposing used shipping containers for buildings. The same structural strength protecting freight during ocean voyages creates durable, relocatable structures on land.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Building types using containers:</h3>
              <div className="grid grid-cols-2 gap-2">
                {["Container homes & guest houses", "Container offices", "Rooftop cafés", "Prefab canteens", "Security booths", "Classrooms & labs"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Advantages for developers:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Fast deployment: typically 30–60 days from design to installation</li>
                <li>• Factory-controlled quality and consistent finishes</li>
                <li>• High structural strength from original container frame</li>
                <li>• Relocatability for project-based applications</li>
                <li>• Better value versus conventional RCC for short to medium-term projects</li>
              </ul>
            </div>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cargoContainersModular)}
            alt="Modular container home conversion with wooden deck and glass facade by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Container Offices */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Container Offices & Project Site Infrastructure</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Construction companies, infrastructure developers, and industrial plants across India rely on container-based offices for speed and flexibility. These units arrive fully fitted, connect to power, and begin operations within days rather than months.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-2">20 ft Container Office</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• 2–4 workstations with small meeting area</li>
                  <li>• Air conditioning, LED lighting, basic storage</li>
                  <li>• Steel frame with insulated sandwich panels</li>
                  <li>• Vinyl or laminate flooring</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-2">40 ft Container Office</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• 8–10 workstations with conference area</li>
                  <li>• Manager's cabin and server nook</li>
                  <li>• Multiple AC units for climate control</li>
                  <li>• Concealed wiring and modular furniture</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground text-sm">
            <strong>Popular configurations (2023–2026):</strong> Double-stacked site offices with external staircase, combined office plus store containers, and administration blocks from 4–10 joined containers for large infrastructure projects.
          </p>
        </div>
      </section>

      {/* Container Homes & Labour Colonies */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Container Homes, Labour Colonies & Accommodation</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Container-based accommodation addresses both temporary labour housing and semi-permanent residential needs with standardised, scalable solutions.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Labour colonies for construction and industrial sites:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Dormitory layouts with bunk beds</li>
                <li>• Shared toilet and bathing facilities</li>
                <li>• Mess areas and recreational zones</li>
                <li>• Cross-ventilation and thermal insulation</li>
                <li>• Scalable from 20–30 workers to 500+ occupants</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Premium container homes:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• 1BHK, 2BHK, and studio layouts in 20 ft and 40 ft HC</li>
                <li>• Windows, sliding doors, modular kitchens</li>
                <li>• Premium bathrooms with modern fixtures</li>
                <li>• Deck extensions for outdoor living space</li>
                <li>• Applications: farmhouses, holiday homes, staff quarters</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cafés, Canteens & Rooftop Sheds */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Container Cafés, Prefab Canteens & Rooftop Sheds</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Container cafés and prefab canteens have emerged across Indian cities since approximately 2015, accelerating after 2020 for quick, flexible food and beverage setups.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-2 text-sm">20 ft Café Module</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Front service counter with glazing</li>
                  <li>• Back-of-house pantry with sink</li>
                  <li>• Electrical for coffee machines, ovens</li>
                  <li>• Food-grade finishes and ventilation</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-2 text-sm">40 ft Canteen Module</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Kitchen zone plus serving counter</li>
                  <li>• Space for tables and seating</li>
                  <li>• Connection to rooftop shed</li>
                  <li>• Suitable for industrial canteens</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-2 text-sm">Rooftop Sheds</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Structural steel over containers</li>
                  <li>• Shade and rain protection</li>
                  <li>• Wind load and waterproofing design</li>
                  <li>• Year-round operation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Cabins, Toilets & Utility */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Portable Security Cabins, Toilets & Utility Modules</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Shield, title: "Security Cabins", items: ["4×4 to 8×8 ft sizes", "Three-side windows", "Counter, fan/AC, lighting"] },
            { icon: Home, title: "Portable Toilets", items: ["Single or multi-cabin", "FRP or sandwich panel", "Anti-slip floor, ventilation"] },
            { icon: HardHat, title: "Guard & Power Rooms", items: ["Control rooms", "Compressor rooms", "Pump houses"] },
            { icon: Truck, title: "Wash & Lab Blocks", items: ["Worker hygiene facilities", "QC testing labs", "Brand-customised modules"] },
          ].map((item, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <item.icon className="w-6 h-6 text-primary mb-2" />
                <h3 className="font-bold text-foreground text-sm mb-2">{item.title}</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  {item.items.map((li, j) => <li key={j}>• {li}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Design, Safety & Compliance */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Design, Safety & Compliance When Reusing Cargo Containers</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Structural assessment:</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Evaluate container age, rust, and damage at corner posts and floor beams</li>
              <li>• Assess impact of cutting large openings on structural integrity</li>
              <li>• Install reinforcement frames around doors and windows</li>
            </ul>
            <h3 className="font-semibold text-foreground">Health and comfort:</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Remove or seal floors with potential pesticide residues</li>
              <li>• Add insulation (PUF, EPS, or rockwool panels) for Indian heat and monsoon conditions</li>
              <li>• Ensure proper ventilation and correctly sized HVAC</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Fire and code compliance:</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Use fire-rated panels or linings where required</li>
              <li>• Meet local building bylaws for offices, schools, or accommodation</li>
              <li>• Obtain necessary occupancy certifications</li>
            </ul>
            <h3 className="font-semibold text-foreground">Services design:</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Electrical safety with MCBs and proper earthing</li>
              <li>• Provision for IT cabling, CCTV, and access control</li>
              <li>• Plumbing, drainage, and rainwater management</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Sustainability & Lifecycle Benefits</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Container-based construction supports environmental objectives through resource efficiency and extended material lifecycles.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Leaf, label: "Extended container life", desc: "Repurposing decommissioned units" },
                { icon: Factory, label: "Reduced waste", desc: "Off-site fabrication minimises debris" },
                { icon: Truck, label: "Relocatable", desc: "Disassembly and reuse at new sites" },
                { icon: Shield, label: "Lower carbon", desc: "Vs new steel for time-bound projects" },
              ].map((item, i) => (
                <div key={i} className="bg-muted/50 p-3 rounded-lg">
                  <item.icon className="w-5 h-5 text-primary mb-1" />
                  <p className="font-semibold text-foreground text-xs">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              Portable Office Cabin supports relocation and reuse planning, buy-back options for certain unit types, design with recyclable materials, and rainwater harvesting around container colonies and rooftop sheds.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Energy performance:</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Insulation and reflective roof critical for Indian climates</li>
              <li>• LED lighting reduces operational energy</li>
              <li>• Efficient HVAC design minimises power consumption</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to Choose */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">How to Choose the Right Cargo Container or Modular Solution</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Selecting the appropriate container or modular solution requires systematic evaluation of your specific requirements.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Decision factors:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Purpose: shipping versus on-site building</li>
                <li>• Duration: temporary versus permanent installation</li>
                <li>• Space constraints and site access</li>
                <li>• Climate and insulation needs</li>
                <li>• Regulatory requirements and approvals</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Step-by-step approach:</h3>
              <ol className="text-muted-foreground text-sm space-y-1 list-decimal pl-4">
                <li>Define capacity needs: TEU for shipping, occupants or workstations for buildings</li>
                <li>Select container type: GP, High Cube, or specialised</li>
                <li>Consider modifications: doors, windows, partitions, services</li>
                <li>Check transport logistics: crane accessibility and delivery route</li>
                <li>Plan for future: relocation capability or expansion potential</li>
              </ol>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Portable Office Cabin guides customers through these steps, from concept and design through manufacturing, delivery, and installation across India. Prepare basic site data—location, access conditions, and layout sketches—before engaging to speed up proposals and costing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Get Started with Cargo Containers?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Whether you need raw containers for storage, converted modular buildings, or complete prefab solutions, Portable Office Cabin delivers end-to-end services across India. With 500+ completed projects, we bring engineering expertise and reliable execution to every project.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/contact">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get a Free Quote
            </Button>
          </Link>
          <a href="tel:+919731897976">
            <Button size="lg" variant="outline">
              Call +91-9731897976
            </Button>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
