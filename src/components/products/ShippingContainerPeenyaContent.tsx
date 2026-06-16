import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Truck, IndianRupee, Shield, Factory, Wrench, CheckCircle, MapPin, Phone, Building2, Container, Users } from "lucide-react";
import peenyaIndustrial from "@/assets/products/shipping-container-peenya-industrial.webp";
import peenyaYard from "@/assets/products/shipping-container-peenya-yard.webp";
import peenyaStorage from "@/assets/products/shipping-container-peenya-storage.webp";
import peenyaPort from "@/assets/products/shipping-container-peenya-port.webp";
import peenyaOffice from "@/assets/products/shipping-container-peenya-office.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  { icon: Clock, title: "2–5 Day Setup", description: "Quick deployment versus weeks for traditional construction on Peenya's leased plots" },
  { icon: Truck, title: "Full Relocatability", description: "Move containers to Dobbaspet, Bidadi, or Jigani when factory operations shift" },
  { icon: IndianRupee, title: "Lower Upfront Cost", description: "Significantly cheaper than permanent RCC structures for 3–5 year industrial leases" },
  { icon: Shield, title: "ISO-Grade Build", description: "Corten steel body with marine-grade plywood flooring — weather-resistant for Bengaluru monsoons" },
  { icon: Factory, title: "3,500+ MSME Hub", description: "Serving Asia's largest industrial estate across four phases along Tumkur Road corridor" },
  { icon: Wrench, title: "Full Customization", description: "Internal racks, mezzanine shelves, ventilation grills, insulation, AC, and electrical fit-out" },
];

const containerTypes = [
  { type: "Standard ISO Storage (20 ft & 40 ft)", use: "Raw materials, spares, dies, tools, and finished stock near loading bays" },
  { type: "Container Office", use: "Factory managers, QA teams, and contractors — insulation, windows, split AC, furniture" },
  { type: "Portable Security Cabin", use: "Factory gates with three-side windows, desk, and electrical fittings" },
  { type: "Labour Accommodation Block", use: "Contract workers and night-shift teams with bunk beds and ventilation" },
  { type: "Portable Toilet Block", use: "Staff sanitation where permanent drainage is delayed" },
  { type: "Specialized Conversions", use: "Workshops, maintenance rooms, prefab canteens, rooftop cafés" },
];

const pricingRows = [
  { type: "Used 20 ft Storage Container", price: "₹85,000 – ₹1,30,000" },
  { type: "Used 40 ft Storage Container", price: "₹1,40,000 – ₹2,10,000" },
  { type: "New/One-Trip 20 ft Container", price: "₹1,50,000 – ₹2,20,000" },
  { type: "New/One-Trip 40 ft Container", price: "₹2,30,000 – ₹3,50,000" },
  { type: "Container Office (20 ft, fitted)", price: "₹2,65,000 – ₹3,80,000" },
  { type: "Container Office (40 ft, fitted)", price: "₹3,80,000 – ₹5,50,000" },
  { type: "Security Cabin (8x8 ft)", price: "₹85,000 – ₹1,20,000" },
  { type: "Monthly Rental (20 ft storage)", price: "₹5,500 – ₹8,500/month" },
];

const industries = [
  "Engineering fabrication and machine tool shops",
  "Auto ancillaries and precision components",
  "Electronics and electrical equipment manufacturing",
  "Pharmaceutical and chemical processing units",
  "FMCG warehousing and distribution centres",
  "Packaging and printing industries",
  "Textile and garment export units",
  "Food processing and cold storage facilities",
];

const buyingChecklist = [
  "Define use case: storage vs office vs accommodation vs support facility",
  "Select size: 20 ft, 40 ft, or high cube based on internal volume needs",
  "Choose grade: used (cost-effective for storage) vs new (client-facing offices)",
  "Inspect doors, locks, rubber gaskets, panels, flooring, and roof for leaks",
  "Verify transport feasibility into narrow Peenya internal roads and shift timings",
  "Consider future relocation to Bidadi, Jigani, Dobbaspet, or Hoskote",
  "Check power availability and drainage for office/toilet units",
  "Confirm gate width (min 4 m for 40 ft trailers) and overhead clearances",
];

