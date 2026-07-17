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
import { FixedPriceCallout, type FixedOffer } from "./FixedPriceCallout";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Heart,
  Camera,
  Shield,
  Store,
  Coffee,
  Home,
  Building2,
  CheckCircle2,
  Palette,
  Truck,
  Sparkles,
} from "lucide-react";

import pinkMain from "@/assets/products/cargo-storage-containers-pink-main.webp";
import pink20ft from "@/assets/products/cargo-storage-containers-pink-20ft.webp";
import pink40ft from "@/assets/products/cargo-storage-containers-pink-40ft.webp";
import pinkAngle from "@/assets/products/cargo-storage-containers-pink-angle.webp";
import pinkPopup from "@/assets/products/cargo-storage-containers-pink-popup.webp";

const highlights = [
  { icon: Eye, title: "High Visibility", desc: "Pink containers attract 40% more attention than standard grey or blue units" },
  { icon: Heart, title: "Strong Brand Recall", desc: "Pink scores 22% higher in recall tests versus neutral colours" },
  { icon: Camera, title: "Instagram-Friendly", desc: "Drive 3x engagement rates for customer-facing businesses" },
  { icon: Shield, title: "Same Structural Strength", desc: "Identical load capacity, wind resistance, and durability as regular containers" },
];

const containerTypes = [
  "Plain storage containers for inventory",
  "Container offices with partitions and wiring",
  "Container shops and cafés with glazed fronts",
  "Container homes and tiny houses",
  "Portable toilets and washroom blocks",
  "Security cabins and ticket counters",
  "Prefab labour rooms with pink accents",
];

const pricingRows = [
  { product: "20ft Pink Container", basic: "₹2.5–3.5 lakh", fitted: "₹6–9 lakh" },
  { product: "40ft Pink Container", basic: "₹4.5–6 lakh", fitted: "₹12–18 lakh" },
];

const faqs = [
  {
    q: "What makes pink cargo containers different from standard containers?",
    a: "Pink cargo containers share the same ISO-grade structural specifications as standard units—Corten steel or MS frame, 500 kg/sqm floor load, weatherproof construction. The difference is a specialised paint system using epoxy primer (80 microns) with polyurethane topcoat (60 microns) in RAL 3015 light pink, Pantone hot pink, or custom brand-matched shades, resisting 5000 hours of salt spray.",
  },
  {
    q: "Can I customise the shade of pink?",
    a: "Yes. Portable Office Cabin offers RAL 3015 (light pink), Pantone hot pink, pastel blush, magenta, and any brand-matched custom shade. We use colour-matching technology to replicate exact brand guidelines for corporate clients.",
  },
  {
    q: "What are common uses for pink containers?",
    a: "Popular applications include pop-up retail stores, container cafés and bakeries, beauty brand kiosks, site offices with branded façades, event registration booths, women-centric NGO awareness camps, and Instagram-friendly commercial spaces.",
  },
  {
    q: "Are pink containers available for rent?",
    a: "Yes. Rental starts at ₹20,000–40,000/month depending on size and fit-out level. This is ideal for seasonal campaigns, events, and short-term brand activations.",
  },
  {
    q: "How long does it take to get a pink container delivered?",
    a: "Repainting with light modifications takes 2–3 weeks. Fully customised units with interiors, electrical, AC, and glazing take 4–6 weeks. Transport via 16-tyre trailers with hydra crane setup is available across India.",
  },
  {
    q: "Does the pink paint affect durability?",
    a: "No. The paint system uses marine-grade epoxy primer and UV-resistant polyurethane topcoat, providing the same 15–20 year exterior life as standard container finishes. Repaint services are available every 5 years.",
  },
  {
    q: "Can I buy a used container and get it painted pink?",
    a: "Yes. Portable Office Cabin offers converted used containers at 20–30% lower cost than new fabrications. We inspect structural integrity, repair as needed, and apply the pink finish with full interior fit-out options.",
  },
];

