import Link from "next/link";
import { Package, Shield, Truck, Factory, Wrench, CheckCircle, Building2, Thermometer, Anchor, HardHat, ArrowRight } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import cargoStoragePort from "@/assets/products/cargo-storage-containers-port.webp";
import cargoStorageInspection from "@/assets/products/cargo-storage-containers-inspection.webp";
import cargoStorage20ft from "@/assets/products/cargo-storage-containers-20ft.webp";
import cargoStorage40ft from "@/assets/products/cargo-storage-containers-40ft.webp";
import cargoStorageISO from "@/assets/products/cargo-storage-containers-iso.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const pricingRows = [
  ["20 ft Used GP", "₹90,000–₹1,40,000", "Based on 2015–2020 build year, CSC status, rust grade"],
  ["40 ft Used GP", "₹1,40,000–₹2,10,000", "Condition-dependent, vary depending on source port"],
  ["40 ft HC Used", "₹1,60,000–₹2,30,000", "Premium for extra height, popular for conversions"],
  ["40 ft Working Reefer", "₹3,00,000–₹5,00,000", "Functional plug-in genset, compressor 13.5E class"],
  ["DNV 2.7-1 Offshore (10–20 ft)", "₹2,50,000–₹4,00,000", "Blast-proof certifications"],
];

const containerTypes = [
  { icon: Package, title: "General Purpose (Dry)", desc: "Fully enclosed double-door steel box with EPDM seals. Handles 90% of global non-perishable trade. Excellent for on-site storage of tools, cement, electronics, and textiles." },
  { icon: Building2, title: "High Cube", desc: "15% more internal volume than standard units. Additional headroom makes them ideal for container office conversions and container homes with ceiling heights exceeding 2.5 metres." },
  { icon: Wrench, title: "Open Top", desc: "Removable tarpaulin roofs for crane loading of over-height cargo like turbines and heavy machinery reaching heights up to 2.7 metres." },
  { icon: Anchor, title: "Flat Rack", desc: "Collapsible end walls with open sides, rated for 40-ton point loads. Transport vehicles, steel coils, excavators via slings or chains." },
  { icon: Truck, title: "Double Door & Open Side", desc: "Access from both ends or full side access. Speeds loading/unloading by 30–50% in confined depots. Ideal for warehousing and pop-up retail." },
  { icon: Thermometer, title: "Reefer (Refrigerated)", desc: "Precise temperature control from -30°C to +30°C with ±0.25°C accuracy. Vital for pharmaceutical and frozen food exports." },
];

const applications = [
  { icon: Anchor, title: "Ports & Logistics", desc: "Stacked storage at JNPT, Mundra, Chennai — 10+ high stacking for throughput exceeding 1 million TEUs annually." },
  { icon: HardHat, title: "Construction & Infrastructure", desc: "Site storage for cement, steel, MEP equipment. Temporary offices, testing labs, and worker accommodation near highways and metro rail projects." },
  { icon: Building2, title: "Education & Corporate", desc: "Temporary classrooms, training rooms, libraries, corporate office extensions, and conference facilities." },
  { icon: Factory, title: "Industrial & Warehousing", desc: "Secure storage for spare parts, hazardous goods with proper ventilation, inventory overflow, and maintenance workshops." },
  { icon: Shield, title: "Government & NGO", desc: "Emergency shelters, mobile clinics, disaster-relief depots, temporary housing, and administrative offices in remote areas." },
];

const gradeTable = [
  ["Export / International shipping", "Cargo-worthy (CSC valid)"],
  ["Static storage on-site", "Wind & water-tight (WWT)"],
  ["Offices and accommodation", "Refurbished with modifications"],
  ["Short-term / budget use", "AS IS — inspect carefully, assess repair costs"],
];

