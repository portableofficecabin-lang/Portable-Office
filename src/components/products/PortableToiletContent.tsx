import Link from "next/link";
import { Shield, Droplets, Leaf, Lock, Wrench, FileCheck, Accessibility, IndianRupee, Factory, Truck, CheckCircle2, Sparkles, Phone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FixedPriceCallout, type FixedOffer } from "./FixedPriceCallout";

const keyFeatures = [
  { icon: Factory, title: "Built-Type Prefab Construction", desc: "Rapid deployment and easy relocation — portable toilets are easy to install and move, emphasizing portability and quick setup." },
  { icon: Shield, title: "Rust-Proof MS Bodies", desc: "Withstands harsh weather and chemical exposure for long-lasting durability." },
  { icon: Droplets, title: "Integrated Ventilation", desc: "Exhaust fan options for odour management, inbuilt water tanks, wash basins, and odor control systems." },
  { icon: Wrench, title: "Easily Assembled", desc: "Minimal tools and labour required for installation — designed for rapid on-site deployment." },
  { icon: Leaf, title: "Eco-Friendly Options", desc: "Bio-digester technology and high-quality, weatherproof FRP materials ensure odor-free and hygienic use." },
  { icon: Lock, title: "Privacy & Hygiene", desc: "Unisex single units with lockable doors, hand sanitizers, and handwashing stations for personal hygiene." },
];

const accessibleSpecs = [
  { label: "Size", value: "4'x4' to 4'x5' footprint, 7–8 ft height" },
  { label: "Material", value: "MS monoblock or MS frame with MS cladding" },
  { label: "Pan Type", value: "Indian MS or Western ceramic (accessible height)" },
  { label: "Water Tank Capacity", value: "200–300 litres overhead or side-mounted" },
  { label: "Price Range", value: "₹35,000 – ₹55,000 (approx.)" },
];

const pricingTiers = [
  { tier: "Basic Economical MS Units", range: "From ₹8,000", desc: "Essential functionality for high-volume deployments" },
  { tier: "Standard Labour Toilets", range: "₹12,000 – ₹20,000", desc: "Durable units for construction sites and labour colonies" },
  { tier: "Western & Executive Models", range: "₹20,000 – ₹45,000", desc: "Premium fittings with Western ceramic pans" },
  { tier: "Bio Toilets", range: "₹15,000 – ₹45,000", desc: "Eco-friendly with bio-digester technology" },
  { tier: "Multi-Seater & Mobile Vans", range: "₹60,000 – ₹1,50,000+", desc: "Large-scale solutions for events and townships" },
];

/**
 * `offer` is present when the CURRENT product page is purchasable (passed in by
 * ProductDetailServer from isPurchasable()). This guide's ₹ figures — the per-single-unit tier
 * grid, the accessible-toilet price-range chip and the per-piece prose — describe SINGLE toilet
 * units, so on a purchasable page (e.g. the complete 4-unit block) they would read as a wildly
 * lower price for the very product being sold. With `offer` set they are replaced by the one
 * real, chargeable figure.
 */