/**
 * `offer` is present when the CURRENT product page is purchasable (passed in by
 * ProductDetailServer from isPurchasable()). This SKU (POC-CSC-PINK) sells at a fixed price, so
 * every generic ₹ figure in this guide — the basic/fitted range table, the fit-out add-on prices,
 * the crane / rental / relocation figures and the rental FAQ — renders ONLY when `offer` is
 * absent. A range or an add-on price beside a fixed checkout price is the landing-page
 * contradiction that got the Merchant Center account suspended.
 */
export function CargoStorageContainersPinkContent({ offer }: { offer?: FixedOffer }) {
  return (
    <div className="space-y-16">
      {/* Hero Introduction */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Cargo Storage Containers Pink</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Pink cargo storage containers are standard ISO shipping containers—or newly fabricated modular units—finished in vibrant pink shades for branding, retail, and workspace applications. Businesses across India increasingly use them to stand out in visually competitive urban environments.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              From 2024 to 2026, real-world examples include pop-up stores at Mumbai's Phoenix Marketcity, container cafés in Bengaluru's Whitefield IT parks, site offices on Hyderabad metro projects, and registration booths at IIT Bombay's Techfest.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pink cargo containers are made from high-grade mild steel, ensuring durability for shipping and storage, and are painted with weather-resistant coatings, making them suitable for long-term outdoor storage. They are fully ventilated to keep stored items in good condition. Repurposing shipping containers for storage is an eco-friendly choice that prevents the energy-intensive process of melting them down.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(pinkMain)}
            alt="Pink cargo storage container 40ft with corten steel body and double doors at Portable Office Cabin yard in Bengaluru"
            className="rounded-xl shadow-lg"
            aspectRatio="4/3"
          />
        </div>
      </section>

      {/* Why Pink Highlights */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Why Choose Pink?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 text-center">
                <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-foreground text-sm mb-1">{item.title}</h3>
                <p className="text-muted-foreground text-xs">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 bg-muted/50 rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Perfect for:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              "D2C beauty & lifestyle brands",
              "Salons, spas & wellness studios",
              "Cafés, dessert shops & bakeries",
              "Women-centric events & NGOs",
              "Marketing & experiential agencies",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Pink Shipping Container */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Why Choose a Pink Shipping Container for Storage?</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(pink20ft)}
            alt="Pink 20ft shipping container with CSC plate and locking bars at container yard by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="4/3"
          />
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Colour psychology works in your favour. Pink signals creativity, friendliness, and modernity—qualities that help businesses stand out against the sea of standard blue and grey containers on Indian construction sites and streets.
            </p>
            {/* Purchasable page: the same argument without the ₹ figure — a rupee amount in prose
                reads as a price claim to a sweep, whatever it is actually valuing. */}
            <p className="text-muted-foreground leading-relaxed">
              {offer
                ? "A pink shipping container acts as 24/7 outdoor advertising. Positioned in a high-traffic area, a single 20ft unit visible to 10,000 daily passersby delivers year-round brand visibility without recurring hoarding costs."
                : "A pink shipping container acts as 24/7 outdoor advertising. Positioned in high-traffic areas, a single 20ft unit visible to 10,000 daily passersby can deliver ₹5–10 lakh in annual advertising value without recurring hoarding costs."}
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Consider these scenarios: a pink container boutique at Goa's Baga Beach market during the 2025 tourist season, a cosmetic brand kiosk in a Delhi NCR mall parking lot, or a college fest registration booth in Pune handling 1,000 registrations per hour.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              The underlying structure remains unchanged—high-grade Corten steel or MS frame, floor load capacity up to 500 kg/sqm, weatherproofing, and lockable double doors. Pink shipping containers also offer drive-up access for easy loading and unloading.
            </p>
          </div>
        </div>
      </section>

      {/* Types We Offer */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Types of Pink Cargo Storage Containers We Offer</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Portable Office Cabin customises standard ISO cargo containers and new fabricated units in various sizes, finished in RAL 3015 (light pink), Pantone hot pink, or brand-matched custom shades.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Common dimensions include 10ft (3m length, 15 cbm volume), 20ft standard (6.058m × 2.438m external), 20ft high-cube with extra 30cm headroom, and 40ft units offering approximately 67 cubic metres of internal space.
            </p>
            <ul className="space-y-2">
              {containerTypes.map((type, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {type}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-sm">
              You can buy converted used containers (20–30% lower cost) or new fabrications from MS sections. Interiors can remain neutral while exteriors shine pink. Units come foundation-ready or fully portable with forklift pockets and corner castings.
            </p>
          </div>
          <OptimizedImage
            src={resolveImageUrl(pink40ft)}
            alt="Pink 40ft cargo storage container side view with corrugated wall panels at industrial depot by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="4/3"
          />
        </div>
      </section>

      {/* Design Ideas */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Design Ideas: Pink Container Shops, Offices, and Cafés</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(pinkPopup)}
            alt="Pink shipping container converted into pop-up retail shop with glass facade in urban setting by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="16/9"
          />
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> Shop Concepts
              </h3>
              <p className="text-muted-foreground text-sm">
                Fashion boutiques in Pune with 4m-wide glazing and roller shutters, cosmetics popups in Hyderabad malls, stationery shops in Ahmedabad for back-to-school seasons, and bakery counters with illuminated signboards over pink exteriors.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Office Ideas
              </h3>
              <p className="text-muted-foreground text-sm">
                Project site offices with pink façades and neutral interiors on Mumbai metro projects, startup micro-offices in Gurgaon business parks, and coworking pods for Chennai suburbs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-primary" /> Café Concepts
              </h3>
              <p className="text-muted-foreground text-sm">
                Rooftop coffee kiosks in Kolkata IT parks, garden cafés with pastel pink and warm LED lighting, and ice-cream stands for Delhi winters with vinyl flooring and split AC.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Interior Touches
              </h3>
              <p className="text-muted-foreground text-sm">
                Concealed electrical conduits, LED track lighting, prefabricated counters, and branding walls perfect for social-media photos. Soft or pastel pink tones can also reduce stress and aggression, making them ideal for nurseries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Technical Specifications & Customization</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-primary/10">
                    <th className="border border-border px-4 py-3 text-left font-semibold text-foreground text-sm">Specification</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold text-foreground text-sm">20ft Container</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold text-foreground text-sm">40ft Container</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["External Dimensions", "6.058 × 2.438 × 2.591m", "12.192 × 2.438 × 2.591m"],
                    ["Internal Volume", "~33 cubic metres", "~67 cubic metres"],
                    ["Floor Load", "250–500 kg/sqm", "250–500 kg/sqm"],
                    ["Material", "Corten steel or MS", "Corten steel or MS"],
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="border border-border px-4 py-2 font-medium text-foreground text-sm">{row[0]}</td>
                      <td className="border border-border px-4 py-2 text-muted-foreground text-sm">{row[1]}</td>
                      <td className="border border-border px-4 py-2 text-muted-foreground text-sm">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-sm mt-4">
              <strong>Paint system:</strong> Epoxy primer (80 microns) with polyurethane topcoat (60 microns) in gloss or matte finishes, resisting 5000 hours of salt spray.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Customization options:</h3>
            {[
              { icon: Shield, label: "Insulation", desc: "PUF, EPS, or rockwool (50–100mm)" },
              { icon: Sparkles, label: "Electrical", desc: "CAT6 wiring, LED lighting, split AC" },
              { icon: Home, label: "Plumbing", desc: "For washrooms and pantry setups" },
              { icon: Palette, label: "Ventilation", desc: "Louvered windows (500 CFM capacity)" },
              { icon: Shield, label: "Safety", desc: "Fire extinguishers, emergency exits, anti-slip steps" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                <item.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Applications: From Storage to Modular Buildings</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <OptimizedImage
            src={resolveImageUrl(pinkAngle)}
            alt="Pink cargo container angle view showing corrugated steel walls and corner castings by Portable Office Cabin"
            className="rounded-xl shadow-lg"
            aspectRatio="4/3"
          />
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Storage use cases:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Retail inventory storage behind shops</li>
                <li>• Event equipment storage for agencies</li>
                <li>• Archive storage for schools and colleges</li>
                <li>• Seasonal stock storage for e-commerce sellers (40% faster access vs. traditional godowns)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Modular building applications:</h3>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• Container office complexes on NHAI construction sites</li>
                <li>• Prefab labour accommodation with pink façade elements</li>
                <li>• Modular classrooms for rural Bihar CSR projects</li>
                <li>• Container-based clinics for healthcare initiatives</li>
                <li>• Rooftop cafés serving 200 customers daily in Delhi</li>
                <li>• Studio spaces for creative agencies</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">
          {offer ? "Price, Delivery Timelines & Buying vs. Renting" : "Pricing, Delivery Timelines & Buying vs. Renting"}
        </h2>
        <div className="space-y-4">
          {offer ? (
            /* Purchasable SKU: the basic/fitted reference ranges are replaced by the one real
               figure the checkout charges. */
            <FixedPriceCallout offer={offer} />
          ) : (
            <>
          <p className="text-muted-foreground leading-relaxed">
            Exact pricing depends on size, base container condition, and fit-out level. Here are 2025–2026 reference ranges:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-primary/10">
                  <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Product</th>
                  <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Basic (Ex-Factory)</th>
                  <th className="border border-border px-4 py-3 text-left font-semibold text-foreground">Fully Fitted</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="border border-border px-4 py-3 font-medium text-foreground">{row.product}</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">{row.basic}</td>
                    <td className="border border-border px-4 py-3 text-muted-foreground">{row.fitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground text-sm mb-2">{offer ? "Optional Add-Ons" : "Cost Add-Ons"}</h3>
                {/* Purchasable page: the add-on figures would read as extra charges the checkout
                    never collects — the options stay, the prices move to the written quotation. */}
                <ul className="text-muted-foreground text-xs space-y-1">
                  {offer ? (
                    <>
                      <li>• Insulation 75mm rockwool</li>
                      <li>• Premium vinyl flooring</li>
                      <li>• Air-conditioning</li>
                      <li>• Glass fronts — all quoted on request</li>
                    </>
                  ) : (
                    <>
                      <li>• Insulation 75mm rockwool: +₹50k</li>
                      <li>• Premium vinyl flooring: +₹30k/sqm</li>
                      <li>• Air-conditioning: +₹80k</li>
                      <li>• Glass fronts: +₹2 lakh</li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground text-sm mb-2">Timelines</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Repaint + light mods: 2–3 weeks</li>
                  <li>• Fully customised: 4–6 weeks</li>
                  <li>• Transport: 16-tyre trailers</li>
                  <li>{offer ? "• Hydra crane arranged at site (charged at actuals)" : "• Hydra crane: ₹50k/day"}</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground text-sm mb-2">Buy vs. Rent</h3>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Buy: long-term use & branding</li>
                  <li>{offer ? "• Rent option for events — quoted monthly" : "• Rent: ₹20–40k/month for events"}</li>
                  <li>• MCD/BMC permits: 15–30 days</li>
                  <li>• PAN-India delivery available</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Portable Office Cabin */}
      <section>
        <h2 className="text-3xl font-bold text-foreground mb-6">Why Work with Portable Office Cabin?</h2>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Portable Office Cabin specialises in prefabricated and modular building solutions—portable cabins, container offices, labour colonies, PEB structures, and container homes—with 15+ years of experience and 500+ projects delivered across India.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "In-house design, fabrication, and NDT-tested quality control",
              "Pan-India project execution from single units to 100-container complexes",
              "Coordination with architects and branding agencies for brand-aligned designs",
              "80% recycled steel and sustainable manufacturing practices",
              offer
                ? "After-sales support: modifications, relocation assistance, and repaint every 5 years"
                : "After-sales support: modifications, relocation (₹1 lakh/unit), and repaint every 5 years",
              "B2B and B2C: from corporates to individual entrepreneurs",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/30 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Stand Out with Pink Containers?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Contact Portable Office Cabin with your city, preferred size, intended use (shop, office, storage, café), and timeline. Receive a customised quotation with layout proposal. The number of businesses choosing pink grows each year—join them.
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
          {/* The rental-rate FAQ (₹20,000–40,000/month) renders only on a quote-only page — on the
              purchasable page a monthly figure beside the fixed sale price reads as a second,
              contradicting price. */}
          {faqs.filter((faq) => !offer || !faq.a.includes("₹")).map((faq, i) => (
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
