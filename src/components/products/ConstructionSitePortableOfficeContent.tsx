import siteOfficeHero from "@/assets/products/construction-site-portable-office-crane.webp";
import siteOfficeCabin from "@/assets/products/construction-site-portable-office-site-office.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Calendar, CheckCircle2, ClipboardCheck, IndianRupee, ShieldCheck, Truck, Users, Wrench } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const useCases = [
  "Building sites in Mumbai, Delhi, Bengaluru and Chennai",
  "Highway packages under NHAI and state PWD contracts",
  "Industrial plants in Gujarat and Maharashtra",
  "Remote solar and wind farms in Rajasthan and Tamil Nadu",
  "Metro rail and infrastructure projects in major urban areas",
];

const officeTypes = [
  "Standard MS portable site office cabins",
  "Container site offices in 20 ft and 40 ft ISO formats",
  "Premium glass-front elevation cabins",
  "Manager office cabin containers with executive fit-outs",
  "Meeting-room containers, office-plus-lab, and first-aid cabins",
];

const buyingChecklist = [
  "Project duration and expected relocations",
  "Team size, visitor load, and meeting capacity",
  "Climate, access road width, and crane availability",
  "Interior fit-out level: basic, furnished, or premium",
  "Need for attached toilets, canteen, labour accommodation, or storage",
];