export function PortableToiletContent({ offer }: { offer?: FixedOffer }) {
  return (
    <div className="space-y-10 mb-12">
      {/* Hero Introduction */}
      <div className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-3xl p-8 lg:p-12 overflow-hidden text-primary-foreground">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/5 rounded-full blur-[80px]" />
        <div className="relative">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">Complete Guide</span>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
            Portable Toilet: MS Portable Toilet Cabin, Mobile & Prefab Units
          </h2>
          <p className="text-primary-foreground/80 max-w-3xl leading-relaxed mb-6">
            Finding the right portable toilet solution can feel overwhelming when you are managing a construction project deadline, planning a large public event, or setting up sanitation facilities for an industrial plant. This comprehensive guide walks you through every category of portable sanitation unit we manufacture and supply across India, highlighting our comprehensive activities in manufacturing, supply, and customer service to fulfill your expectations.
          </p>
          <p className="text-primary-foreground/70 text-sm max-w-2xl leading-relaxed">
            With our expertise, you can get the best products and the best quote for portable toilets tailored to your needs.
          </p>
        </div>
      </div>

      {/* Overview Section */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-display font-bold text-xl text-foreground">Overview of Our Portable Toilet Solutions</h3>
        </div>
        <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
          <p>
            A portable toilet is a self-contained sanitation unit designed to operate without connection to fixed sewer lines or municipal drainage systems. These units rely on internal holding tanks, chemical treatments for waste breakdown and odour control, and proper ventilation to maintain hygiene until professional servicing takes place.
          </p>
          <p>
            We manufacture and supply a complete range of portable toilets across India, specializing in <strong className="text-foreground">MS, GI, ACP, and PUF panel cabins</strong>, as well as <strong className="text-foreground">FRP portable toilets, FRP portable western toilets, urinals, mobile toilet vans, and modular bathroom units</strong> with various compartments and seats.
          </p>
          <p>
            Customers can order single units or large batches for construction sites, outdoor events, industrial plants, highway projects, government tenders, weddings, parties, camping areas, emergency situations, government projects, and CSR initiatives. Whether you need five units for a small site or five hundred for a township project, our production capacity is structured to meet varying demand levels with consistent quality.
          </p>
          <p>
            Our core materials include <strong className="text-foreground">MS (Mild Steel), GI (Galvanized Iron), ACP (Aluminum Composite Panel), PUF (Polyurethane Foam) panel cabins, FRP (Fiberglass Reinforced Plastic), PVC, and steel</strong>, all manufactured using high-grade raw materials to ensure durability and compliance with industry standards.
          </p>
        </div>
      </div>

      {/* Key Features Grid */}
      <div>
        <h3 className="font-display font-bold text-xl text-foreground mb-6 text-center">What Makes Our Units Stand Out</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-3 group-hover:from-accent group-hover:to-amber-500 transition-all duration-300">
                  <Icon className="w-5 h-5 text-accent group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-display font-bold text-foreground mb-1.5">{feature.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Benefits */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-6 lg:p-8">
        <h3 className="font-display font-bold text-lg text-foreground mb-4">Additional Benefits</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Modern units include hand sanitizers or handwashing stations",
            "Clean, accessible facilities protect client privacy & improve satisfaction",
            "Portable toilets improve productivity by minimizing long worker breaks",
            "Help prevent open defecation, promoting enhanced hygiene & public health",
            "Renting portable toilets is more cost-effective than permanent plumbing",
            "Local authorities may require a specific number for regulatory compliance",
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Tiers — the tier grid quotes per-SINGLE-UNIT figures (₹8,000…₹1,50,000+), so on a
          purchasable page it is replaced by the real offer: a complete multi-unit block priced as
          one product must never sit beside single-toilet prices that look like its price. */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-foreground">{offer ? "Price" : "Indicative Pricing (2025)"}</h3>
            {!offer && <p className="text-xs text-muted-foreground">Ex-factory before GST</p>}
          </div>
        </div>
        {offer ? (
          <FixedPriceCallout
            offer={offer}
            note="This price is for the complete unit named above — it is not a per-seat or per-toilet figure."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingTiers.map((tier, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl p-5 hover:border-accent/30 transition-colors">
                <p className="font-display font-bold text-accent text-lg mb-1">{tier.range}</p>
                <p className="font-semibold text-foreground text-sm mb-1">{tier.tier}</p>
                <p className="text-muted-foreground text-xs">{tier.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accessible Toilets */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Accessibility className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-display font-bold text-xl text-foreground">Easy Accessible Portable Toilets</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">
          Accessible toilets are essential wherever people with disabilities, elderly users, or mobility-impaired individuals need sanitation facilities. This includes construction sites with diverse workforce requirements, public events, schools, hospitals, railway stations, and government buildings. Our accessible units are engineered to meet Indian accessibility guidelines with barrier-free design.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            "Wider doors with minimum 900mm clear opening for wheelchair entry",
            "Ramp access with anti-skid finish for safe approach",
            "Interior grab bars positioned for support while sitting and standing",
            "Low-level flush mechanism and wash basin within comfortable reach",
            "Adequate internal turning radius (minimum 1500mm) for wheelchairs",
          ].map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feat}</span>
            </div>
          ))}
        </div>

        {/* Spec Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-display font-semibold text-foreground">Specification</th>
                <th className="text-left p-3 font-display font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {/* On a purchasable page the accessible-toilet "Price Range ₹35,000–₹55,000" chip is
                  dropped — it describes a different (single accessible) unit, and a visible ₹ range
                  beside the real offer reads as this product's price. */}
              {accessibleSpecs.filter((spec) => !offer || spec.label !== "Price Range").map((spec, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="p-3 text-muted-foreground font-medium">{spec.label}</td>
                  <td className="p-3 text-foreground">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Economical MS Toilets */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Factory className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-display font-bold text-xl text-foreground">Economical MS Portable Toilets</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          When you need to deploy large numbers of units across labour colonies, small construction sites, or temporary projects with tight budgets, economical MS portable toilets deliver essential functionality without unnecessary frills. A standard economical MS cabin measures approximately <strong className="text-foreground">3'x3'x7'</strong>, constructed with 2–3mm MS thickness.
        </p>
        {/* Per-piece single-unit pricing — quotation-only pages only. On a purchasable page this
            "₹8,500–₹12,000 per piece" line would read as the product's price and contradict the
            fixed offer above. */}
        {!offer && (
          <p className="text-sm text-muted-foreground mb-5">
            <strong className="text-foreground">Real-world pricing:</strong> Starting from approx. ₹8,500–₹12,000 per piece (2025) for standard single units without water tank, ex-factory. Volume discounts apply for orders exceeding 20–50 units.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Lightweight yet durable construction for easy handling and relocation",
            "Rust-proof material that resists corrosion from chemicals and moisture",
            "Smooth internal surfaces for quick cleaning with minimal water",
            "Stackable design for efficient shipping and reduced transport costs",
            "UV-stabilized gelcoat finish that prevents fading and cracking",
            "Custom colours (blue, green, grey) and branding sticker options",
          ].map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion Sections */}
      <Accordion type="multiple" className="space-y-3">
        {/* Sanitation & Hygiene */}
        <AccordionItem value="sanitation" className="bg-card border border-border/50 rounded-2xl px-6 overflow-hidden">
          <AccordionTrigger className="font-display font-bold text-lg text-foreground hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-accent" />
              </div>
              Sanitation and Hygiene in Portable Toilets
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm leading-relaxed space-y-3 pb-6">
            <p>Maintaining high standards of sanitation and hygiene is fundamental to the design and operation of portable toilets, especially in demanding environments like construction sites, events, and temporary sanitation setups across India. Our portable toilets are engineered with features that prioritize user health and cleanliness, including proper ventilation systems to minimize odors and ensure fresh airflow.</p>
            <p>The use of rust-proof materials not only extends the lifespan of the units but also makes cleaning and disinfection more effective, helping to keep the toilets clean and safe for every user.</p>
            <p>To further enhance hygiene, our toilets incorporate easy-to-clean surfaces and efficient waste management systems that utilize approved chemicals to break down waste and control bacteria. Regular servicing and maintenance schedules are recommended to prevent the buildup of harmful bacteria and unpleasant odors.</p>
          </AccordionContent>
        </AccordionItem>

        {/* Eco-Friendly Options */}
        <AccordionItem value="eco" className="bg-card border border-border/50 rounded-2xl px-6 overflow-hidden">
          <AccordionTrigger className="font-display font-bold text-lg text-foreground hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-accent" />
              </div>
              Eco-Friendly Portable Toilet Options
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm leading-relaxed space-y-3 pb-6">
            <p>As sustainability becomes a priority for businesses and event organizers, eco-friendly portable toilet options are increasingly in demand across India. Our range includes FRP portable western toilets and FRP portable toilets, both crafted from recyclable materials that help reduce environmental impact and waste. These units are designed to use less water and fewer chemicals.</p>
            <p>Mobile toilet vans and camping toilets in our portfolio also feature innovative eco-friendly solutions, such as solar-powered lighting and composting systems that further minimize their environmental footprint. These features not only support green initiatives but also offer practical benefits in remote or off-grid locations.</p>
          </AccordionContent>
        </AccordionItem>

        {/* Safety & Security */}
        <AccordionItem value="safety" className="bg-card border border-border/50 rounded-2xl px-6 overflow-hidden">
          <AccordionTrigger className="font-display font-bold text-lg text-foreground hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-accent" />
              </div>
              Safety and Security Features
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm leading-relaxed space-y-3 pb-6">
            <p>Safety and security are paramount considerations when selecting portable toilets for construction sites, temporary sanitation setups, and public events. Our portable toilets are built with robust, rust-proof materials and stable structures to ensure user safety in all conditions. Each unit is equipped with lockable doors for privacy and security, while proper ventilation and optional exhaust fans maintain a safe, odor-free environment.</p>
            <p>Integrated lighting and clearly marked light points enhance visibility, especially in low-light conditions, reducing the risk of accidents. Advanced waste management systems are included to prevent leaks and contamination, further safeguarding users and the surrounding area.</p>
          </AccordionContent>
        </AccordionItem>

        {/* Installation & Maintenance */}
        <AccordionItem value="installation" className="bg-card border border-border/50 rounded-2xl px-6 overflow-hidden">
          <AccordionTrigger className="font-display font-bold text-lg text-foreground hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-accent" />
              </div>
              Installation and Maintenance Guide
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm leading-relaxed space-y-3 pb-6">
            <p>Proper installation and regular maintenance are key to ensuring the long-term performance and hygiene of your portable toilets. Installation begins with selecting a level surface, securely positioning the unit, and connecting the water tank and waste management system as per the product type. Ensuring proper ventilation is essential for odor control and user comfort.</p>
            <p>Routine maintenance involves cleaning the interior surfaces, checking and refilling the water tank, and servicing the waste management system to prevent blockages and maintain hygiene. Scheduled inspections help identify any issues early, ensuring that the toilets remain in optimal working condition.</p>
            <p>Our team in India offers comprehensive installation and maintenance support, tailored to your specific needs. Whether you require guidance for a single unit or a large batch, we provide detailed instructions and on-site assistance as needed.</p>
          </AccordionContent>
        </AccordionItem>

        {/* Regulations & Compliance */}
        <AccordionItem value="regulations" className="bg-card border border-border/50 rounded-2xl px-6 overflow-hidden">
          <AccordionTrigger className="font-display font-bold text-lg text-foreground hover:no-underline py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4 text-accent" />
              </div>
              Regulations and Compliance
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm leading-relaxed space-y-3 pb-6">
            <p>Compliance with regulations is essential when deploying portable toilets in India. All our products are manufactured in accordance with standards set by the Ministry of Urban Development and the Central Pollution Control Board, ensuring proper waste management, water conservation, and hygiene. We also adhere to international quality benchmarks such as ISO 9001:2015.</p>
            <p>Our products are designed to meet both local and international regulations, providing peace of mind for customers across diverse applications. For more information on regulatory requirements, product certifications, or to confirm compliance for your specific project, please contact us.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* CTA */}
      <div className="relative bg-gradient-to-r from-accent via-amber-500 to-accent rounded-2xl p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative">
          <h3 className="font-display font-bold text-2xl text-white mb-3">Get Your Custom Quote Today</h3>
          <p className="text-white/80 text-sm mb-6 max-w-xl mx-auto">
            Whether you need 5 units for a small site or 500 for a township project, our team will provide a tailored quote that fits your budget and timeline.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-accent font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
            >
              <Phone className="w-4 h-4" />
              Request a Callback
            </Link>
            <a
              href="https://wa.me/919731897976?text=Hi%2C%20I%20need%20a%20quote%20for%20portable%20toilets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/20 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
