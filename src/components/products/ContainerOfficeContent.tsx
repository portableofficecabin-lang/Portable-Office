import { CheckCircle, Building2, Truck, Shield, Wrench, Users, Leaf, Palette, HardHat, Factory, GraduationCap, Landmark, ShoppingBag, Phone } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import containerOfficeModernGlass from "@/assets/products/container-office-modern-glass.webp";
import { FixedPriceCallout, type FixedOffer } from "./FixedPriceCallout";
import { formatINR } from "@/lib/pricing/gst";

/**
 * `offer` is present when the CURRENT product page is purchasable (isPurchasable() — passed in by
 * ProductDetailServer). Every generic ₹ figure below — the hero "Starting Price", the per-sq-ft
 * lifecycle claim, the indicative cost-range table and the cost-range FAQ — renders ONLY when
 * `offer` is absent, i.e. on quotation-only pages where an indicative range cannot be mistaken
 * for a chargeable price. On a purchasable page the one number shown is the real offer.
 */
export function ContainerOfficeContent({ offer }: { offer?: FixedOffer }) {
  return (
    <div className="space-y-16">
      {/* Intro Section */}
      <section>
        <div className="mb-8 rounded-2xl overflow-hidden shadow-card relative">
          <OptimizedImage
            src={resolveImageUrl(containerOfficeModernGlass)}
            alt="Modern prefabricated container office cabin with full glass façade and steel frame"
            productName="Modern Container Office"
            aspectRatio="video"
            priority
          />
          <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-card">
            {offer ? (
              <>
                {/* Purchasable SKU: the hero badge shows THE price — not a "starting" figure that
                    the checkout would then contradict. */}
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Fixed Price</div>
                <div className="font-display text-xl md:text-2xl font-bold text-foreground">{formatINR(offer.sellPriceInr)}</div>
                <div className="text-[10px] text-muted-foreground">Incl. GST · transport & installation at checkout</div>
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Starting Price</div>
                <div className="font-display text-xl md:text-2xl font-bold text-foreground">₹7,00,000/-</div>
                <div className="text-[10px] text-muted-foreground">Base price, excl. GST, transport & installation</div>
              </>
            )}
          </div>
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">

          Office in Container – Portable Office Container Solutions in India
        </h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Since around 2018, Indian businesses across construction, infrastructure, oil and gas, and education sectors have increasingly turned to the office in container as a practical workspace solution. These steel structures—converted from standard shipping containers—deliver fully functional offices that can be deployed rapidly, relocated easily, and customized to meet specific project requirements.
          </p>
          <p>
            We specialize in designing and supplying ready-to-use office containers in standard ISO sizes (20 ft, 30 ft, 40 ft), each customized for Indian climate conditions including extreme heat, humidity, and coastal corrosion. Whether you're setting up a site office for a highway project or a temporary training facility, container offices offer a compelling alternative to traditional construction.
          </p>
          <p>
            Prefabricated offices are a durable, long-term solution suitable for various industries, offering advantages over temporary solutions like porta cabins due to their robust design and quick deployment. Container offices are durable, made from high-quality steel, and require minimal maintenance due to their weather-resistant materials.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {[
            "Ready to use upon delivery with complete electrical and interior fit-out",
            "Movable between project locations using standard transport",
            "Fully customizable layouts, finishes, and branding",
            "Cost-effective compared to brick-and-mortar offices with 60-70% lower setup time",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 bg-muted/50 rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-6">
          Container offices serve multiple purposes: site offices for contractors, project management hubs, sales offices, training rooms, and small branch offices for businesses operating on leased land.
        </p>
        <p className="text-muted-foreground mt-4">
          This article serves as a comprehensive planning guide for decision-makers considering container offices. Use it to understand specifications, compare options, and clarify requirements before requesting a design and quote from Portable Office Cabin.
        </p>
      </section>

      {/* What is a Modern Container Office */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          What is a Modern Container Office?
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            A modern container office is a modular workspace built from a steel shipping container or fabricated MS (mild steel) container, fully finished in a controlled factory environment. Unlike raw containers used for cargo, these units are engineered specifically for human occupancy, with structural modifications, climate control systems, and interior finishes that rival traditional office construction.
          </p>
          <p>
            Units arrive at your site ready-to-use, with PVC windows, steel doors, insulation (PUF or rockwool), concealed electrical wiring, LED lighting, and flooring already installed. The fabrication process addresses everything from thermal comfort to data connectivity, so commissioning happens within days rather than months. Common sizes used in India include 10 ft, 20 ft, and 40 ft office containers, each adaptable to different headcounts and layouts.
          </p>
          <p>
            The difference between a basic site porta cabin and a modern container office lies in structural design, interior finishes, long-term usability, and compliance with Indian safety norms. A well-built container office can serve 15–25 years with minimal upkeep, functioning as a genuine capital asset rather than a temporary workaround. For example, a standard 20x10x8.6 ft container can be configured as a 4–5 seat project office with split AC, multiple power outlets, data points, and ergonomic furniture—everything a team needs to operate productively from day one.
          </p>
        </div>
      </section>

      {/* Container Office vs Traditional Office & Porta Cabin */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Container Office vs Traditional Office & Porta Cabin
        </h2>

        <h3 className="font-display text-xl font-semibold text-foreground mb-3">Against Traditional Brick Construction</h3>
        <div className="space-y-4 text-muted-foreground mb-8">
          <p>
            Traditional offices require 6–12 months of construction time, involving RCC foundations, masonry work, plastering, multiple contractor coordination, and regulatory approvals. A container office achieves the same functional outcome in 4–8 weeks. The capital expenditure for traditional offices runs significantly higher, and once built, the structure cannot be relocated.
          </p>
          <p>
            Container offices skip the need for full RCC structures. Simple block foundations or levelled pads suffice, reducing site preparation costs and timelines. When the project ends or the lease expires, the office moves to the next location.
          </p>
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground mb-3">Against Porta Cabins</h3>
        <div className="space-y-4 text-muted-foreground mb-8">
          <p>
            Many portable office cabins on the market are built as temporary sheds with lighter frames, lower insulation values, and finishes designed for short-term use. While they cost less upfront, their limited structural integrity, poor thermal performance, and rapid depreciation make them expensive over time.
          </p>
          <p>
            Modern container offices, by contrast, function as capital assets. They retain 50–70% of their value over a 5–10 year lifecycle with basic maintenance, can be repurposed or sold in secondary markets, and provide consistent comfort regardless of external conditions.
          </p>
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground mb-3">Lifecycle Cost Perspective</h3>
        {offer ? (
          /* Purchasable SKU: the same argument, minus the per-sq-ft figures that would sit on the
             page contradicting the fixed offer price. */
          <p className="text-muted-foreground">
            A container office is a manufactured capital asset, not a site-built structure: zero rent for
            10–15 years, reuse across multiple projects, and strong resale value keep its Total Cost of
            Ownership well below a traditional office of the same size. This unit sells at the fixed,
            all-inclusive price shown above.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Quality Indian container offices typically fall in the range of ₹1,400–₹2,500 per sq. ft depending on specification—significantly less than the ₹3,500–₹5,000+ per sq. ft required for traditional offices. When you factor in zero rent for 10–15 years, reuse across multiple projects, and strong resale value, the Total Cost of Ownership makes container offices a cost effective choice for most project-based businesses.
          </p>
        )}
      </section>

      {/* Key Features */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Key Features of a Modern Container Office
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: Building2,
              title: "Structural Frame and Materials",
              desc: "MS or Corten steel outer shell with corrosion-resistant coatings and corner lifting hooks. 50 mm insulated sandwich panels (steel skins with PUF core) create a weather resistant envelope.",
            },
            {
              icon: Shield,
              title: "Insulation and Climate Control",
              desc: "PUF or rockwool panels in walls and ceilings maintain interior temperatures while reducing AC loads. Vinyl or laminate flooring, false ceilings, and appropriately sized split AC units ensure year-round comfort.",
            },
            {
              icon: Wrench,
              title: "Electrical and Data Infrastructure",
              desc: "Concealed FRLS wiring, MCB distribution boards, LED panel lights, 5-amp and 15-amp sockets. CAT6 raceways for LAN and Wi-Fi access point provisions throughout the space.",
            },
            {
              icon: Shield,
              title: "Openings and Security",
              desc: "Powder-coated steel doors with multi-point locking. Aluminum sliding windows with MS grills for natural light and security. CCTV and biometric access readiness available.",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4 text-muted-foreground">
          <h3 className="font-display text-xl font-semibold text-foreground">Sanitation and Pantry Provisions</h3>
          <p>
            Many configurations include inbuilt toilets with Indian or Western WC, exhaust fans, and basic plumbing. Small pantry areas with sinks and overhead storage accommodate tea and coffee facilities, eliminating the need for separate structures.
          </p>

          <h3 className="font-display text-xl font-semibold text-foreground mt-6">Compliance and Safety</h3>
          <p>
            Materials meet fire-resistance requirements where specified. Electrical systems include proper earthing and comply with local electrical codes. Emergency lighting, fire extinguisher brackets, and signage available on request. Units can be built to relevant ISO standards when required.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Benefits of Modern Container Offices
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Truck,
              title: "Speed of Deployment",
              desc: "Factory production runs parallel to site preparation. A single-container office can be installed and commissioned within one working day.",
            },
            {
              icon: CheckCircle,
              title: "Cost-Effectiveness",
              desc: "Reduced material wastage, shorter project overheads, and lower financing costs. A well-specified container office can pay for itself within 3–5 years of avoided rent.",
            },
            {
              icon: Truck,
              title: "Mobility and Flexibility",
              desc: "Every container office is crane-liftable and compatible with standard flatbed truck transport across India. Transform workspace from a fixed cost into a movable asset.",
            },
            {
              icon: Building2,
              title: "Scalability",
              desc: "Start with a single 20 ft office and add containers side-by-side or stack them as the project expands. Scale incrementally to match actual needs.",
            },
            {
              icon: Leaf,
              title: "Sustainability",
              desc: "Repurposing ISO containers diverts steel from scrap. Integration options include rooftop solar panels and rainwater harvesting systems for reduced environmental impact.",
            },
            {
              icon: Palette,
              title: "Branding and Aesthetics",
              desc: "Exteriors can feature corporate colours, vinyl graphics, glass fronts, entrance canopies, and landscaped entries for a polished professional appearance.",
            },
          ].map((benefit) => (
            <div key={benefit.title} className="bg-muted/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <benefit.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Types of Configurations */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Types of Modern Container Office Configurations
        </h2>
        <div className="space-y-6">
          {[
            {
              title: "Single-Unit Office",
              desc: "Compact 10 ft or 20 ft units accommodate 1–3 people, ideal for security offices, small site engineers' cabins, or startup founders' offices. Deploy quickly with minimal foundation work.",
            },
            {
              title: "Multi-Container Office",
              desc: "2–6 containers joined side-by-side with internal partitions creating open-plan work areas, meeting rooms, and manager cabins serving 10–40 people. Corridors connect sections with shared utilities.",
            },
            {
              title: "Stacked Container Office",
              desc: "G+1 or G+2 layouts maximise footprint efficiency on constrained urban plots. External steel staircases with safety railings provide access to upper floors, with roof decks as break-out spaces.",
            },
            {
              title: "Office with Manager Cabin",
              desc: "A typical 40 ft container divided into reception/workstations plus a glass-partition manager room with dedicated AC and storage. The glass partition maintains visibility while providing acoustic separation.",
            },
            {
              title: "Office with Toilet and Pantry",
              desc: "Standard 20x10 ft or 40x10 ft layouts with attached toilet and compact pantry block. Self-contained configuration ideal for remote sites like solar farms, mining locations, or highway construction.",
            },
            {
              title: "Hybrid and Luxury Container Offices",
              desc: "Containers combined with glass façades, pergolas, false ceilings, high-end flooring, and custom furniture. These designs blur the line between modular and permanent construction for corporate headquarters and sales lounges.",
            },
          ].map((type) => (
            <div key={type.title} className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{type.title}</h3>
              <p className="text-muted-foreground">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sizes & Specifications */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Typical Sizes & Technical Specifications (India Focus)
        </h2>

        <div className="bg-card rounded-xl shadow-card overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-accent/10">
                <th className="px-6 py-4 text-left font-semibold text-foreground">Size</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Floor Area</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Capacity</th>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Best For</th>
              </tr>
            </thead>
            <tbody>
              {[
                { size: "10 ft", area: "~7 m² (75 sq ft)", capacity: "1–2 persons", best: "Security booth, ticket counter, supplementary room" },
                { size: "20 ft", area: "~14–15 m² (150 sq ft)", capacity: "3–5 persons", best: "Site offices, small project teams, startup offices" },
                { size: "40 ft", area: "~29 m² (320 sq ft)", capacity: "6–10 persons", best: "Full project offices, multi-room layouts, headquarters" },
              ].map((row, index) => (
                <tr key={row.size} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-4 font-medium text-foreground">{row.size}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.area}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.capacity}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground mb-4">Common Technical Specifications</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Wall and roof panels: 50 mm PUF sandwich panels with 0.5 mm PPGI steel skins",
            "Floor construction: 18 mm cement board with vinyl or laminate finish",
            "Roof design: slight slope for monsoon drainage, sealed joints",
            "Electrical: concealed FRLS wiring, MCB DB, LED fixtures, adequate socket provision",
            "Structure: lifting hooks at corners for crane handling, reinforced frames for stacking",
            "Finish: powder-coated exterior, branded colours on request",
          ].map((spec) => (
            <div key={spec} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{spec}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Use Cases: Who Uses Modern Container Offices?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: HardHat,
              title: "Construction & Infrastructure",
              desc: "Highway, metro, and industrial park projects. Billing cabins, project management rooms, and engineer stations across Maharashtra, Gujarat, Karnataka, and Telangana.",
            },
            {
              icon: Building2,
              title: "Real Estate Developers",
              desc: "Marketing offices and sample flat booking offices. Glass-front container offices with air conditioning and branded interiors creating the right first impression for walk-in clients.",
            },
            {
              icon: Factory,
              title: "Manufacturing & Logistics",
              desc: "Quality labs, dispatch offices, maintenance rooms, and gate offices near loading bays. Weather resistant construction handles industrial environments with dust and temperature extremes.",
            },
            {
              icon: GraduationCap,
              title: "Education & Training",
              desc: "Temporary admin blocks and extra classrooms for schools, colleges, and skill centres facing expansion phases. Deploy immediately while permanent facilities are under construction.",
            },
            {
              icon: Landmark,
              title: "Government, PSU & NGOs",
              desc: "Command centres, field offices, and disaster-relief coordination rooms. Rapid deployment in flood or cyclone-prone regions where conventional construction proves impossible.",
            },
            {
              icon: ShoppingBag,
              title: "Retail, Café & Creative",
              desc: "Design studios, container cafés, pop-up shops, and coworking hubs. The industrial aesthetic combined with thoughtful design creates distinctive commercial spaces.",
            },
          ].map((useCase) => (
            <div key={useCase.title} className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <useCase.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{useCase.title}</h3>
              <p className="text-muted-foreground text-sm">{useCase.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm italic">
          The modular office market is expected to benefit from India's Smart Cities Mission, which emphasizes scalable and tech-ready spaces.
        </p>
      </section>

      {/* Design & Customisation */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Design & Customisation Options
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Prefabricated offices are designed for durability and long-term use, featuring robust construction and flexible layouts that suit a wide range of industries. Portable Office Cabin works closely with clients through several design dimensions.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 mt-6">
          {[
            {
              title: "Layout Customisation",
              desc: "Internal partitions create cabins, conference rooms, server rooms, and hot-desking zones. Multi-container complexes incorporate corridors, reception areas, and differentiated zones. Nothing is fixed permanently—future reconfiguration is always possible.",
            },
            {
              title: "Interior Finishes",
              desc: "From functional to premium: laminate wall panels, PVC or vinyl flooring, modular false ceilings, LED panel lights, ergonomic furniture, and branded reception desks tailored to intended use.",
            },
            {
              title: "Climate and Acoustic Design",
              desc: "Higher insulation thickness for hot zones like Nagpur and Chennai. Double-glazed windows and acoustic panels for offices requiring video conferencing or focused work environments.",
            },
            {
              title: "Utilities",
              desc: "Pre-planned routing for split or central AC, UPS/inverter systems, LAN cabling, Wi-Fi access points, CCTV, access control, and optional solar panels on roofs.",
            },
            {
              title: "Exterior Aesthetics",
              desc: "Corporate colours, logo panels, glass curtain sections, entrance canopies, external decks, and rooftop terraces. A container can look sophisticated and contemporary based on context and budget.",
            },
            {
              title: "Compliance-Led Design",
              desc: "Fire extinguisher mounts, emergency lighting, safety signage, and barrier-free access. Export-oriented projects can receive specific certifications during engineering and documentation phases.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-muted/50 rounded-xl p-5">
              <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Installation, Transport & Relocation */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Installation, Transport & Relocation
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Site Preparation</h3>
            <p className="text-muted-foreground mb-4">
              Simple RCC blocks or strip foundations on levelled ground, with utility connections (power, water, drainage) ready for hookup. Foundation requirements are far simpler than traditional construction—often just concrete blocks at corners and mid-points.
            </p>

            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Transport</h3>
            <p className="text-muted-foreground">
              Completed units load onto standard flatbed trucks. 10 ft and 20 ft containers move easily through congested urban areas. Portable Office Cabin coordinates transport logistics as part of project delivery.
            </p>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Installation</h3>
            <p className="text-muted-foreground mb-4">
              A crane or hydra positions units onto prepared foundations—a process taking hours rather than days. Utility connections follow: electrical, plumbing, and telecom. Standard single-container offices achieve full commissioning within one working day.
            </p>

            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Relocation</h3>
            <p className="text-muted-foreground">
              Utilities disconnect, the crane lifts the unit onto a truck, and transport delivers it to the next site. Well-maintained containers can relocate 5–10 times over their lifecycle, spreading the initial investment across multiple projects and locations.
            </p>
          </div>
        </div>
      </section>

      {/* Costs, Budgeting & ROI */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Costs, Budgeting & ROI for Container Offices
        </h2>

        {offer ? (
          /* Purchasable SKU: the indicative range table is replaced by the one real figure. A
             "₹4,00,000 – ₹7,25,000" row beside a ₹18,88,000 checkout price is precisely the
             landing-page contradiction this prop exists to prevent. */
          <>
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">This Configuration's Price</h3>
            <div className="mb-8">
              <FixedPriceCallout offer={offer} />
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">Indicative Cost Ranges</h3>
            <div className="bg-card rounded-xl shadow-card overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-accent/10">
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Configuration</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Approximate Cost Range</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { config: "20 ft container office (~150 sq ft)", cost: "₹2,10,000 – ₹3,75,000" },
                    { config: "40 ft container office (~290 sq ft)", cost: "₹4,00,000 – ₹7,25,000" },
                  ].map((row, index) => (
                    <tr key={row.config} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                      <td className="px-6 py-4 font-medium text-foreground">{row.config}</td>
                      <td className="px-6 py-4 text-muted-foreground">{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground italic mb-6">
              * Quality Indian container offices typically fall in the range of ₹1,400–₹2,500 per sq. ft depending on specification. These figures are indicative estimates only—actual quotations depend on specific requirements and current material costs.
            </p>
          </>
        )}

        <h3 className="font-display text-xl font-semibold text-foreground mb-3">Primary Cost Drivers</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            "Size (10 ft, 20 ft, 40 ft, or custom dimensions)",
            "Insulation type and thickness (PUF, rockwool)",
            "Interior finishes (basic vs. premium flooring, wall panels)",
            "Number and type of doors and windows",
            "Sanitary provisions (none, basic toilet, full washroom)",
            "HVAC specifications and layout complexity",
            "Distance from factory to installation site",
            "Special requirements (IT infra, CCTV, access control)",
          ].map((driver) => (
            <div key={driver} className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
              <span className="text-sm text-muted-foreground">{driver}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-muted/50 rounded-xl p-5">
            <h4 className="font-display font-semibold text-foreground mb-2">Operating Savings</h4>
            <p className="text-muted-foreground text-sm">
              Proper insulation reduces AC loads. Zero rent accumulation over 10–15 years represents substantial savings versus leasing. Reusing the same container across multiple projects avoids repeated construction costs.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-5">
            <h4 className="font-display font-semibold text-foreground mb-2">Resale and Redeployment Value</h4>
            <p className="text-muted-foreground text-sm">
              Well-maintained container offices retain 50–70% of value with proper care. Units can be repurposed as storage, converted to guard rooms, or sold in secondary markets—unlike traditional buildings that depreciate toward zero.
            </p>
          </div>
        </div>
      </section>

      {/* Quality, Safety & Maintenance */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Quality, Safety & Maintenance
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Expected Lifespan</h3>
            <p className="text-muted-foreground mb-6">
              A well-fabricated container office lasts 15–25 years with proper maintenance. The steel structure doesn't rot, warp, or suffer pest damage. Electrical and plumbing systems can be upgraded or replaced without structural modifications.
            </p>

            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Routine Maintenance</h3>
            <ul className="space-y-2">
              {[
                "Annual check of roof sealant and gutters, especially after monsoon",
                "Door and window operation—lubricate hinges, check seals",
                "Electrical DB inspection, earthing verification, circuit testing",
                "AC service every 6–12 months",
                "Exterior paint touch-up every 4–5 years to prevent rust",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Safety Features</h3>
            <p className="text-muted-foreground mb-6">
              MS grills on windows, multi-point door locks, fire extinguisher brackets, and emergency exit provisions. External steps use non-slip surfaces. CCTV and access control integrate readily for specific security requirements.
            </p>

            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Coastal Considerations</h3>
            <p className="text-muted-foreground mb-6">
              Installations near saltwater—Navi Mumbai, Chennai, Kochi—require enhanced anti-corrosion treatments. Marine-grade primers and appropriate topcoat systems protect against accelerated rusting.
            </p>

            <h3 className="font-display text-xl font-semibold text-foreground mb-3">Refurbishment Services</h3>
            <p className="text-muted-foreground">
              After several years of use, containers may benefit from repainting, interior upgrades, or layout changes. Portable Office Cabin provides maintenance and refurbishment services, extending useful life.
            </p>
          </div>
        </div>
      </section>

      {/* How Portable Office Cabin Works With You */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          How Portable Office Cabin Works With You
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Inquiry & Requirements",
              desc: "Share site location, headcount, usage type, amenity requirements, finish expectations, and timeline constraints.",
            },
            {
              step: "02",
              title: "Concept Design & Quote",
              desc: "Layout drawings, 3D visualisations for complex projects, specification sheets, and transparent commercial offers with itemised costs.",
            },
            {
              step: "03",
              title: "Engineering & Fabrication",
              desc: "Production in controlled factory conditions with quality checks at each stage—structural work, insulation, electrical, and interior finishing.",
            },
            {
              step: "04",
              title: "Delivery & Commissioning",
              desc: "Transport coordination, crane positioning, utility connections, system testing, and handover with maintenance documentation.",
            },
          ].map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-accent font-display font-bold text-lg">{step.step}</span>
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accessibility, Emergency Preparedness, Disposal, Innovation */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Additional Capabilities
        </h2>
        <div className="space-y-6">
          {[
            {
              title: "Container Office Accessibility",
              desc: "Container offices are designed with accessibility in mind—gently sloped ramps, wide doors, step-free entryways, adjustable workstations, accessible meeting rooms, and clear pathways. Additional options include audio induction loops, braille signage, and accessible restrooms. Modular layouts allow these features to be integrated from the start or retrofitted as needs evolve.",
            },
            {
              title: "Container Office Emergency Preparedness",
              desc: "Fire suppression systems (extinguishers, smoke detectors), emergency lighting for power outages, clearly marked evacuation plans, and multiple exit doors. First aid kits, safety signage, and regular maintenance checks are standard. The robust construction withstands adverse conditions, providing a secure setting for employees.",
            },
            {
              title: "Container Office Disposal",
              desc: "Steel frames and insulated panels can be separated and recycled, reducing waste. Many businesses refurbish old containers for new uses—storage units, guard rooms, or community spaces. Alternatively, they can be donated or sold, supporting a circular economy and aligning with sustainability goals.",
            },
            {
              title: "Container Office Innovation",
              desc: "Modular construction methods and 3D printing reduce construction time and costs. Advancements in energy-efficient materials, rooftop solar panels, and green roofs enhance sustainability. Smart building systems, integrated air conditioning, and advanced electrical wiring create future-ready offices. Modular layouts can be reconfigured to accommodate changing team sizes and technologies.",
            },
          ].map((section) => (
            <div key={section.title} className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg text-foreground mb-3">{section.title}</h3>
              <p className="text-muted-foreground">{section.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Next Steps / CTA */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Modern Container Offices: Next Steps
        </h2>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Modern container offices offer speed, flexibility, and long-term value for Indian businesses navigating 2025–26 and beyond. The combination of factory quality, rapid deployment, and relocatability addresses challenges that traditional buildings simply cannot match.
          </p>
          <p>
            Container offices integrate naturally with other modular solutions from Portable Office Cabin—prefab labour colonies, rooftop sheds, prefab canteens, container homes, and portable toilets for comprehensive site infrastructure.
          </p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mt-6">
          <h3 className="font-display font-semibold text-lg text-foreground mb-3">
            Ready to explore? Here's what to share:
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Site location and tentative delivery date",
              "Required size (10/20/40 ft) and team size",
              "Need for toilet, pantry, AC, or furniture",
              "Interior layout preferences (open plan, partitioned, private cabin)",
              "Expected duration of use and future relocation plans",
              "Branding or special finish requirements",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-1" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <a
              href="tel:+919731897976"
              className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call Us Now
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            {
              q: "How long does a container office last with regular maintenance?",
              a: "A well-fabricated container office lasts 15–25 years with proper maintenance—annual touch-up painting, AC servicing, and electrical checks. Coastal installations benefit from additional anti-corrosion treatment every 3–4 years.",
            },
            {
              q: "Can container offices be stacked for G+1 structures?",
              a: "Yes, containers can be stacked with proper structural reinforcement and engineering assessment. This is common for larger site setups. Stacking requires certified corner castings and professional installation.",
            },
            /* The cost-range FAQ renders only on quotation-only pages — on a purchasable page its
               ranges would contradict the fixed offer price shown above. */
            ...(offer
              ? []
              : [
                  {
                    q: "What is the cost range for container offices in India?",
                    a: "Quality Indian container offices typically range from ₹1,400–₹2,500 per sq. ft. A 20 ft unit (~150 sq ft) costs approximately ₹2,10,000–₹3,75,000, while a 40 ft unit (~290 sq ft) ranges from ₹4,00,000–₹7,25,000 depending on specifications.",
                  },
                ]),
            {
              q: "How quickly can a container office be deployed?",
              a: "Factory production takes 4–6 weeks from order. Once delivered, a single-container office can be installed and commissioned within one working day when site preparation is complete.",
            },
            {
              q: "Can we relocate the container office to another city?",
              a: "Absolutely. This is one of the primary advantages. Containers are designed for transport on standard flatbed trailers and can travel anywhere in India accessible by road, with crane placement at the destination.",
            },
            {
              q: "Are second-hand containers reliable for office use?",
              a: "Cargo-worthy used containers offer excellent value when properly refurbished. We inspect, repair, and treat used containers to match new-unit durability, with 20–30% cost savings for budget-conscious projects.",
            },
            {
              q: "What warranty is provided on container offices?",
              a: "We offer 12-month warranty on structural integrity, waterproofing, and electrical systems. Interiors (flooring, panels, doors) carry 6-month warranty against manufacturing defects. Extended warranty options are available.",
            },
            {
              q: "Can furniture be included in the container office package?",
              a: "Yes, we offer furniture packages including workstations, chairs, storage cabinets, and file racks. Furniture is installed before dispatch—so the office arrives ready for immediate use.",
            },
          ].map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-left font-semibold text-foreground">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}