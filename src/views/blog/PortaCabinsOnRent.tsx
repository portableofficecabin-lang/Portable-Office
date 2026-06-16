import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, ChevronRight, CheckCircle, Clock, Shield, IndianRupee, Wrench, Building2, Users, Factory, Truck, HardHat, MapPin, Star, Zap, Recycle, FileText } from "lucide-react";
import portaCabinRentImage from "@/assets/blog/porta-cabins-on-rent.webp";
import labourShedImage from "@/assets/blog/labour-shed-steel-frame-construction.webp";
import containerOffice1 from "@/assets/blog/prefab-container-office-1.webp";
import containerOffice2 from "@/assets/blog/prefab-container-office-2.webp";
import containerOffice3 from "@/assets/blog/prefab-container-office-3.webp";
import containerOffice4 from "@/assets/blog/prefab-container-office-4.webp";
import containerOffice5 from "@/assets/blog/prefab-container-office-5.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the typical monthly rent for a porta cabin in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Monthly rental ranges vary by cabin type: Security Cabins ₹4,000–₹7,000, Office Cabins (20 ft) ₹10,000–₹18,000, Site Offices (40 ft) ₹18,000–₹32,000, Labour Accommodation (40 ft) ₹15,000–₹28,000, and Portable Toilet Blocks ₹6,000–₹15,000. Rates depend on interior fit-out level, AC inclusion, and market conditions."
      }
    },
    {
      "@type": "Question",
      name: "How quickly can a rental porta cabin be delivered and installed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard rental units can be delivered within 3–7 days of order confirmation in western India. Customized configurations typically take 10–21 days. On-site commissioning completes within a few hours once the cabin arrives."
      }
    },
    {
      "@type": "Question",
      name: "What is the minimum rental duration for porta cabins?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer both short-term rentals (1–6 months) and long-term rentals (6–36 months). Long-term rentals of 12–36 months generally attract more affordable per-month rates compared with very short-term hires of 1–3 months."
      }
    },
    {
      "@type": "Question",
      name: "Can rental porta cabins be customized with branding and interiors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. We offer interior customization including partitions, additional doors/windows, false ceilings, and furniture layouts. Branding options include exterior paint in company colors, vinyl graphics with logos, and project name signage. All customizations maintain cabin reusability."
      }
    },
    {
      "@type": "Question",
      name: "Which cities does Portable Office Cabin serve for porta cabin rentals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We serve projects across Mumbai, Navi Mumbai, Thane, Pune, Nashik, Nagpur, Ahmedabad, Vadodara, Surat, Rajkot, and expanding to Maharashtra, Gujarat, Rajasthan, Madhya Pradesh, Karnataka, Delhi NCR, and more regions across India."
      }
    }
  ]
};

const articleStructuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Porta Cabins on Rent – Flexible Portable Space by Portable Office Cabin",
  description: "Complete guide to renting porta cabins in India. Learn about rental types, pricing, delivery timelines, customization options, and how to get a quote from India's leading manufacturer.",
  image: "https://portableofficecabin.com/blog/porta-cabins-on-rent.png",
  author: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    url: "https://portableofficecabin.com",
    sameAs: [
      "https://www.linkedin.com/company/portable-office-cabin",
      "https://www.facebook.com/portableofficecabin",
      "https://www.indiamart.com/portable-office-cabin/"
    ]
  },
  publisher: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    logo: { "@type": "ImageObject", url: "https://portableofficecabin.com/logo.jpeg" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-9731897976",
      contactType: "sales",
      areaServed: "IN"
    }
  },
  datePublished: "2025-02-20",
  dateModified: "2026-02-27",
  mainEntityOfPage: "https://portableofficecabin.com/blog/porta-cabins-on-rent"
};

