import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Truck, IndianRupee, Recycle, Clock, Wrench, MapPin, Building2 } from "lucide-react";
import krishnagiriStorage from "@/assets/products/shipping-container-krishnagiri-storage.webp";
import krishnagiriOffice from "@/assets/products/shipping-container-krishnagiri-office.webp";
import krishnagiriSite from "@/assets/products/shipping-container-krishnagiri-site.webp";
import krishnagiriYard from "@/assets/products/shipping-container-krishnagiri-yard.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const highlights = [
  { icon: Shield, title: "Corten Steel Durability", description: "Corrosion-resistant steel withstands hot summers and monsoon rains in Krishnagiri" },
  { icon: Clock, title: "Deploy in 3–7 Days", description: "Standard units delivered within a week versus 30–60 days for conventional structures" },
  { icon: IndianRupee, title: "20–35% Cost Savings", description: "Lower than RCC buildings with predictable budgeting and minimal civil work" },
  { icon: Truck, title: "Relocatable Units", description: "Move containers between Krishnagiri, Hosur, and Dharmapuri as projects shift" },
  { icon: Recycle, title: "Sustainable Choice", description: "Repurposing containers reduces construction waste and embodied carbon" },
  { icon: Wrench, title: "Full Customization", description: "Interior panels, insulation, electrical provisions, and security enhancements" },
  { icon: MapPin, title: "Local Coverage", description: "Serving Krishnagiri, Hosur, Rayakottai, Vellore, and surrounding districts" },
  { icon: Building2, title: "Diverse Applications", description: "Site offices, warehousing, labour camps, cafés, homes, and pop-up shops" },
];

const containerTypes = [
  { type: "Used 20 ft & 40 ft storage containers", use: "Warehousing cement, tools, and spares" },
  { type: "Customized storage containers", use: "Shelving, ventilation, and security locks" },
  { type: "Fully finished container offices", use: "Electrical wiring, AC provisions, workstations" },
  { type: "Container homes", use: "Bedroom, toilet, and pantry — residential use" },
  { type: "Portable security cabins", use: "4×4 ft or 6×6 ft guard rooms" },
  { type: "Container cafés", use: "Highway outlets and retail pop-up shops" },
  { type: "Labour colonies", use: "Worker housing with bunk layouts" },
];

const applications = [
  "Construction site offices in SIPCOT industrial areas",
  "Industrial warehouse storage for manufacturing plants",
  "Educational examination rooms and temporary classrooms",
  "Agricultural equipment storage on farmlands",
  "Retail pop-up shops along NH-44 and local markets",
  "Residential farm stays near Krishnagiri hills",
];

const pricingRows = [
  { type: "Used 20 ft storage container", range: "₹1,50,000 – ₹2,00,000" },
  { type: "Used 40 ft storage container", range: "₹2,00,000 – ₹3,00,000" },
  { type: "Finished 20 ft container office", range: "₹1,80,000 – ₹2,50,000" },
  { type: "Finished 40 ft container office", range: "₹3,00,000 – ₹5,00,000+" },
  { type: "Container home (fully fitted)", range: "Custom quote" },
];

const faqs = [
  { q: "What sizes of shipping containers are available in Krishnagiri?", a: "We supply standard 10 ft, 20 ft, and 40 ft containers in both standard height (8.6 ft) and high cube (9.6 ft) variants. Custom sizes can be fabricated on request." },
  { q: "Can shipping containers be used as permanent structures?", a: "Yes. With proper foundation, insulation, anti-corrosive coatings, and periodic maintenance, containers can serve as permanent structures lasting 25+ years." },
  { q: "Do I need approvals for placing a container in Krishnagiri?", a: "Check with your local panchayat or municipal authority. Commercial uses and structures on agricultural land may require specific permissions. We provide AutoCAD drawings to support your application." },
  { q: "What is the delivery timeline for containers in Krishnagiri?", a: "Stock units deliver in 3–5 days. Custom-built containers with interior fit-out take 15–30 days from design freeze." },
  { q: "Can I relocate the container later?", a: "Absolutely. Containers are designed for relocation via crane and flatbed trailer. We handle logistics for moves within Tamil Nadu and across India." },
  { q: "What is the difference between cargo-worthy and refurbished containers?", a: "Cargo-worthy containers have minor dents and are suitable for basic storage. Refurbished containers are sandblasted, repainted, and fitted with new flooring—ideal for offices and homes." },
  { q: "Do you offer rental options in Krishnagiri?", a: "Yes. We offer monthly rentals starting from ₹5,000 for 20 ft units. Rental includes maintenance and avoids upfront transport costs." },
  { q: "What customization options are available?", a: "Full customization including PUF insulation (50–100 mm), electrical wiring, AC provisions, modular workstations, security locks, shelving, vinyl flooring, and external branding." },
];