const faqs = [
  {
    q: "What types of shipping containers are available for Peenya Industrial Area?",
    a: "Portable Office Cabin supplies 20 ft and 40 ft ISO storage containers, container offices with full interior fit-out, portable security cabins, labour accommodation blocks, portable toilets, and specialized conversions including workshops, canteens, and maintenance rooms. Both new and used units are available."
  },
  {
    q: "How quickly can a container be delivered and set up in Peenya?",
    a: "In-stock standard containers can be delivered within 2–4 working days from our Bengaluru yards via Tumkur Road. Complete setup including placement, electrical connections, and AC installation typically takes 2–5 days depending on customization level."
  },
  {
    q: "What is the price range for shipping containers in Peenya?",
    a: "Used 20 ft storage containers start from ₹85,000, while new/one-trip 20 ft units start from ₹1,50,000. Fully fitted container offices range from ₹2,65,000 (20 ft) to ₹5,50,000 (40 ft). Monthly rentals for 20 ft storage units start at ₹5,500. All prices exclude GST and transport."
  },
  {
    q: "Can containers be relocated if our factory moves from Peenya?",
    a: "Yes, full relocatability is a key advantage. Containers can be lifted via crane or hydra and transported to Dobbaspet, Bidadi, Jigani, Nelamangala, Hoskote, or any other location. Approximately 80% of material value is retained during relocation."
  },
  {
    q: "Are used containers suitable for storage in Peenya's industrial conditions?",
    a: "Yes, used cargo-grade containers are ideal for raw material and finished goods storage. They are 40–60% cheaper than new units while maintaining structural integrity. We inspect every used container for flooring, doors, rust, and water tightness before delivery."
  },
  {
    q: "What site preparation is needed for container placement in Peenya?",
    a: "You need level ground with precast concrete blocks or simple foundations, crane/hydra access clearance, power availability for office units, and basic drainage for toilets. Entry gate width should be minimum 4 metres for 40 ft trailers. Our team guides you through layout decisions before dispatch."
  },
  {
    q: "Do you provide container offices with AC and electrical fit-out?",
    a: "Yes, our container offices come with PUF or Rockwool insulation, UPVC windows, split AC provisions, MCB-based electrical wiring with earthing, LED lighting, power sockets, and optional data cabling. Interior partitions and furniture can be customized."
  },
  {
    q: "Can I rent a shipping container instead of buying?",
    a: "Yes, we offer flexible rental options starting from ₹5,500/month for 20 ft storage containers. Both short-term (1–6 months) and long-term (1–5 years) leases are available. Rental includes delivery, and pickup is arranged at lease end."
  },
  {
    q: "What compliance and safety features are included?",
    a: "All units include proper electrical wiring with MCBs, earthing, and industrial sockets. Insulation and ventilation control internal temperatures. Optional fire extinguishers, emergency exits, and signage are available for factory inspector audits. Interiors can be tailored to corporate or export client requirements."
  },
  {
    q: "Which areas near Peenya do you serve?",
    a: "We serve all four phases of Peenya Industrial Area, plus nearby industrial zones including Rajajinagar, Yeshwanthpur, Jalahalli, Dasarahalli, Nagasandra, Tumkur Road corridor, and extensions to Nelamangala, Dobbaspet, and Bidadi."
  },
];