const faqs = [
  { q: "What is the price of a 20 ft used cargo storage container in India?", a: "Used 20 ft GP containers typically range from ₹90,000 to ₹1,40,000 depending on build year (2015–2020 preferred), CSC status, rust grade, and source port. Prices fluctuate with steel and freight market conditions." },
  { q: "What is the difference between cargo-worthy and wind & water-tight containers?", a: "Cargo-worthy (CW) containers have valid CSC approval for continued sea transport with minor wear acceptable. Wind & water-tight (WWT) units may have minor dents but are suitable for static storage — they keep weather out but aren't certified for shipping." },
  { q: "Can cargo containers be converted into offices or homes?", a: "Yes. Portable Office Cabin converts GP and HC containers into fully equipped offices, homes, cafés, and labour colonies using frame-preserving cuts, welding reinforcements per IS 800, PUF insulation panels, and comprehensive electrical and plumbing fit-outs." },
  { q: "What steel types are used in cargo storage containers?", a: "Three main types: Corten (weathering) steel (ASTM A588, 355 MPa yield, self-passivating) is the industry standard. Mild steel (IS 2062 Grade B, 250 MPa) costs 20–30% less but needs protective coatings. Stainless steel (AISI 304/316L) is used for food and pharmaceutical applications." },
  { q: "What sizes of cargo containers are available in India?", a: "The most common are 20 ft GP (33 m³ internal volume) and 40 ft GP (67 m³). High cube variants add 30.5 cm height. Specialized sizes include 10 ft (for urban sites), 45 ft pallet-wide, and half-height units for dense bulk cargo." },
  { q: "How do I inspect a used container before buying?", a: "Check corner posts for bending, wall thickness with ultrasonic gauging, roof for pinholes, door alignment and seal compression, lock rod operation, and marine plywood floor for delamination or rot. Verify CSC plate details and manufacture date (post-2010 preferred)." },
  { q: "What maintenance does a cargo container need?", a: "Annual repainting with epoxy coating (80 μm minimum), rust treatment at first signs, lubricate hinges with lithium EP2 grease, roof inspection after monsoon, pest treatment for timber floors, and clear drainage around the base." },
  { q: "Does Portable Office Cabin deliver across India?", a: "Yes. Portable Office Cabin provides PAN-India delivery with hydraulic ramps for safe transport, crane positioning, and grout foundations for installation. Over 500 projects completed with ISO 9001 quality management." },
];