export default function PortaCabinsOnRent() {
  return (
    <Layout>
      <SEOHead
        title="Porta Cabins on Rent – Flexible Portable Space | Portable Office Cabin"
        description="Rent porta cabins across India. Office cabins, security cabins, labour accommodation, container offices & portable toilets on hire. 3–7 day delivery. Get a free quote!"
        keywords="porta cabin on rent, portable cabin rental India, site office on hire, container office rent, portable cabin rent Mumbai, porta cabin hire Pune, security cabin rental, labour camp rental India"
        canonicalUrl="https://portableofficecabin.com/blog/porta-cabins-on-rent"
        ogType="article"
        structuredData={[faqStructuredData, articleStructuredData]}
      />

      {/* Breadcrumb */}
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Porta Cabins on Rent</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
            Porta Cabins on Rent – Flexible Portable Space
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-3xl">
            Ready-to-use workspace delivered within days. Office cabins, security posts, labour accommodation & more—available on hire across India.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-accent" /> 18 min read</span>
            <span>•</span>
            <span>February 20, 2025</span>
            <span>•</span>
            <span>By Portable Office Cabin</span>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="bg-background">
        <div className="container mx-auto px-4 max-w-4xl -mt-8">
          <div className="rounded-xl overflow-hidden shadow-lg border border-border">
            <img src={resolveImageUrl(portaCabinRentImage)} alt="Porta cabins on rent at construction site in India" className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="py-12 bg-accent/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card rounded-xl border p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-accent" />
              Key Highlights
            </h2>
            <ul className="space-y-4">
              {[
                "Porta cabins on rent eliminate upfront capital investment while providing fully finished, pre-tested cabins commissioned at your location in hours.",
                "We serve projects across Maharashtra, Gujarat, Rajasthan, Madhya Pradesh, Karnataka, Delhi NCR with 3–7 day delivery for standard models.",
                "Available types: Office Cabins, Container Offices, Security Cabins, Labour Accommodation, Prefab Canteens, Container Cafés, Portable Toilets & Control Rooms.",
                "Flexible rental tenure from 1–36 months with customization options including branding, partitions, AC, furniture, and plumbing.",
                "As a manufacturer (not broker), we ensure factory-direct quality, faster delivery, and competitive pricing for projects of any scale."
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <article className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">

            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Porta Cabins on Rent – The Smart Choice for Temporary Space</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When your project demands ready-to-use workspace without the wait of traditional construction, porta cabins on rent offer the ideal solution. Whether you're setting up a site office for a metro rail project in Mumbai, accommodating workers at a highway construction site in Rajasthan, or creating temporary classrooms during a school expansion in Tamilnadu, Karnataka or Andhra Pradesh, rental porta cabins deliver the space you need within days—not months.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Portable Office Cabin supplies modular buildings and portable cabin solutions across India for construction companies, project developers, industries, educational institutions, and event organizers. As a manufacturer and supplier (not a broker), we ensure factory-direct quality, faster delivery timelines, and competitive pricing that makes hiring cabins a practical choice for projects of any scale.
              </p>
            </section>

            {/* Key Highlights Grid */}
            <section className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: MapPin, title: "Pan-India Coverage", desc: "Maharashtra, Gujarat, Rajasthan, MP, Karnataka, Delhi NCR and expanding regions" },
                  { icon: Building2, title: "Infrastructure Proven", desc: "Metro projects in Navi Mumbai, industrial plants near Pune-Chakan, logistics hubs in Bhiwandi" },
                  { icon: IndianRupee, title: "Zero Capital Investment", desc: "Fully finished, pre-tested cabins commissioned at your location in hours" },
                  { icon: Wrench, title: "Turnkey Support", desc: "Design through removal, with short-term or long-term hire options" },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-5 flex gap-4">
                    <item.icon className="h-6 w-6 text-accent shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rental Services */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Porta Cabin Rental Services by Portable Office Cabin</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We offer porta cabins on rent for both short-term requirements (1–6 months) and long-term projects (6–36 months), adapting to the specific needs of each client. This flexible approach means a contractor managing a 4-month bridge project and an institution requiring temporary classrooms for 2 years can both access the right cabin configuration without purchasing assets they won't need permanently.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Our rental applications span the full range of temporary space requirements across industries. From engineer cabins at remote infrastructure sites to container cafés at corporate events, each cabin leaves our yard ready to use, reducing your on-site setup time to the absolute minimum.
              </p>

              <h3 className="text-xl font-bold text-foreground mb-4">Core Rental Service Features</h3>
              <ul className="space-y-3 mb-6">
                {[
                  "Turnkey delivery: design consultation, manufacturing or refurbishment, transport, on-site install, and removal at rental end",
                  "Standard fit-outs include electrical wiring, MCB panels, LED lighting, power sockets, windows, doors, and insulated walls",
                  "AC units, furniture, false ceilings, and basic plumbing available for offices, canteens, and toilet units",
                  "Cabins are fully finished and pre-tested at our plant before dispatch",
                  "On-site commissioning typically completes within a few hours once the cabin arrives",
                  "Flexible rental tenure extensions available with prior notice and adjusted terms",
                  "Dedicated support contact for structural or service issues during the rental period"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Image Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="rounded-xl overflow-hidden shadow-md border border-border">
                  <img src={resolveImageUrl(containerOffice1)} alt="Prefabricated container office cabin with glass facade for site use in India" loading="lazy" decoding="async" className="w-full h-64 object-cover" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-border">
                  <img src={resolveImageUrl(containerOffice2)} alt="Multi-story stacked container office complex with external staircases" loading="lazy" decoding="async" className="w-full h-64 object-cover" />
                </div>
              </div>
            </section>

            {/* Western India */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Portable Cabin for Rent in Mumbai, Pune & Western India</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our strongest rental presence spans Mumbai, Navi Mumbai, Thane, Pune, and across Maharashtra and Gujarat. Portable Office Cabin manufactures cabins in western India, allowing us to deliver standard rental units to these regions within 3–7 days of order confirmation—significantly faster than competitors relying on distant production facilities.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Typical clients in this region include infrastructure contractors executing metro and elevated road projects in Navi Mumbai, industrial manufacturing plants in the Pune-Chakan corridor, logistics parks and warehouse operators in Bhiwandi, and real estate developers building residential and commercial projects in Ahmedabad and Vadodara.
              </p>

              <div className="rounded-xl overflow-hidden shadow-md border border-border mb-6">
                <img src={resolveImageUrl(containerOffice3)} alt="Portable container office cabin with glass windows for rent in Mumbai Pune" loading="lazy" decoding="async" className="w-full h-72 object-cover" />
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent" /> Western India Rental Coverage
                </h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><strong className="text-foreground">Cities:</strong> Mumbai, Navi Mumbai, Thane, Pune, Nashik, Nagpur, Ahmedabad, Vadodara, Surat, Rajkot</li>
                  <li><strong className="text-foreground">Response time:</strong> 3–7 days for standard models; 10–21 days for customized configurations</li>
                  <li><strong className="text-foreground">Common use-cases:</strong> Metro rail site offices, highway project accommodation, industrial plant security cabins, warehouse weighbridge offices</li>
                  <li><strong className="text-foreground">Customization:</strong> Rental interiors (partitions, extra windows, company branding) while maintaining reusability</li>
                </ul>
              </div>
            </section>

            {/* Why Choose */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Why Choose Our Porta Cabins on Rent?</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Renting porta cabins from a manufacturer rather than constructing permanent structures or purchasing new cabins outright offers tangible advantages that directly impact your project economics and timeline.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Financial */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-accent" /> Financial Benefits
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Low upfront investment vs buying or constructing</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />No land disturbance or foundation work</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Predictable monthly rent payments</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />No asset maintenance or depreciation tracking</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Refundable security deposits</li>
                  </ul>
                </div>

                {/* Operational */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-accent" /> Operational Advantages
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Quick setup: cabins arrive ready to use</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Easy relocation if project phases shift</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Scalability—add or remove cabins as needed</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Space available in days, not months</li>
                  </ul>
                </div>

                {/* Quality */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent" /> Quality Assurance
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />MS steel framework for structural integrity</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />PUF/EPS insulated panels for thermal comfort</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Rust-resistant exterior paint</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Designed for frequent relocation</li>
                  </ul>
                </div>

                {/* Sustainability */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Recycle className="h-5 w-5 text-accent" /> Sustainability
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Reusable structures reduce construction waste</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Refurbished between rentals, not discarded</li>
                    <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Material-efficient manufacturing process</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Types Available */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Types of Porta Cabins Available on Rent</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We maintain a rental fleet with different cabin formats and sizes suited for specific applications. Rather than offering a one-size-fits-all approach, we match cabin type to your actual requirement.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Office Porta Cabins", desc: "20 ft or 40 ft lengths with AC provision, workstation layouts, meeting areas, and partitioned manager cabins. Standard: 40 ft × 10 ft with 8–12 workstations." },
                  { title: "Container Offices", desc: "ISO container-based structures with enhanced durability and security. 20 ft and 40 ft sizes with full interior fit-out including insulation, flooring, and electrical systems." },
                  { title: "Security Cabins", desc: "Compact 8 ft or 10 ft units for gate security, visitor management, and access control. Includes desk space, window, and basic electrical fittings." },
                  { title: "Labour Accommodation Units", desc: "Bunk-bed configurations for 6–12 workers in 20 ft and 40 ft formats. Storage provisions and ventilation included." },
                  { title: "Prefab Canteens", desc: "Kitchen-ready layouts with counters, serving areas, and dining space. 20 ft compact to 40 ft full-service dining facilities." },
                  { title: "Container Cafés", desc: "Retail-ready structures for food service at events, industrial sites, or commercial locations with customer-facing design." },
                  { title: "Portable Toilets", desc: "Single and multi-unit toilet blocks with plumbing provisions, ventilation, and privacy features." },
                  { title: "Control Rooms", desc: "Equipment monitoring cabins with enhanced electrical capacity, cable entry points, and climate control for sensitive instrumentation." },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-5">
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Cabins can be joined side-by-side to create larger office blocks or stacked (where structural design permits) to form two-story dormitories or administrative complexes. For example, we supplied a 40 ft × 10 ft site office configuration rented for a 24-month highway project in Gujarat during 2024, later expanded by adding two adjacent units.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl overflow-hidden shadow-md border border-border">
                  <img src={resolveImageUrl(containerOffice4)} alt="Container office cabin with open side showing workspace setup at construction site" loading="lazy" decoding="async" className="w-full h-64 object-cover" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-border">
                  <img src={resolveImageUrl(containerOffice5)} alt="Prefabricated container office with glass sliding doors and modern interior" loading="lazy" decoding="async" className="w-full h-64 object-cover" />
                </div>
              </div>
            </section>

            {/* Technical Specifications */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Technical Specifications & Quality Standards</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Even rental porta cabins from Portable Office Cabin follow the same structural and safety standards as new units manufactured for purchase. We don't maintain a separate "rental-grade" inventory.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Structural Frame</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Mild steel or pre-engineered steel sections</li>
                    <li>• Welded joints with quality inspection</li>
                    <li>• Steel thickness 1.6–3 mm depending on function</li>
                  </ul>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Walls & Roof</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• PUF/EPS insulated sandwich panels</li>
                    <li>• 40–60 mm panel thickness</li>
                    <li>• Pre-coated steel sheets, sealed joints</li>
                  </ul>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Interior Finishing</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Laminated boards or pre-finished plywood</li>
                    <li>• Vinyl flooring or cement board base</li>
                    <li>• Powder-coated steel windows with glass</li>
                  </ul>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Electrical & Services</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Concealed wiring, MCB distribution panel</li>
                    <li>• LED lights, 5-amp/15-amp socket points</li>
                    <li>• AC provision with pre-cut openings</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Rental Process */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Rental Process: How to Hire Porta Cabins</h2>
              <div className="space-y-4">
                {[
                  { step: "1", title: "Share Requirements", desc: "Provide project location, cabin type, size, rental duration, and utilities needed (AC, furniture, plumbing)." },
                  { step: "2", title: "Receive Proposal", desc: "We suggest suitable models, provide layout drawings, and submit a commercial proposal with monthly rent, deposit, and transport charges." },
                  { step: "3", title: "Confirm & Schedule", desc: "On confirmation and deposit, we schedule fabrication/refurbishment. Delivery typically 3–21 days." },
                  { step: "4", title: "Delivery & Installation", desc: "Cabins arrive via trailer. We handle installation and commission electrical/plumbing interfaces." },
                  { step: "5", title: "Rental Period Support", desc: "Support for structural issues during the rental term. Client handles routine usage and cleaning." },
                  { step: "6", title: "End of Term & Removal", desc: "We dismantle connections, transport cabins back. Final settlement addresses damage or extensions." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 bg-card border border-border rounded-lg p-5">
                    <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing Table */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Cost of Porta Cabins on Rent: Typical Ranges</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Rental pricing depends on cabin size, type, interior specification, rental duration, and distance from our facility. While we provide formal quotations for each inquiry, these typical ranges help with budget planning.
              </p>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/10">
                      <th className="text-left p-4 font-semibold text-foreground">Cabin Type</th>
                      <th className="text-left p-4 font-semibold text-foreground">Size</th>
                      <th className="text-left p-4 font-semibold text-foreground">Approx. Monthly Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Security Cabin", "8–10 ft", "₹4,000 – ₹7,000"],
                      ["Office Cabin", "20 ft", "₹10,000 – ₹18,000"],
                      ["Site Office", "40 ft", "₹18,000 – ₹32,000"],
                      ["Labour Accommodation", "40 ft (6–12 bunks)", "₹15,000 – ₹28,000"],
                      ["Portable Toilet Block", "10–20 ft", "₹6,000 – ₹15,000"],
                    ].map(([type, size, rent], i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-4 text-foreground font-medium">{type}</td>
                        <td className="p-4 text-muted-foreground">{size}</td>
                        <td className="p-4 text-accent font-semibold">{rent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 mt-6">
                <h3 className="font-bold text-foreground mb-3">One-Time Charges</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Transportation to site (based on distance and vehicle type)</li>
                  <li>• Installation and handling at site</li>
                  <li>• Refundable security deposit (typically 1–3 months' rent)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Long-term rentals (12–36 months) generally attract more affordable per-month rates. Multi-cabin orders often qualify for volume pricing.
                </p>
              </div>
            </section>

            {/* Industries */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Industries & Use-Cases We Serve</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: HardHat, title: "Construction & Infrastructure", items: ["Metro rail site offices & labour colonies", "Highway portable accommodation", "Bridge & tunnel temporary offices", "Industrial plant security & canteens"] },
                  { icon: Factory, title: "Manufacturing & Warehouses", items: ["Container offices for supervisors", "Weighbridge offices at logistics parks", "Security cabins at factory gates", "Temporary cafeteria during expansions"] },
                  { icon: Users, title: "Education & Training", items: ["Temporary classrooms during renovations", "Exam control rooms", "Corporate training centers", "Staff rooms during campus expansion"] },
                  { icon: Star, title: "Events & Government", items: ["Ticket counters at exhibitions", "Backstage offices at festivals", "Disaster relief accommodation", "Healthcare/vaccination cabins"] },
                ].map((sector, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <sector.icon className="h-5 w-5 text-accent" /> {sector.title}
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {sector.items.map((item, j) => (
                        <li key={j} className="flex gap-2">
                          <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Case Example */}
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 mt-6">
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" /> Case Example
                </h3>
                <p className="text-sm text-muted-foreground">
                  A national highway contractor approached us in early 2024 requiring 12 site offices and 8 labour accommodation units for a 36-month road project spanning 120 km in Madhya Pradesh. We delivered the first batch within 14 days, enabling project mobilization on schedule. The rental model saved the contractor over ₹50 lakh in capital expenditure while maintaining flexibility to add or relocate cabins as construction progressed.
                </p>
              </div>
            </section>

            {/* Customization */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Customize Your Rented Porta Cabin</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Rentals don't have to be generic. We offer practical customization options even on hired cabins, allowing clients to configure spaces that meet their operational needs while maintaining reusability.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-3">Interior Options</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Internal partitions</li>
                    <li>• Additional doors/windows</li>
                    <li>• False ceiling installation</li>
                    <li>• Upgraded insulation</li>
                    <li>• Custom furniture layouts</li>
                  </ul>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-3">Branding</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Exterior paint in company colors</li>
                    <li>• Vinyl graphics with logo</li>
                    <li>• Project name signage</li>
                    <li>• Standardized multi-cabin branding</li>
                  </ul>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-3">Structural Add-Ons</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• External staircases</li>
                    <li>• Entry door canopies</li>
                    <li>• Wheelchair access ramps</li>
                    <li>• Skirting panels</li>
                    <li>• HVAC/UPS integration</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Maintenance & Safety */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Support, Maintenance & Safety</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Pre-Dispatch Checks</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Frame alignment & weld quality inspection</li>
                    <li>• Electrical insulation & continuity testing</li>
                    <li>• Water leak checks at all joints</li>
                    <li>• Door & window operation verification</li>
                  </ul>
                </div>
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-3">Compliance & Standards</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• ISI-marked electrical components</li>
                    <li>• Non-slip flooring & handrails</li>
                    <li>• Fire safety regulation compatibility</li>
                    <li>• Emergency support contact provided</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How to Get Quote */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">How to Get a Porta Cabin Rental Quote</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ready to explore porta cabins on rent for your upcoming project? Share the following details for a tailored quote within 24–48 working hours:
              </p>
              <div className="bg-card border border-border rounded-xl p-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Company name & contact person</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Phone number & email address</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Site address with pin code</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Cabin type & size preference</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Quantity of cabins needed</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Rental duration (start & end date)</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />Special requirements (AC, furniture, etc.)</li>
                </ul>

                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mt-4">
                  <p className="text-sm text-muted-foreground italic">
                    <strong className="text-foreground">Example inquiry:</strong> "We need a 20 ft × 8 ft office cabin with AC on rent for 12 months at a construction site near Nagpur. Start date is 15th of next month. Site has 3-phase power supply available."
                  </p>
                </div>
              </div>
            </section>

            {/* Internal Linking */}
            <section className="mb-12">
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-6">
                <h3 className="font-bold text-foreground mb-2">About Portable Office Cabin</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Whether you need a single security cabin for 3 months or a complete labour colony for a multi-year infrastructure project, Portable Office Cabin delivers rental solutions built on manufacturing expertise, regional presence, and a commitment to meeting your timeline. As one of the leading manufacturers in India's modular construction industry, we understand that every day matters on your project site.
                </p>
                <Link href="/" className="text-accent font-semibold text-sm hover:underline">
                  Visit portableofficecabin.com →
                </Link>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqStructuredData.mainEntity.map((faq, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-5">
                    <h3 className="font-semibold text-foreground mb-2">{faq.name}</h3>
                    <p className="text-sm text-muted-foreground">{faq.acceptedAnswer.text}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Rent a Porta Cabin?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Get a free rental quote tailored to your project. Factory-direct pricing, 3–7 day delivery, and turnkey support from India's trusted manufacturer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-accent">
              <Link href="/contact">
                <Phone className="h-5 w-5 mr-2" />
                Get Free Rental Quote
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/rental-service">
                <Truck className="h-5 w-5 mr-2" />
                View Rental Catalog
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Related Articles */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">Related Articles</h2>
          <Link
            href="/blog/labour-shed-prefabricated-structures"
            className="flex flex-col sm:flex-row gap-5 bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:border-accent/30 transition-all duration-300 group"
          >
            <div className="sm:w-48 sm:min-w-[12rem] aspect-[16/10] rounded-lg overflow-hidden flex-shrink-0">
              <img src={resolveImageUrl(labourShedImage)} alt="Prefabricated steel-frame labour shed for worker accommodation at construction sites in India" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                Labour Shed Prefabricated Structures: Complete Guide for Construction Sites
              </h3>
              <p className="text-sm text-muted-foreground mt-2">Complete guide on prefabricated labour sheds for construction sites in India.</p>
            </div>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