export function ShippingContainerPeenyaContent() {
  return (
    <div className="space-y-16">
      {/* Hero Images */}
      <section className="grid md:grid-cols-2 gap-6">
        <OptimizedImage
          src={resolveImageUrl(peenyaIndustrial)}
          alt="Shipping container at Peenya Industrial Area warehouse loading dock by Portable Office Cabin"
          className="w-full rounded-xl shadow-lg"
        />
        <OptimizedImage
          src={resolveImageUrl(peenyaYard)}
          alt="20ft ISO shipping container at Bengaluru container yard for Peenya industrial supply by Portable Office Cabin"
          className="w-full rounded-xl shadow-lg"
        />
      </section>

      {/* Introduction */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          Shipping Container in Peenya Industrial Area, Bengaluru
        </h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Peenya Industrial Area stands as one of Asia's largest industrial hubs, spanning approximately 1,200 to 1,800 acres across four phases along the Tumkur Road corridor in Bengaluru, Karnataka. This manufacturing powerhouse hosts over 3,500 MSME industries covering engineering fabrication, auto ancillaries, electronics, machine tools, and pharmaceuticals.
          </p>
          <p>
            Portable Office Cabin supplies new and used shipping containers, container offices, and prefab solutions specifically to Peenya industries, with regular dispatch from Bengaluru yards. Typical use cases include raw material storage, finished goods storage, factory expansion offices, security cabins, labour accommodation, and temporary project facilities.
          </p>
        </div>
      </section>

      {/* Key Advantages */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Why Shipping Containers Are Ideal for Peenya Industries</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h.icon className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-2">{h.title}</h3>
              <p className="text-sm text-muted-foreground">{h.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Containers Suit Peenya */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Why Shipping Containers Suit Peenya Industrial Units</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Peenya's space-constrained plots, high rentals, and frequent 3–5 year leases make containers an ideal product for quick expansion without permanent construction.
          </p>
          <ul className="space-y-2">
            <li>Quick plug-in storage or office capacity for rented industrial sheds</li>
            <li>Popular in Tumkur Road auto ancillaries, Peenya 2nd Stage FMCG warehousing, and electrical machine shops</li>
            <li>Lower upfront cost and 2–5 day setup versus building new permanent sheds</li>
            <li>Weather-resistant ISO containers protect materials during Bengaluru's monsoon and dust-heavy conditions</li>
            <li>Full relocatability if operations shift to Nelamangala, Jigani, or Hoskote</li>
          </ul>
        </div>
      </section>

      {/* Introduction to Shipping Containers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Introduction to Shipping Containers</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              Shipping containers have become indispensable assets in the world of logistics, transport, and modular construction. Originally designed for the secure movement of goods across long distances, these robust steel units are now widely used for storage, industrial applications, and even as modular offices or homes. In India, and particularly in Bengaluru, Karnataka, the demand for shipping containers continues to grow due to their unmatched durability, security, and cost-effectiveness.
            </p>
            <p>
              Manufacturers in Bengaluru offer a diverse range of shipping containers, from standard 20 ft and 40 ft models to custom-built solutions tailored to unique industrial requirements. These containers are ideal for storage of raw materials, finished products, and equipment, as well as for creating flexible office spaces or temporary accommodations.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(peenyaStorage)}
            alt="Used shipping container for industrial storage at Peenya 2nd Stage Bengaluru by Portable Office Cabin"
            className="w-full rounded-xl shadow-lg"
          />
        </div>
        <p className="text-muted-foreground mt-4">
          The price of a shipping container in Bengaluru depends on several factors, including the manufacturer, size, condition (new or used), and any specific modifications or specifications requested by the client. With their ease of transport and quick installation, shipping containers are a preferred choice for businesses seeking efficient and scalable solutions in the industrial sector.
        </p>
      </section>

      {/* Types of Solutions */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Types of Shipping Container Solutions for Peenya Industries</h2>
        <p className="text-muted-foreground mb-6">
          Portable Office Cabin offers both bare containers and fully converted modular units tailored to Peenya industrial needs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left p-4 font-semibold text-foreground">Solution Type</th>
                <th className="text-left p-4 font-semibold text-foreground">Typical Use in Peenya</th>
              </tr>
            </thead>
            <tbody>
              {containerTypes.map((ct, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-4 font-medium text-foreground">{ct.type}</td>
                  <td className="p-4 text-muted-foreground">{ct.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sizes and Specifications */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Standard Sizes and Specifications for Peenya Clients</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Most Peenya orders revolve around 20 ft and 40 ft ISO-compliant units, with occasional high-cube requirements.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2">20 ft Container</h3>
              <p className="text-sm text-muted-foreground">~6.06 m × 2.44 m × 2.59 m (external)</p>
              <p className="text-sm text-muted-foreground mt-1">Ideal for compact storage and single-room offices</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2">40 ft Container</h3>
              <p className="text-sm text-muted-foreground">~12.19 m × 2.44 m × 2.59 m (external)</p>
              <p className="text-sm text-muted-foreground mt-1">Suits large storage, multi-room offices, and bunkhouses</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2">40 ft High Cube</h3>
              <p className="text-sm text-muted-foreground">~12.19 m × 2.44 m × 2.89 m (external)</p>
              <p className="text-sm text-muted-foreground mt-1">Extra height for taller storage or mezzanine shelving</p>
            </div>
          </div>
          <p className="mt-4">
            All units feature CORTEN steel body, marine-grade plywood flooring, double doors, locking bars, and corner castings for crane/forklift handling. Common modifications include internal racks, mezzanine shelves, additional doors, and ventilation grills for heat control.
          </p>
        </div>
      </section>

      {/* New vs Used */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">New, Used, and One-Trip Containers: What Works in Peenya</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>Selection depends on budget, appearance requirements, and project duration.</p>
            <ul className="space-y-3">
              <li><strong>Used cargo-grade containers</strong> suit pure storage — typically 40–60% cheaper while maintaining structural integrity</li>
              <li><strong>New or one-trip containers</strong> preferred for client-facing site offices, QA labs, or brand-visible structures facing Tumkur Road</li>
              <li>Portable Office Cabin inspects used units for flooring, doors, rust, and water tightness before offering to customers</li>
              <li>6–18 month projects often choose used; long-term offices (5+ years) lean toward new/one-trip</li>
            </ul>
          </div>
          <OptimizedImage
            src={resolveImageUrl(peenyaPort)}
            alt="New one-trip shipping container for Peenya industrial office conversion by Portable Office Cabin"
            className="w-full rounded-xl shadow-lg"
          />
        </div>
      </section>

      {/* Container Offices and Prefab */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Container Offices, Labour Colonies, and Prefab Structures in Peenya</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Beyond storage, Peenya companies increasingly use container-based offices and prefab blocks as industrial infrastructure.</p>
          <ul className="space-y-2">
            <li>Container offices for production heads and purchase teams, installed adjacent to sheds with electrical, data cabling, and AC</li>
            <li>Prefab labour colonies for contract workers in foundries and fabrication shops around Peenya 2nd Stage</li>
            <li>Rooftop sheds over container structures to reduce heat load on congested plots</li>
            <li>Modular combinations: multiple containers joined side-by-side for large offices, training halls, or QC labs</li>
            <li>Integration with PEB structures for larger warehouses with attached container-based admin blocks</li>
          </ul>
        </div>
      </section>

      {/* Support Facilities */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Support Facilities: Security Cabins, Toilets, and Canteens</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(peenyaOffice)}
            alt="40ft shipping container for Peenya factory office with ISO certification by Portable Office Cabin"
            className="w-full rounded-xl shadow-lg"
          />
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>Support infrastructure is critical in high-traffic industrial estates like Peenya.</p>
            <ul className="space-y-2">
              <li>Portable security cabins at main gates with sliding windows, counter table, and electrical points</li>
              <li>Prefab toilet blocks and bath units for staff where permanent drainage or sanction is delayed</li>
              <li>Container-based canteens serving day and night shifts with washable floors and proper ventilation</li>
              <li>All units designed for quick relocation when factories expand to larger plots</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Manufacturers & Suppliers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Manufacturers and Suppliers in Bengaluru</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Bengaluru stands out as a major industrial center in India, home to a wide array of manufacturers and suppliers specializing in shipping containers. The Peenya Industrial Area, in particular, is a hotspot for these businesses, offering clients convenient access to a variety of container products and services. Whether you need a standard storage container, a fully equipped office unit, or a customized modular solution, manufacturers in Peenya Industrial Area are equipped to deliver.
          </p>
          <p>
            When selecting a manufacturer or supplier, it's important to consider not just the price, but also the quality of the product, delivery timelines, and the range of services offered. Many suppliers in Bengaluru provide end-to-end solutions, including container customization, transport, and on-site installation, ensuring a hassle-free experience for industrial clients. Their strategic location within Peenya Industrial Area allows for efficient transport and distribution, making it easier for businesses to receive their containers quickly and securely.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Indicative Pricing for Peenya Industrial Area</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-accent/10">
                <th className="text-left p-4 font-semibold text-foreground">Container Type</th>
                <th className="text-left p-4 font-semibold text-foreground">Price Range (Ex-Works)</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-4 font-medium text-foreground">{row.type}</td>
                  <td className="p-4 text-muted-foreground">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">* Prices are indicative and exclude GST, transport, and crane/hydra charges. Contact us for exact quotations.</p>
      </section>

      {/* Logistics & Delivery */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Logistics and Delivery to Peenya Industrial Area</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Portable Office Cabin arranges end-to-end transport, unloading, and placement for containers throughout Peenya.</p>
          <ul className="space-y-2">
            <li>Delivery from Bengaluru container yards via Tumkur Road / Outer Ring Road</li>
            <li>Trailers for 40 ft containers, multi-axle trucks for 20 ft units</li>
            <li>On-site crane or hydra support for unloading where required</li>
            <li>In-stock units delivered within 2–4 working days, depending on customization</li>
            <li>Coordination with factory management for gate permissions and placement within tight internal roads</li>
          </ul>
        </div>
      </section>

      {/* Site Readiness */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Site Readiness and Installation Requirements</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Site preparation in Peenya is crucial due to narrow roads, shared entrances, and heavy truck movement.</p>
          <ul className="space-y-2">
            <li>Level ground with precast concrete blocks or simple foundations</li>
            <li>Access clearance for cranes or hydras</li>
            <li>Power availability for office units (lights, AC, sockets)</li>
            <li>Basic drainage for toilets and canteens</li>
            <li>Entry gate width (minimum 4 m for 40 ft trailers), turning radius, overhead cable clearances</li>
            <li>Portable Office Cabin's team guides clients through layout decisions before dispatch</li>
          </ul>
        </div>
      </section>

      {/* Industries Served */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Industries Served in Peenya Industrial Area</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {industries.map((ind, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{ind}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Buying Checklist */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Buying Checklist for Peenya Industrial Customers</h2>
        <p className="text-muted-foreground mb-4">An informed buying process reduces downtime and ensures the right container solution for Peenya factories.</p>
        <div className="space-y-3">
          {buyingChecklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <span className="bg-accent text-accent-foreground text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance & Safety */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Compliance, Safety, and Customization Notes</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Peenya industries often need to meet basic safety, fire, and HR standards even for temporary structures.</p>
          <ul className="space-y-2">
            <li>Proper electrical wiring with MCBs, earthing, and industrial sockets</li>
            <li>Insulation and ventilation for comfortable internal temperatures given metal roofs and machinery heat</li>
            <li>Optional fire extinguishers, emergency exits, and signage for factory inspector audits</li>
            <li>Portable Office Cabin tailors interiors, partitions, branding, and finishes to corporate or export client requirements</li>
          </ul>
        </div>
      </section>

      {/* Business Reviews */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Business Reviews and Ratings</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            In today's competitive market, business reviews and ratings are essential tools for evaluating manufacturers and suppliers of shipping containers in Bengaluru. These reviews, available on business directories and company websites, provide valuable insights into the experiences of previous clients, covering aspects such as product quality, storage solutions, pricing, and after-sales support.
          </p>
          <p>
            For businesses operating in the Peenya Industrial Area, reading reviews can help identify reliable manufacturers who consistently deliver high-quality industrial products and services. Positive feedback on timely delivery, robust storage options, and responsive customer service can guide potential buyers toward the best suppliers in Bengaluru, Karnataka.
          </p>
        </div>
      </section>

      {/* Cities Served */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Cities Served</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Shipping container manufacturers and suppliers based in Bengaluru extend their services far beyond the city limits, reaching clients across major cities in India such as Mumbai, Chennai, Delhi, Pune, Hyderabad, and Ahmedabad. Their extensive logistics network and central location in Bengaluru enable them to efficiently manage the storage, transport, and installation of containers for a wide range of applications.
          </p>
          <p>
            Whether you require a new or used container for storage, a modular office, or a customized solution for your business, these suppliers are equipped to provide timely delivery and professional support across India.
          </p>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-accent/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Why Choose Portable Office Cabin for Shipping Containers in Peenya</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "In-house fabrication for container offices, labour colonies, prefab toilets, rooftop sheds, and PEB-integrated structures",
            "Quality checks with photo/video sharing before dispatch",
            "Quick turnaround for standard 20 ft and 40 ft units",
            "Support for design, customization, relocation, and after-sales repairs",
            "B2B support for project developers, factories, and contractors",
            "B2C support for small business owners setting up container cafés or offices",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Get a Quote */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">How to Get a Quote for Peenya Industrial Area</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>Obtaining a quote is straightforward via phone, email, or website enquiry form.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">Share with Us</h3>
              <ul className="space-y-2 text-sm">
                <li>Peenya phase/location and exact site address</li>
                <li>Container size and quantity required</li>
                <li>Intended use (storage, office, accommodation)</li>
                <li>Target installation date</li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">You'll Receive</h3>
              <ul className="space-y-2 text-sm">
                <li>Technical specifications and recommended grade</li>
                <li>Customization options and delivery timelines</li>
                <li>Approximate transport and crane charges</li>
                <li>Transparent pricing with no hidden costs</li>
              </ul>
            </div>
          </div>
          <p className="mt-4">
            Site visits or virtual walkthroughs available for larger orders. Contact Portable Office Cabin today for shipping containers and modular structures in Peenya Industrial Area.
          </p>
        </div>
      </section>

      {/* Conclusion */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Conclusion</h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Shipping containers have become a cornerstone of industrial growth and infrastructure development in Bengaluru, Karnataka, and throughout India. Their versatility in storage, transport, and modular construction makes them an invaluable resource for businesses of all sizes. Manufacturers and suppliers in Bengaluru, especially those located in the Peenya Industrial Area, are at the forefront of offering high-quality products tailored to diverse industrial needs.
          </p>
          <p>
            By carefully considering product specifications, price, and customer reviews, clients can confidently select the right supplier for their requirements. For anyone seeking reliable storage, competitive price options, and expert service in the Peenya Industrial Area or beyond, reaching out to established manufacturers in Bengaluru is the key to accessing the best products and solutions available in the market.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent text-accent-foreground rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Need a Shipping Container in Peenya Industrial Area?</h2>
        <p className="mb-6 opacity-90">Share your requirements and get a tailored quote with transparent price and delivery information.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:+919731897976" className="inline-flex items-center justify-center gap-2 bg-background text-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
            <Phone className="h-5 w-5" />
            +91 97318 97976
          </a>
          <a href="/contact" className="inline-flex items-center justify-center gap-2 border-2 border-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent-foreground/10 transition-colors">
            Request a Quote
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions — Shipping Containers in Peenya</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