export function CargoStorageContainersContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          Cargo Storage Containers: The Complete Guide for Indian Buyers
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Cargo storage containers are standardized steel boxes originally designed for intermodal freight transport—moving seamlessly between ships, rail, and trucks without unloading cargo. Today, these robust units serve dual purposes across India: as workhorses of global logistics and as cost-effective foundations for on-site storage, modular offices, labour colonies, and prefab buildings.
            </p>
            <p>
              The modern shipping container evolved from post-World War II innovations, eventually standardized under ISO frameworks in the 1960s. These containers adhere to strict ISO specifications, including uniform widths of 2.438 metres (8 feet), standard heights of 2.591 metres (8 feet 6 inches), and high cube variants reaching 2.896 metres (9 feet 6 inches). The most common types—20-foot and 40-foot units—dominate both container transport networks and the secondary market for storage applications.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(cargoStoragePort)}
            alt="Cargo storage containers stacked at Indian port with crane operations by Portable Office Cabin"
            className="rounded-xl"
            aspectRatio="16/9"
          />
        </div>
      </section>

      {/* Key Characteristics */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">Key Characteristics of Cargo Storage Containers</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" /> Constructed from corten steel (weathering steel), mild steel with protective coatings, or stainless steel for specialized applications</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" /> Each unit carries a CSC plate with unique ISO 6346 BIC code, maximum gross weight, tare weight, and validity period</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" /> Designed for stacking via twist-lock fittings at corner castings, enabling efficient space utilization</li>
            <li className="flex gap-2"><CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" /> Standard sizes fit vessel bays, rail wagons, and truck chassis—reducing handling costs by up to 90%</li>
          </ul>
          <div className="bg-accent/10 p-6 rounded-xl border border-accent/20">
            <h4 className="font-semibold text-foreground mb-3">Why This Matters for Indian Buyers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Major ports like JNPT, Mundra, and Chennai serve as primary sources for new and used containers</li>
              <li>• Domestic market emphasizes used units for cost-effective on-site applications amid infrastructure boom</li>
              <li>• Portable Office Cabin repurposes containers into storage, offices, labour accommodation, and prefab buildings</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Standard Sizes & Specifications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Standard Cargo Storage Container Sizes & Specifications</h2>
        <p className="text-muted-foreground mb-6">The dominance of 20-foot and 40-foot general purpose containers stems from their optimization for global shipping economics. In India, these two sizes account for over 85% of the storage container market.</p>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <OptimizedImage
            src={resolveImageUrl(cargoStorage20ft)}
            alt="20 ft GP cargo storage container with double doors and ISO corner castings by Portable Office Cabin"
            className="rounded-xl"
            aspectRatio="square"
          />
          <OptimizedImage
            src={resolveImageUrl(cargoStorage40ft)}
            alt="40 ft cargo storage container at industrial yard by Portable Office Cabin Bengaluru"
            className="rounded-xl"
            aspectRatio="square"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-bold text-foreground mb-3">20 ft GP Container</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>External:</strong> 6.058 m × 2.438 m × 2.591 m</li>
              <li><strong>Volume:</strong> ~33 m³ (1,172 cu ft)</li>
              <li><strong>Tare:</strong> 2,200–2,400 kg</li>
              <li><strong>Payload:</strong> 28,000–30,480 kg</li>
              <li><strong>Door:</strong> 2.343 m W × 2.280 m H</li>
              <li><strong>Ideal for:</strong> Site storage, portable offices, security cabins</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-bold text-foreground mb-3">40 ft GP Container</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>External:</strong> 12.192 m × 2.438 m × 2.591 m</li>
              <li><strong>Volume:</strong> ~67 m³ (2,390 cu ft)</li>
              <li><strong>Tare:</strong> 3,700–3,900 kg</li>
              <li><strong>Payload:</strong> 26,000–28,000 kg</li>
              <li><strong>Ideal for:</strong> Warehousing, labour colonies, equipment storage</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-bold text-foreground mb-3">40 ft HC Container</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>External height:</strong> 2.896 m (9'6")</li>
              <li><strong>Internal height:</strong> ~2.69–2.70 m</li>
              <li><strong>Extra:</strong> +30.5 cm over standard</li>
              <li><strong>Ideal for:</strong> Vertical storage, container offices, homes, cafés</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-muted/50 p-6 rounded-xl">
          <h4 className="font-semibold text-foreground mb-3">Specialized Sizes in the Indian Market</h4>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li>• <strong>10 ft containers</strong> (2.991 m L): Urban constraints and tight site plots</li>
            <li>• <strong>45 ft pallet-wide:</strong> 2.5 m internal width for Euro-pallet compatibility</li>
            <li>• <strong>53 ft containers:</strong> North American domestic standard (rare in India)</li>
            <li>• <strong>Half-height</strong> (1.219–1.346 m H): Dense bulk cargo like minerals and ore</li>
          </ul>
        </div>
      </section>

      {/* Condition Grading */}
      <section>
        <h3 className="text-xl font-bold text-foreground mb-4">Condition Grading for Cargo Containers</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { grade: "New (One-Trip)", desc: "Pristine condition, full corten finish, CSC validity of 5 years" },
            { grade: "Cargo-Worthy", desc: "CSC-approved for continued sea transport, minor wear acceptable" },
            { grade: "Wind & Water-Tight (WWT)", desc: "Minor dents permissible, suitable for static storage" },
            { grade: "AS IS", desc: "Structural repairs needed, priced accordingly" },
          ].map((item) => (
            <div key={item.grade} className="flex gap-3 p-4 bg-card border border-border rounded-lg">
              <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{item.grade}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">Used containers—specifically second hand shipping container units—comprise 80–90% of India's secondary market. These offer significant cost savings but require careful inspection for frame twist, floor rot, and corrosion.</p>
      </section>

      {/* Types of Containers by Use */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Types of Cargo Storage Containers by Use</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containerTypes.map((type) => (
            <div key={type.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <type.icon className="h-8 w-8 text-accent mb-3" />
              <h4 className="font-bold text-foreground mb-2">{type.title}</h4>
              <p className="text-sm text-muted-foreground">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Materials & Construction */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Materials & Construction: Mild Steel, Corten Steel, Stainless Steel</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <p className="text-muted-foreground mb-4">Container longevity depends heavily on steel grade and protective coatings. Corrugation profiles on side walls (7–11 waves per side) enhance buckling resistance. Floors consist of 28 mm thick marine plywood over cross-members, while corner posts per ISO 1161 allow 300-ton lifting capacity.</p>
            <OptimizedImage
              src={resolveImageUrl(cargoStorageInspection)}
              alt="Quality inspection of cargo storage container steel panels at fabrication yard by Portable Office Cabin"
              className="rounded-xl"
              aspectRatio="16/9"
            />
          </div>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Corten (Weathering) Steel</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ASTM A588/A606, 355 MPa yield strength</li>
                <li>• Self-passivating: forms 50–100 μm protective rust patina</li>
                <li>• Corrosion rate: 0.1–0.2 mm/year vs 0.5 mm/year for uncoated mild steel</li>
                <li>• Ideal for coastal environments — Mundra, Chennai ports</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Mild Steel (IS 2062 Grade B)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 250 MPa yield strength, 20–30% cost savings over corten</li>
                <li>• Requires epoxy primers + polyurethane topcoats (150–200 μm DFT)</li>
                <li>• 15–20 year lifespan with proper maintenance</li>
                <li>• Common for inland storage and prefab applications</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Stainless Steel (AISI 304/316L)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 500+ MPa yield, PREN &gt;24 for 316 grade</li>
                <li>• 2–3x cost of corten steel</li>
                <li>• Used for food processing, pharmaceuticals, chemicals</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">New vs Used Cargo Storage Containers & Typical Price Ranges (India, 2024–2026)</h2>
        <p className="text-muted-foreground mb-6">New containers from Chinese mills offer pristine CSC validity (5 years), zero dents, and 30+ year service life—but cost 50–100% more than used units. Used (WWT, 5–15 years old) containers dominate at 70–80% savings.</p>
        
        <div className="bg-card rounded-xl shadow-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-accent/10 text-foreground">
                  <th className="text-left px-6 py-4 font-semibold">Container Type</th>
                  <th className="text-left px-6 py-4 font-semibold">Price Range (₹)</th>
                  <th className="text-left px-6 py-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <td className="px-6 py-3 font-medium text-foreground">{row[0]}</td>
                    <td className="px-6 py-3 text-accent font-semibold">{row[1]}</td>
                    <td className="px-6 py-3 text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-muted/50 p-6 rounded-xl">
          <h4 className="font-semibold text-foreground mb-2">Factors Affecting Price</h4>
          <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <p>• Steel grade and manufacturer origin</p>
            <p>• Age (manufacture year on CSC plate)</p>
            <p>• Prior usage: marine versus domestic</p>
            <p>• Modification level and IICL grading (A–D)</p>
            <p>• Steel prices (currently ₹60–80/kg)</p>
            <p>• Post-2024 Red Sea disruptions added ~20% premiums</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">Pricing subject to market fluctuations. Industry forecasts suggest 10–15% price increases by end of 2026.</p>
        </div>
      </section>

      {/* Modular Building Solutions */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">From Cargo Storage to Modular Buildings: Solutions by Portable Office Cabin</h2>
        <p className="text-muted-foreground mb-6">Repurposing extends container life by 20–30 years in static applications. Portable Office Cabin transforms GP and HC units through frame-preserving cuts (laser-guided), welding reinforcements per IS 800, and comprehensive fit-outs.</p>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <OptimizedImage
            src={resolveImageUrl(cargoStorageISO)}
            alt="ISO certified cargo storage container ready for conversion at Portable Office Cabin yard Bengaluru"
            className="rounded-xl"
            aspectRatio="square"
          />
          <div className="space-y-4">
            <div className="border-l-4 border-accent pl-4">
              <h4 className="font-bold text-foreground">Container Offices</h4>
              <p className="text-sm text-muted-foreground">20 ft and 40 ft containers converted into plug-and-play site offices with partition walls, false ceilings, LED lighting, split AC, and executive desking. Deployed on metro rail, highway EPC, and real estate sites.</p>
            </div>
            <div className="border-l-4 border-accent pl-4">
              <h4 className="font-bold text-foreground">Prefab Labour Colonies</h4>
              <p className="text-sm text-muted-foreground">Integrated worker accommodation with dormitories (100+ beds, 2–3 high stacking), dining halls, canteens, and sanitary blocks. Deployed at power plants and industrial parks.</p>
            </div>
            <div className="border-l-4 border-accent pl-4">
              <h4 className="font-bold text-foreground">Container Homes & Cafés</h4>
              <p className="text-sm text-muted-foreground">High cube conversions with architect-designed layouts, floor-to-ceiling glazing, solar rooftop integration, and mezzanine levels. Popular for urban pop-ups and resort accommodation.</p>
            </div>
            <div className="border-l-4 border-accent pl-4">
              <h4 className="font-bold text-foreground">Security Cabins & Rooftop Sheds</h4>
              <p className="text-sm text-muted-foreground">Compact 10–20 ft modules for factory gates, toll plazas, and events. Rooftop structures combined with PEB framing add 50–100 m² usable space.</p>
            </div>
          </div>
        </div>

        <div className="bg-accent/10 border border-accent/20 rounded-xl p-6">
          <h4 className="font-semibold text-foreground mb-3">End-to-End Service by Portable Office Cabin</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Design & Engineering</p>
              <p>AutoCAD/STAAD structural analysis, CNC plasma cutting</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Delivery & Installation</p>
              <p>PAN-India delivery, hydraulic ramps, crane positioning, grout foundations</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Quality & Compliance</p>
              <p>500+ projects, ISO 9001 quality management, NBC fire safety</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Standards & Safety */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Key Technical Standards, Safety & Security</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">ISO 668 & ISO 1496 Standards</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• External dimensions: +0/-6.35 mm tolerance (20 ft), +0/-9.5 mm (40 ft)</li>
                <li>• Racking load: 82 kN/m</li>
                <li>• Stacking: MSM of 192,000–216,000 kg</li>
                <li>• Lifting: 300 tons per corner fitting</li>
                <li>• Containers stack 9-high on ships without deformation</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">CSC Plates</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unique container number (ISO 6346 BIC code)</li>
                <li>• Maximum gross weight, tare weight</li>
                <li>• Re-approval every 30 months for transport use</li>
                <li>• Verifies no fatigue cracks from 500,000+ ocean cycles</li>
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Security Options for Storage</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• High-security lock boxes welded over lock rods</li>
                <li>• CISA EN12320 padlocks (shackle &gt;16 mm)</li>
                <li>• Internal locking bars and anti-theft grills (50×50 mm mesh)</li>
                <li>• IoT-enabled CCTV for yard monitoring</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Structural Modifications for Buildings</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Engineer-stamped drawings for cutouts</li>
                <li>• Doubler plates (6–10 mm) reinforcing openings</li>
                <li>• Ventilation: minimum 200 CFM</li>
                <li>• RCCB 30mA earth leakage breakers</li>
                <li>• NBC fire safety compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Applications in Indian Industry & Infrastructure</h2>
        <p className="text-muted-foreground mb-6">India's ₹5,000 crore prefab sector continues growing at approximately 20% CAGR, driven by versatile container applications.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <div key={app.title} className="bg-card border border-border rounded-xl p-6">
              <app.icon className="h-8 w-8 text-accent mb-3" />
              <h4 className="font-bold text-foreground mb-2">{app.title}</h4>
              <p className="text-sm text-muted-foreground">{app.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buying Checklist */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Buying Checklist & Maintenance Tips</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-foreground mb-4">Key Inspection Points</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Structural integrity: Check bent corner posts, twisted frame, heavy impact signs</li>
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Corrosion: Heavy rust (&gt;10% surface) indicates weakness — use ultrasonic gauging</li>
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Roof: Inspect for pinholes, dents, standing water marks</li>
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Doors: Should open/close smoothly; check seal compression</li>
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Floor: Marine plywood — no delamination (&lt;5%), rot, or pest damage</li>
              <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> Verify CSC plate and manufacture date (post-2010 preferred)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-4">Recommended Grade by Application</h3>
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {gradeTable.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                      <td className="px-4 py-3 text-foreground">{row[0]}</td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-foreground mb-2">Basic Maintenance Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Annual repainting with epoxy coating (80 μm minimum)</li>
                <li>• Lubricate hinges and lock rods with lithium EP2 grease</li>
                <li>• Roof inspection after each monsoon season</li>
                <li>• Pest control for timber floors (permethrin-based)</li>
                <li>• Clear drainage around container base</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent/10 border border-accent/20 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Source Your Cargo Storage Containers?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">Whether you need raw containers for storage, converted modular buildings, or complete prefab solutions, Portable Office Cabin delivers end-to-end services across India with 500+ completed projects.</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
        >
          Get a Free Quote <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
