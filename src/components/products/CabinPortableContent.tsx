import Link from "next/link";
import { CheckCircle, Building2, Factory, Zap, MapPin, Users, Shield, Wrench, Thermometer, Home, Layers, Truck, HardHat, IndianRupee, Clock, Star, Hammer, Leaf, Phone, Package, Settings, Droplets, Recycle, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OptimizedImage } from "@/components/OptimizedImage";
import cabinPortableInterior from "@/assets/products/cabin-portable-interior.webp";
import cabinPortableSite from "@/assets/products/cabin-portable-site.webp";
import cabinPortableOffice from "@/assets/products/cabin-portable-office.webp";
import cabinPortableContainer from "@/assets/products/cabin-portable-container.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

export function CabinPortableContent() {
  return (
    <div className="space-y-16">
      {/* Introduction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Cabin Portable: Complete Guide to Portable Cabins, Offices & Site Solutions</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Finding the right cabin portable solution can mean the difference between a project that runs smoothly and one plagued by delays and budget overruns. Whether you need a site office for your construction team, accommodation for workers, or utility units like portable toilets and security cabins, understanding your options is essential for making smart decisions in 2026.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Ideal for dynamic project environments where traditional construction is too slow or costly, portable cabins are designed with the ability to withstand extreme weather conditions, offering exceptional strength, durability, and adaptability to various environmental challenges.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This guide covers everything you need to know about portable cabins in India—from types and materials to specifications, processes, and real-world applications across industries.
        </p>
      </section>

      {/* Hero Image */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-border/20">
        <OptimizedImage
          src={resolveImageUrl(cabinPortableSite)}
          alt="Cabin portable unit deployed at a construction site with workers and crane in Bangalore by Portable Office Cabin"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Fast Answer */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Fast Answer: What Is a Cabin Portable & Why It Matters in 2026</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          A portable cabin is a prefabricated, movable structure manufactured primarily from mild steel (MS), galvanized iron (GI), or repurposed shipping container shells. These units arrive at your site ready to use or in modular panels for rapid assembly, serving as offices, worker accommodation, storage, security booths, and utility spaces.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {[
            { icon: IndianRupee, title: "60% Cheaper", desc: "Up to 60% cheaper than reinforced cement concrete (RCC) structures for temporary or semi-permanent needs" },
            { icon: Clock, title: "1-2 Day Install", desc: "Installation achievable in 1-2 days after delivery" },
            { icon: Shield, title: "10-20+ Year Lifespan", desc: "Lifespan extending 10-20+ years with basic maintenance like periodic repainting and sealant checks" },
            { icon: Zap, title: "Dynamic Environments", desc: "Ideal for dynamic project environments where traditional construction is too slow or costly" },
          ].map((item, idx) => (
            <div key={idx} className="bg-card border border-border/40 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center"><item.icon className="w-4 h-4 text-primary" /></div>
                <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 border border-border/30 rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Real-world examples of cabin portable applications:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> 20 ft MS site office for a Bengaluru IT park construction project</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> GI labour cabins deployed on a 2025 highway project in Maharashtra</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> 40 ft container office at a solar plant in Rajasthan</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Prefab security cabins at industrial gates in Gujarat</li>
          </ul>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          This article covers types (office, labour, toilets, security), materials (MS, GI, containers, sandwich panels), specifications, and the complete process from design to installation. The cabin listed on this page is sold at the single price shown at the top, inclusive of 18% GST.
        </p>
      </section>

      {/* Portable Cabin Basics */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Portable Cabin Basics: Types, Sizes & Core Features</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The term cabin portable serves as an umbrella covering offices, accommodation, storage, and utility cabins deployed across Indian states like Maharashtra, Rajasthan, Gujarat, Tamil Nadu, Uttar Pradesh, Telangana, and Delhi NCR.
        </p>

        <h3 className="text-xl font-semibold text-foreground mb-4">Standard sizes commonly used in India:</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
            <thead><tr className="bg-primary/10"><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Type</th><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Size</th></tr></thead>
            <tbody>
              {[
                ["Security booth", "6 x 4 ft or 4 x 4 to 8 x 6 ft"],
                ["Ticket/guard cabin", "10 x 8 ft"],
                ["Site offices", "20 x 8 ft and 40 x 8 ft"],
                ["Toilet blocks", "12 x 10 ft"],
                ["G+1 labour accommodation blocks", "Stacked units housing 6-16 workers per base unit"],
              ].map(([type, size], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="p-3 font-medium text-foreground border-b border-border/20">{type}</td>
                  <td className="p-3 text-muted-foreground border-b border-border/20">{size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4">Main structural options:</h3>
        <ul className="space-y-2 text-muted-foreground mb-6">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Mild steel (MS) framed cabins with welded frames and sheet cladding</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> GI (galvanized iron) modular cabins with superior corrosion resistance</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Converted shipping containers (20 ft / 40 ft ISO containers)</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Light-gauge steel prefabs using sandwich panels</li>
        </ul>

        <h3 className="text-xl font-semibold text-foreground mb-4">Typical interior features:</h3>
        <ul className="space-y-2 text-muted-foreground mb-6">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> PUF/EPS or rockwool sandwich panel insulation</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Vinyl or laminated flooring (chequered plates for heavy-duty use)</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Powder-coated aluminum or UPVC windows</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Pre-wired electrical systems with MCBs and LED lighting</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Optional AC/split AC provisions</li>
        </ul>

        <h3 className="text-xl font-semibold text-foreground mb-4">2026 compliance aspects for India:</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Fire-retardant panels available on demand</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Electrical work following IS standards with proper earthing</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Safe plumbing provisions in toilet cabins compatible with septic or bio-digester systems</li>
        </ul>
      </section>

      {/* Key Categories */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Key Categories of Cabin Portable Solutions</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          When buyers search for cabin portable solutions in India, they typically need one of these main product categories:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Building2, title: "Portable Office Cabin", desc: "20 ft MS or GI cabin for site engineers, project managers, and admin teams" },
            { icon: Layers, title: "Site Office Containers", desc: "Converted 20 ft or 40 ft shipping containers with superior durability" },
            { icon: Users, title: "Labour/Worker Accommodation", desc: "Basic MS/GI cabins or bunker bed containers for 6-16+ workers" },
            { icon: Home, title: "Prefab Homes", desc: "Semi-permanent structures for farmhouses or remote locations" },
            { icon: Shield, title: "Security Cabins", desc: "FRP/MS/GI units for factory gates, society entrances, and toll booths" },
            { icon: Droplets, title: "Portable Toilet Cabins", desc: "Single and multi-stall units with Indian/Western seats" },
            { icon: Package, title: "Cargo/Storage Containers", desc: "Weatherproof units for materials and equipment" },
            { icon: Settings, title: "Specialized Control/Conference Rooms", desc: "Sound-insulated cabins for meetings and operations" },
          ].map((cat, idx) => (
            <div key={idx} className="flex gap-4 bg-card border border-border/40 rounded-xl p-5">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <cat.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{cat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          Niche formats include bunker bed containers for high-density housing, G+1 modular blocks for labour colonies accommodating 300+ workers, and modular sales offices for real estate project launches.
        </p>
      </section>

      {/* Portable Office Cabins & Site Office Containers */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Portable Office Cabins & Site Office Containers</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The portable office cabin represents the most in-demand cabin portable product for construction, infrastructure, and corporate projects across India. These office spaces provide reliable, comfortable work environments that can be operational within days.
        </p>

        <h3 className="text-xl font-semibold text-foreground mb-4">Key differences between fabricated MS cabins and container offices:</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
            <thead><tr className="bg-primary/10">
              <th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Feature</th>
              <th className="text-left p-3 font-semibold text-foreground border-b border-border/30">MS Portable Office</th>
              <th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Container Office</th>
            </tr></thead>
            <tbody>
              {[
                ["Weight", "Lighter, easier transport", "Heavier (2-4 tons for 20ft)"],
                ["Durability", "10-15 years", "15-25 years"],
                ["Customization", "Highly flexible sizes", "Fixed ISO dimensions"],
                ["Aesthetics", "Good with ACP cladding", "Industrial, robust"],
              ].map(([feature, ms, container], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="p-3 font-medium text-foreground border-b border-border/20">{feature}</td>
                  <td className="p-3 text-muted-foreground border-b border-border/20">{ms}</td>
                  <td className="p-3 text-muted-foreground border-b border-border/20">{container}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4">Typical internal fit-out includes:</h3>
        <ul className="space-y-2 text-muted-foreground mb-6">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Insulated walls and roof panels</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Laminated or chequered plate flooring</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Aluminum or UPVC windows</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Modular workstations and meeting rooms</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> LED lighting with socket points</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Split AC provisions</li>
        </ul>

        <div className="bg-muted/30 border border-border/30 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Real-world deployments:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" /> 2024 metro rail sites in Mumbai using 40 ft container offices for planning teams</li>
            <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" /> 2025 solar park offices in Gujarat using ACP-panel MS porta cabins</li>
            <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Highway project command centers in Rajasthan</li>
          </ul>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-4">
          Container-based units typically cost 10-20% more than standard MS cabins but offer longer service life in remote or harsh environments. Bulk orders often receive project pricing from suppliers.
        </p>

        <h3 className="text-xl font-semibold text-foreground mb-3">Delivery timelines:</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2"><Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Standard 20 ft cabin: 2-3 weeks from order confirmation</li>
          <li className="flex items-start gap-2"><Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Customized conference or training room cabins: 3-4 weeks</li>
        </ul>
      </section>

      {/* Interior Image */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-border/20">
        <OptimizedImage
          src={resolveImageUrl(cabinPortableInterior)}
          alt="Modern cabin portable office interior with workstations, AC, LED lighting, and insulated panel walls by Portable Office Cabin"
          className="w-full h-auto object-cover"
        />
        <p className="text-sm text-muted-foreground text-center py-3 bg-card">Interior of a fully fitted cabin portable office with ergonomic workstations</p>
      </div>

      {/* Customised Workstations & Conference Cabins */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Customised Portable Workstations & Conference Cabins</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Beyond basic portable office configurations, clients often require specialized portable workspaces designed for specific needs.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border/40 rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3">Portable workstation cabins feature:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Rows of desks with cable management and data points</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Ergonomic lighting and ventilation</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Glass partitions for manager cabins</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Designed for IT, EPC, and project management teams</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3">Portable conference room cabins include:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Seating for 6-20 people with meeting tables</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> LED screen or projector provisions</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Sound-insulated walls for privacy</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Proper ventilation and AC layout</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          A 2025 real estate sales office in Pune used a 30 ft ACP-clad conference cabin for client presentations at their greenfield site. These cabins can be relocated by crane or trailer and refitted internally when business requirements change, making them highly economical over multiple projects.
        </p>
      </section>

      {/* Labour Accommodation */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Labour Accommodation, Colonies & Bunk Bed Cabins</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Worker housing drives significant cabin portable demand on infrastructure, road, and industrial projects across India. Providing durable, safe accommodation helps projects meet compliance requirements while keeping employees comfortable.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Standard Labour Cabins", items: ["MS or GI structures with basic insulation", "Cross ventilation through strategically placed windows", "Space for 6-16 workers per unit depending on configuration", "Easy maintenance with simple interior finishes"] },
            { title: "G+1 Modular Accommodation Blocks", items: ["Stacked cabins using structural steel frames", "External staircases and verandahs", "Double the capacity on limited land", "Suitable for projects with space constraints"] },
            { title: "Bunker Bed Container Cabins", items: ["20 ft or 40 ft containers fitted with metal bunk beds", "Individual lockers for personal belongings", "Optional attached toilet facilities", "Compact, high-occupancy housing solution"] },
            { title: "Labour Colony Concept for Large Sites", items: ["Grouped accommodation for 300+ workers", "Kitchen and dining facilities", "First-aid room and admin office", "Toilet blocks at safe distances from water points", "Fire safety provisions and clear evacuation routes"] },
          ].map((block, idx) => (
            <div key={idx} className="bg-muted/30 border border-border/30 rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">{block.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {block.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          Highway projects in 2025 have deployed complete labour colonies with all amenities, enabling crews to house workers properly from day one of execution.
        </p>
      </section>

      {/* Security Cabins, Toilets & Utility Units */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Security Cabins, Portable Toilets & Utility Units</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Not all cabin portable solutions are offices or accommodation—many are small utility structures critical for daily operations at any site.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Security Cabins</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Sizes: 4 x 4 ft to 8 x 6 ft</li>
              <li>• FRP, MS, or GI construction</li>
              <li>• Large windows for 360° visibility</li>
              <li>• Counter space, fan/light fitted</li>
              <li>• Factory gates, society entrances, toll booths</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Droplets className="w-5 h-5 text-primary" /> Portable Toilets</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Single and multi-stall configurations</li>
              <li>• Indian and Western seat options</li>
              <li>• Overhead water tanks</li>
              <li>• Bio-digester or septic-compatible</li>
              <li>• Non-slip flooring for safety</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Other Utility Cabins</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Electrical control rooms & E-rooms</li>
              <li>• Pump house enclosures</li>
              <li>• Ticket booths and kiosks</li>
              <li>• Small storage units</li>
              <li>• Easy-to-clean interiors, proper ventilation</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          Portable toilets have been deployed at 2023-2025 religious events, trade fairs, and EPC project sites across Uttar Pradesh, Tamil Nadu, and Telangana.
        </p>
      </section>

      {/* Office Exterior Image */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-border/20">
        <OptimizedImage
          src={resolveImageUrl(cabinPortableOffice)}
          alt="Portable office cabin exterior with MS steel frame, insulated sandwich panels, and UPVC windows by Portable Office Cabin in Peenya industrial area"
          className="w-full h-auto object-cover"
        />
        <p className="text-sm text-muted-foreground text-center py-3 bg-card">Portable office cabin exterior with steel frame and insulated panels</p>
      </div>

      {/* Materials & Construction */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Materials & Construction: MS, GI, Container & Sandwich Panels</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The choice of material directly impacts lifespan, maintenance requirements, and overall cost of any cabin portable solution. Understanding these options helps buyers make informed decisions.
        </p>
        <div className="space-y-4">
          {[
            { icon: Hammer, title: "Mild Steel (MS) Cabins", items: ["Welded frame construction with MS sheet cladding", "Anti-rust primers and industrial paint finish", "Ideal for rugged site conditions", "Customized to any size", "Requires repainting every few years in harsh environments"] },
            { icon: Shield, title: "GI (Galvanized Iron) Cabins", items: ["20-30% better corrosion resistance than MS", "Commonly used for labour cabins, security cabins, and toilets", "Excellent for coastal or high-rainfall regions like Maharashtra and Tamil Nadu"] },
            { icon: Layers, title: "Shipping Container Conversions", items: ["ISO 20 ft and 40 ft containers built from CORTEN steel", "Inherent weatherproofing and structural integrity", "Wind-resistant up to 150 km/h", "Modified with doors, windows, insulation, and interior finishes", "Heavier but longer-lasting"] },
            { icon: Thermometer, title: "Sandwich Panel Systems (PUF/EPS/Rockwool)", items: ["Superior thermal insulation (R-values up to 30)", "Lighter weight (40-50 kg/m² density)", "30-50% faster erection time", "Suitable for PEB buildings and modular office blocks"] },
          ].map((material, idx) => (
            <div key={idx} className="flex gap-4 bg-card border border-border/40 rounded-xl p-5">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <material.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{material.title}</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {material.items.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Premium finishing options:</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> ACP cladding for exterior aesthetics</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> UPVC windows and doors for energy efficiency</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Modular furniture for rapid interior setup</li>
          </ul>
        </div>
      </section>

      {/* Utility Integration */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Utility Integration: Power, Water & Comfort Systems</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          When it comes to portable cabins, seamless utility integration is essential for creating office spaces and site offices that are not only functional but also comfortable and efficient. As a leading manufacturer in India, we understand that every project—whether it's a construction site, a modular meeting room, or a temporary accommodation unit—demands reliable access to power, water, and climate control.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Our portable office cabins and site offices are engineered with advanced electrical systems, ensuring a stable and safe power supply for all your operational needs. From customized wiring layouts to strategically placed outlets and lighting, each cabin is designed to suit the specific requirements of your business. Whether you need dedicated workstations, meeting rooms, or specialized equipment, our experts ensure your portable office is fitted for productivity from day one.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Water supply and sanitation are equally prioritized. Our cabins come with integrated plumbing and high-quality sanitation facilities, making them ideal for use as portable toilets, security cabins, and accommodation units. Hygienic water systems and easy-to-maintain fixtures guarantee a clean and comfortable environment for your employees, no matter the location or duration of your project.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Comfort is never compromised. Each cabin features robust insulation, weatherproofing, and efficient HVAC systems to maintain optimal temperature and humidity—crucial for both employee well-being and equipment longevity. Our modular designs are built to withstand India's diverse climate, from heavy rain to extreme heat, ensuring durability and low maintenance over years of use.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We are committed to providing cost effective, easy-to-install, and reliable portable cabin solutions that meet the evolving needs of our clients. With a strong team of experienced professionals and a proven track record across a variety of applications, we deliver products that are not only quick to transport and install but also built to last. Our focus on quality, customization, and after-sales support has established us as a trusted partner for businesses across India.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          No matter your requirements—be it a temporary site office, a permanent modular workspace, or specialized utility cabins—our range of products is designed to provide flexible, scalable, and economical solutions. Let our experts help you find the right fit for your project. Send your enquiry today for a customized quote, and please wait while we process your request. Your ideal portable cabin solution is just a step away.
        </p>
      </section>

      {/* Container Image */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-border/20">
        <OptimizedImage
          src={resolveImageUrl(cabinPortableContainer)}
          alt="Portable container cabin deployed at a solar energy farm site for control room operations by Portable Office Cabin"
          className="w-full h-auto object-cover"
        />
        <p className="text-sm text-muted-foreground text-center py-3 bg-card">Container cabin deployed at a renewable energy project site</p>
      </div>

      {/* Cost, Speed & Sustainability */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Cost, Speed & Sustainability Benefits</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The rapid growth of cabins portable from 2020 to 2026 in India stems from three interconnected advantages: cost savings, speed of deployment, and environmental benefits.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <IndianRupee className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2 text-sm">Cost Advantages</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• 40-60% savings vs brick-and-mortar</li>
              <li>• 80% reduction in site labour</li>
              <li>• ROI through 3-5 project reuse</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <Zap className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2 text-sm">Speed Benefits</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Factory production: 2-4 weeks</li>
              <li>• On-site install: 1-2 days</li>
              <li>• No weather-dependent curing</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <Truck className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2 text-sm">Reusability</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Shifted via trailer & crane</li>
              <li>• Costs spread over years</li>
              <li>• Internal refitting possible</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <Leaf className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-2 text-sm">Sustainability</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• 90% recyclable steel</li>
              <li>• Solar rooftop compatible</li>
              <li>• 30-40% energy savings</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-3">Expected lifespan with proper maintenance:</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
            <thead><tr className="bg-primary/10"><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Type</th><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Lifespan</th></tr></thead>
            <tbody>
              {[
                ["Standard MS porta cabins", "10-15 years"],
                ["Container-based units", "15-25 years"],
                ["Sandwich panel structures", "10-20 years depending on environment"],
              ].map(([type, life], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="p-3 font-medium text-foreground border-b border-border/20">{type}</td>
                  <td className="p-3 text-muted-foreground border-b border-border/20">{life}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Process: Enquiry to Move-In */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">How the Portable Cabin Process Works: From Enquiry to Move-In</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          The standard journey in 2026 follows a predictable path: enquiry → site assessment → design and quote → manufacturing → delivery and installation → handover.
        </p>
        <div className="space-y-4">
          {[
            { step: "1", title: "Site Assessment", items: ["Checking access roads for trailer delivery", "Verifying crane reach and maneuvering space", "Determining foundation requirements (simple concrete blocks or RCC pads)", "Identifying utility connection points"] },
            { step: "2", title: "Design & Quotation", items: ["Selecting size and material (MS/GI/container)", "Finalizing internal layout and workstation configurations", "Specifying electrical and plumbing requirements", "Agreeing on commercial terms and delivery schedule"] },
            { step: "3", title: "Manufacturing", items: ["Cutting, welding, and frame assembly", "Panel installation and insulation fitting", "Wiring and electrical work", "Painting and finishing", "Factory testing of lights, sockets, and fixtures"] },
            { step: "4", title: "Delivery & Installation", items: ["Transporting by trailer to site", "Lifting with crane or hydra equipment", "Aligning on foundation blocks", "Connecting electricity and water", "Final interior cleaning"] },
            { step: "5", title: "Move-in Checklist", items: ["Keys and access verification", "MCB and electrical testing", "AC functionality check", "Leak inspection at windows and roof", "Sign-off documentation"] },
          ].map((process, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">{process.step}</div>
              <div className="bg-card border border-border/40 rounded-xl p-5 flex-1">
                <h3 className="font-semibold text-foreground mb-2">{process.title}</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {process.items.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Warranty, Maintenance & After-Sales */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Warranty, Maintenance & After-Sales Support</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          A portable cabin is an asset that needs light but regular maintenance for a long service life.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Typical Warranty Structure</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• 1-year standard warranty on defects</li>
              <li>• Optional extended warranties</li>
              <li>• Limited coverage for electrical fixtures</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Basic Maintenance Tasks</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Repainting exterior every few years</li>
              <li>• Checking sealant at windows/doors</li>
              <li>• Verifying roof drainage</li>
              <li>• Periodic electrical inspections</li>
            </ul>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">After-Sales Support</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• 24-72 hour service response</li>
              <li>• Spare parts availability</li>
              <li>• Relocation & refitting services</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          Warranty, after-sales support, and customer care are provided every step of the way to ensure client satisfaction and reliability.
        </p>
      </section>

      {/* Applications Across Industries */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Applications Across Industries & Use Cases in India</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Cabins portable now serve sectors well beyond construction, demonstrating remarkable versatility across India.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: HardHat, title: "Construction & Infrastructure", desc: "Site offices for highway, metro, and industrial park projects (2022-2026). Labour colonies, store rooms, QA/QC laboratories" },
            { icon: Zap, title: "Power & Renewable Energy", desc: "Site control rooms at solar and wind farms. Inverter station enclosures. O&M offices in Gujarat, Rajasthan, and Tamil Nadu" },
            { icon: Users, title: "Education & Institutional", desc: "Additional classrooms for schools. Admin blocks and exam control rooms. Temporary libraries and activity rooms" },
            { icon: Building2, title: "Commercial & Retail", desc: "Portable sales offices for real estate launches. Ticket counters and event kiosks. Pop-up showrooms for automobile displays" },
            { icon: Star, title: "Healthcare & Public Services", desc: "Vaccination booths and testing centres. Temporary clinics. Disaster-relief shelters deployed rapidly during emergencies" },
          ].map((app, idx) => (
            <div key={idx} className="bg-muted/30 border border-border/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3"><app.icon className="w-5 h-5 text-primary" /><h3 className="font-semibold text-foreground text-sm">{app.title}</h3></div>
              <p className="text-sm text-muted-foreground leading-relaxed">{app.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Choosing the Right Cabin */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Choosing the Right Cabin Portable for Your Project</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Making the right choice requires evaluating several factors against your specific project requirements. Here's a practical checklist for decision-makers.
        </p>

        <h3 className="text-xl font-semibold text-foreground mb-4">Material selection guide:</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
            <thead><tr className="bg-primary/10"><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Requirement</th><th className="text-left p-3 font-semibold text-foreground border-b border-border/30">Best Option</th></tr></thead>
            <tbody>
              {[
                ["Maximum customization", "MS fabricated"],
                ["Coastal/humid locations", "GI or container"],
                ["Premium durability", "Container conversion"],
                ["Fast assembly, good insulation", "Sandwich panels"],
              ].map(([req, option], idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="p-3 font-medium text-foreground border-b border-border/20">{req}</td>
                  <td className="p-3 text-muted-foreground border-b border-border/20">{option}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4">Supplier evaluation checklist:</h3>
        <ul className="space-y-2 text-muted-foreground mb-6">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Nature of business (manufacturer, supplier, or trader)</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Years established in the business</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Total number of cabins supplied</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Sample sites available for visits</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Quality of welding, paint, and overall finish</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Clarity of documentation (drawings, BOQ, warranty)</li>
        </ul>

        <h3 className="text-xl font-semibold text-foreground mb-4">What sits outside the unit price:</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2"><IndianRupee className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Transport to your site — calculated at checkout from your delivery pincode, and free within 50 km of our works</li>
          <li className="flex items-start gap-2"><IndianRupee className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Installation — an optional line item you can add at checkout</li>
          <li className="flex items-start gap-2"><IndianRupee className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Utility connection work at your end (power and water hookup)</li>
          <li className="flex items-start gap-2"><IndianRupee className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Relocating the cabin to a future site — arranged and quoted at the time</li>
        </ul>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">FAQs About Cabin Portable in 2026</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Here are answers to the most common questions buyers in India have about portable cabins.
        </p>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {[
            { q: "How long does a portable cabin last?", a: "With proper maintenance, MS cabins last 10-15 years, while container-based units can serve 15-25 years depending on environment and care." },
            { q: "Can we get multi-storey (G+1 or G+2) cabins?", a: "G+1 configurations are common and well-established. G+2 requires additional structural engineering and is available from leading manufacturer firms with the right expertise." },
            { q: "Is permission required from local authorities?", a: "Temporary structures under 200 sqm often need minimal permissions. For placements exceeding one year, check with local panchayat or municipal authorities." },
            { q: "Can cabins be air-conditioned?", a: "Yes, portable cabins come with pre-provisioned AC points and electrical capacity for split AC units." },
            { q: "What about fire safety?", a: "Fire-retardant panels and compliant electrical systems are available on request to meet safety norms." },
            { q: "How do delivery timelines vary?", a: "Metro cities typically see 2-week delivery; remote or hilly terrain may require 4+ weeks due to logistics challenges. Please wait for confirmation of lead times based on your specific location." },
            { q: "Purchase vs rental?", a: "Outright purchase suits projects over 12 months; rental works for short-term needs with 20-30% lower monthly costs but less flexibility." },
          ].map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`} className="border border-border/40 rounded-xl px-4 bg-card">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Get Your Cabin Portable Solution in Place Now</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Portable cabins deliver the speed, savings, and flexibility that traditional construction simply cannot match in 2026. With the prefab and portable cabin industry in India projected to reach $23-35 billion by 2030, these solutions have proven their reliability across construction sites, renewable energy projects, and countless other applications.
        </p>
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Take action for your upcoming project:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Plan cabin requirements at the tender or pre-construction stage</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Request a layout proposal based on your site plan</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Get an indicative quote from established suppliers</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Schedule a site visit to inspect quality firsthand</li>
          </ul>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Lead times run 2-4 weeks for standard units, so early confirmation helps align manufacturing and logistics with your project milestones. Send your enquiry today to ensure your site offices, accommodation, and utility units are ready when you need them.
        </p>
      </section>
    </div>
  );
}