export function ConstructionSitePortableOfficeContent() {
  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="grid gap-5 md:grid-cols-2">
          <OptimizedImage
            src={resolveImageUrl(siteOfficeHero)}
            alt="Construction site portable office cabin being lifted by crane for project deployment by Portable Office Cabin"
            productName="Construction Site Portable Office"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
          <OptimizedImage
            src={resolveImageUrl(siteOfficeCabin)}
            alt="Construction site portable office cabin with site engineers at a modular site office container by Portable Office Cabin"
            productName="Construction Site Portable Office"
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
            priority
          />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Complete Guide</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-5">
            Construction Site Portable Office: The Complete Guide for Indian Projects
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Every construction project above ₹50 lakh in India now relies on a dedicated control hub—a construction site portable office that keeps coordination, documentation, billing, planning, and day-to-day decisions organised on site.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Portable Office Cabin designs and manufactures construction site offices and container offices for infrastructure, industrial, and real-estate projects across India, helping project managers and procurement teams deploy durable workspaces quickly without conventional temporary construction.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Calendar, title: "Fast deployment", desc: "Factory-built units ready for site installation in days" },
            { icon: Truck, title: "Relocatable", desc: "Easy to shift between project phases and future sites" },
            { icon: ShieldCheck, title: "Engineered build", desc: "Insulated steel structures made for dust, heat, and rough handling" },
            { icon: IndianRupee, title: "Budget clarity", desc: "Predictable pricing based on size, fit-out, and transport" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <item.icon className="h-7 w-7 text-accent mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-4">What is a construction site portable office?</h3>
          <p className="text-muted-foreground leading-relaxed mb-5">
            A construction site portable office is a prefabricated, relocatable cabin or container office that serves as the administrative and coordination centre of a project. Compared with makeshift sheds or temporary brick rooms, it delivers better durability, comfort, insulation, and speed of deployment.
          </p>
          <div className="space-y-3">
            {[
              "20 ft container offices for compact team setups",
              "40 ft container offices for larger crews and multiple workstations",
              "Custom 55 ft office containers for premium installations",
              "Manager cabins, meeting rooms, and office-plus-storage combinations",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-4">Typical 40 ft × 10 ft layout</h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Zone</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Area</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Function</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Manager cabin", "80 sq ft", "Private office, confidential discussions"],
                  ["Open workstations", "200 sq ft", "4 desks for engineers, billing, planning"],
                  ["Meeting space", "100 sq ft", "6–8 person discussions, safety briefings"],
                  ["Storage/pantry", "20 sq ft", "Files, water dispenser, small refrigerator"],
                ].map(([zone, area, use], index) => (
                  <tr key={zone} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-4 py-3 font-medium text-foreground">{zone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{area}</td>
                    <td className="px-4 py-3 text-muted-foreground">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-display text-2xl font-bold text-foreground mb-6">Key types of construction site portable offices</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {officeTypes.map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-card p-5 flex gap-3">
              <Building2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">Construction and materials</h3>
          <div className="space-y-4">
            {[
              ["Structural frame", "IS-grade MS framework with multi-layer anti-corrosion primer and paint system, with hot-dip galvanizing optional for aggressive environments."],
              ["Wall and roof build-up", "PUF sandwich panels or insulated GI sheets for thermal and acoustic performance in Indian climate extremes."],
              ["Flooring", "Marine ply or cement board with vinyl, tiles, or anti-static finish depending on use."],
              ["Doors and windows", "Powder-coated steel or aluminium doors with UPVC or aluminium sliding windows and safety grills."],
              ["Electrical and networking", "MCB boards, LED lighting, AC points, data conduits, socket points, and internet-ready layouts."],
            ].map(([title, text]) => (
              <div key={title}>
                <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">Comfort, productivity and safety</h3>
          <div className="space-y-3">
            {[
              "Split or window AC sized for cabin volume and local climate",
              "Ergonomic workstations, natural light, and energy-efficient LED lighting",
              "File cabinets, plan racks, cupboards, and PPE storage",
              "Reinforced doors, window grills, fire extinguisher points, and emergency lighting",
              "Wi-Fi, printers, plotters, UPS compatibility, and digital project management support",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">Where these offices are used</h3>
          <div className="space-y-3">
            {useCases.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Users className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">Advantages over conventional site sheds</h3>
          <div className="space-y-3">
            {[
              "10–20 working day fabrication for most standard cabins",
              "Reusable across multiple projects and workfront shifts",
              "Better insulation, aesthetics, and day-long work comfort",
              "Easier compliance for safety, fire, and audit requirements",
              "Lower material waste with better lifecycle value",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-display text-2xl font-bold text-foreground mb-6">Buying vs. renting and indicative pricing</h3>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/10">
                <th className="px-5 py-4 text-left font-semibold text-foreground">Cabin Type</th>
                <th className="px-5 py-4 text-left font-semibold text-foreground">Approximate Price Range (INR)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Compact security / mini office (10 ft × 8 ft)", "₹80,000 – ₹1,20,000"],
                ["Mid-size site office (10 ft × 20 ft)", "₹1,60,000 – ₹3,50,000"],
                ["Standard container office (20 ft)", "₹2,50,000 – ₹5,00,000"],
                ["Fully furnished premium site office (40 ft)", "₹8,00,000 – ₹15,00,000+"],
              ].map(([type, price], index) => (
                <tr key={type} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-5 py-4 text-foreground">{type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Final pricing depends on size, insulation thickness, windows, electrical grade, furnishings, HVAC, transport distance, and site access constraints.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">How to choose the right office</h3>
          <div className="space-y-3">
            {buyingChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ClipboardCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8">
          <h3 className="font-display text-2xl font-bold text-foreground mb-5">Why work with Portable Office Cabin</h3>
          <div className="space-y-3">
            {[
              "Specialist focus on portable buildings, site offices, labour colonies, and modular support infrastructure",
              "In-house design and fabrication with quality checks before dispatch",
              "Ability to deliver integrated facilities clusters from a single supplier",
              "Nationwide support for construction, industrial, institutional, and infrastructure projects",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-muted/30 p-8">
        <h3 className="font-display text-2xl font-bold text-foreground mb-6">Frequently asked questions</h3>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {[
            {
              question: "How quickly can a construction site portable office be installed?",
              answer: "Most standard units are fabricated in 10–20 working days and placed on site within hours once transport and crane access are arranged.",
            },
            {
              question: "Should I buy or rent a site office cabin?",
              answer: "Buying works best for contractors with repeated project use and branding needs, while rental is better suited for short-duration or pilot projects.",
            },
            {
              question: "Can the office include toilets, pantry, or meeting rooms?",
              answer: "Yes. Portable Office Cabin can supply integrated layouts with toilets, pantry counters, meeting rooms, storage, and linked modular support facilities.",
            },
          ].map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`} className="rounded-2xl border border-border bg-background px-5">
              <AccordionTrigger className="text-left font-semibold text-foreground">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