export function ShippingContainerKrishnagiriContent() {
  return (
    <div className="space-y-16">
      {/* Hero Images */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(krishnagiriStorage)}
            alt="20 ft orange and blue shipping container with doors open for industrial storage in Krishnagiri SIPCOT area by Portable Office Cabin"
            title="Shipping container in Krishnagiri for storage — 20 ft Corten steel unit by Portable Office Cabin"
            productName="Shipping Container in Krishnagiri"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(krishnagiriOffice)}
            alt="Blue 40 ft shipping container converted to site office with marine plywood flooring delivered near Hosur Krishnagiri by Portable Office Cabin"
            title="40 ft container office in Krishnagiri district — insulated modular workspace by Portable Office Cabin"
            productName="Shipping Container in Krishnagiri"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(krishnagiriSite)}
            alt="Blue ISO shipping container at port yard ready for dispatch to Krishnagiri and Dharmapuri by Portable Office Cabin"
            title="ISO shipping container dispatched to Krishnagiri — cargo-worthy Corten steel unit by Portable Office Cabin"
            productName="Shipping Container in Krishnagiri"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
        <div className="rounded-xl overflow-hidden">
          <OptimizedImage
            src={resolveImageUrl(krishnagiriYard)}
            alt="Orange 20 ft shipping container with double doors open at storage yard serving Krishnagiri Rayakottai and Vellore by Portable Office Cabin"
            title="Used shipping container for sale in Krishnagiri — refurbished 20 ft unit by Portable Office Cabin"
            productName="Shipping Container in Krishnagiri"
            className="w-full h-auto"
            aspectRatio="4/3"
          />
        </div>
      </div>

      {/* Introduction */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Shipping Containers in Krishnagiri — Storage, Offices & Modular Solutions
        </h2>
        <p className="text-muted-foreground mb-4">
          As India's industrial growth accelerates through 2025–2026, demand for shipping container solutions in Krishnagiri continues rising. Portable Office Cabin serves as a trusted manufacturer and supplier of portable and prefabricated container structures for customers across Krishnagiri, Hosur, Rayakottai, and throughout India. Whether you need storage, site offices, or modular buildings, our products are designed for both B2B construction firms and B2C small businesses.
        </p>
        <p className="text-muted-foreground mb-4">
          There are several manufacturers and suppliers of used shipping containers in Krishnagiri. Portable Office Cabin is a provider of used shipping containers for storage in Krishnagiri, offering 20 ft and 40 ft units. Prefabricated and portable building solutions offer substantial cost savings compared to traditional construction methods, reducing construction time, labour costs, and material waste through streamlined manufacturing processes.
        </p>
      </section>

      {/* Why Choose */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Why Choose Shipping Containers in Krishnagiri?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item) => (
            <Card key={item.title} className="border-border">
              <CardContent className="p-5">
                <item.icon className="h-8 w-8 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Types of Solutions */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Types of Shipping Container Solutions We Offer
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Container Type</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {containerTypes.map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.type}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Used Containers */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Used Shipping Containers for Storage in Krishnagiri
        </h2>
        <p className="text-muted-foreground mb-4">
          Many customers prefer used shipping containers for cost-effective storage. We procure decommissioned ISO containers, then process refurbishment including rust treatment, repainting, and floor repairs. Standard sizes include 20 ft and 40 ft lengths with heavy-duty Corten steel construction, placed on simple PCC blocks.
        </p>
        <p className="text-muted-foreground">
          Used containers are available in cargo-worthy, wind & water tight (WWT), and fully refurbished grades — each suited for different applications from basic warehousing to long-term office conversions.
        </p>
      </section>

      {/* Applications */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Applications in Krishnagiri District
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => (
            <div key={app} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <Building2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{app}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4">
          Many suppliers have branches in nearby industrial areas like Hosur, Vellore, and Chennai, effectively covering the Krishnagiri district. We also serve Dharmapuri and Salem regions.
        </p>
      </section>

      {/* Specifications */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Specifications & Customization Options
        </h2>
        <p className="text-muted-foreground mb-4">
          Choose from 10 ft, 20 ft, or 40 ft containers with interior panels, insulation (PUF 50–100 mm), electrical provisions including MCB panels and LED lighting, security enhancements with multi-point deadbolt locks, vinyl or PVC flooring, and modular furniture — all customizable to your requirements.
        </p>
      </section>

      {/* Pricing */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Price Range (2025–2026)
        </h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Container Type</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Indicative Price</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row, i) => (
                <tr key={row.type} className={i % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.type}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          * Prices are indicative and exclude GST, transport, and installation. Contact us for detailed quotations after site assessment.
        </p>
      </section>

      {/* How We Work */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          How We Work
        </h2>
        <p className="text-muted-foreground mb-4">
          Our process covers requirement analysis, design proposals, manufacturing, quality checks, transportation, and after-sales support — ensuring customer satisfaction and meeting project timelines. From your initial enquiry to final handover, our Bengaluru-based team manages every step with clear communication and defined milestones.
        </p>
      </section>

      {/* Why Buy From Us */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Why Buy from Portable Office Cabin?
        </h2>
        <ul className="space-y-3">
          {[
            "In-house manufacturing with end-to-end quality control",
            "Diverse project experience across construction, industrial, education, and government sectors",
            "Full customization strength — from basic storage to premium fitted offices",
            "Local understanding of Krishnagiri's terrain, climate, and logistics",
            "Karnataka and Tamil Nadu-based operations for quicker site visits and delivery",
            "Sustainability: 90% container reuse, minimal debris versus brick-and-mortar",
          ].map((point) => (
            <li key={point} className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How to Order */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          How to Get a Quote
        </h2>
        <p className="text-muted-foreground mb-4">Share these details with us for a budgetary estimate within 24 hours:</p>
        <ul className="space-y-2 mb-4">
          {[
            "Intended use (storage, office, home, café, labour camp)",
            "Required size (10 ft / 20 ft / 40 ft / high cube)",
            "Number of units needed",
            "Site address in Krishnagiri district",
            "Ground or elevated placement",
            "Desired completion date",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">
          Quotations include container cost, fabrication charges, basic electrical/plumbing, delivery within Tamil Nadu, and optional installation. Site visits in Krishnagiri can be scheduled within 1–3 days for complex projects.
        </p>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
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

      {/* Conclusion */}
      <section className="bg-muted/30 rounded-xl p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Start Your Container Project in Krishnagiri Today
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Request a customized quote from Portable Office Cabin — committed to quality, efficiency, and sustainability. Call, email, or fill out an enquiry form on our website. Mention "shipping container in Krishnagiri" so we can prioritise your local requirements.
        </p>
      </section>
    </div>
  );
}
