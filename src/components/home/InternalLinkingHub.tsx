import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

// Topical Authority Internal Linking Hub
// Each cluster links category → products → blog → supporting pages
// Keyword-rich anchor text for Google topical authority signals

const linkClusters = [
  {
    pillar: "Portable Cabins",
    pillarHref: "/products?category=portable-cabins",
    description: "Our flagship portable cabin range covers site offices, worker accommodation, and custom structures for every budget.",
    links: [
      { label: "All Portable Cabins", href: "/products?category=portable-cabins" },
      { label: "Executive Portable Cabin 20ft", href: "/products/executive-portable-cabin-20ft" },
      { label: "Porta Cabin (All Types)", href: "/products/porta-cabin" },
      { label: "MS Portable Cabin", href: "/products/ms-portable-cabin" },
      { label: "Portable Cabin 40ft Bunkhouse", href: "/products/portable-cabin-40ft-bunkhouse" },
    ],
  },
  {
    pillar: "Container Offices & Site Offices",
    pillarHref: "/products?category=container-offices",
    description: "Heavy-duty container offices and site office containers built for real construction environments across India.",
    links: [
      { label: "All Container Offices", href: "/products?category=container-offices" },
      { label: "Container Office", href: "/products/container-office" },
      { label: "Modern Container Office", href: "/products/modern-container-office" },
      { label: "Standard Site Office Container", href: "/products/standard-site-office-container" },
      { label: "Site Office Containers (All)", href: "/products?category=site-office-containers" },
    ],
  },
  {
    pillar: "Prefab Homes & Villas",
    pillarHref: "/products?category=prefab-homes",
    description: "Factory-built prefabricated homes installed in days — 2BHK, 3BHK, villas and resort accommodations.",
    links: [
      { label: "All Prefab Homes", href: "/products?category=prefab-homes" },
      { label: "Family Prefab Home 2BHK", href: "/products/family-prefab-home-2bhk" },
      { label: "Luxury Prefab Villa G+1 Floors", href: "/products/luxury-prefab-villa-g-1-floors" },
      { label: "Labour Shed Prefabricated Structures", href: "/blog/labour-shed-prefabricated-structures" },
    ],
  },
  {
    pillar: "Security & Toilet Cabins",
    pillarHref: "/products?category=security-cabins",
    description: "Compact guard cabins for 360° visibility and hygienic portable toilet blocks for sites and events.",
    links: [
      { label: "All Security Cabins", href: "/products?category=security-cabins" },
      { label: "Guard Security Cabin", href: "/products/guard-security-cabin" },
      { label: "Portable Toilet Block - 4 Unit", href: "/products/portable-toilet-block-4-unit" },
      { label: "Portable Toilet Cabins (All)", href: "/products?category=portable-toilet-cabins" },
    ],
  },
  {
    pillar: "Cargo Storage & Shipping Containers",
    pillarHref: "/products?category=cargo-storage-shipping-containers",
    description: "ISO-grade steel containers for material storage, warehousing, and secure logistics across India.",
    links: [
      { label: "All Storage Solutions", href: "/products?category=cargo-storage-shipping-containers" },
      { label: "20ft / 40ft Storage Container", href: "/products/20ft-40ft-storage-container-corten-steel" },
      { label: "New / Used Shipping Container", href: "/products/new-used-shipping-container-for-sale-in-india" },
      { label: "Container Rental Services", href: "/products/shipping-container-rental" },
    ],
  },
  {
    pillar: "Services & Company",
    pillarHref: "/rental-service",
    description: "From rental services and custom fabrication to UPVC windows — explore our complete service offering.",
    links: [
      { label: "Portable Cabin Rental Service", href: "/rental-service" },
      { label: "Book a Free Consultation", href: "/book-appointment" },
      { label: "Our Projects & Case Studies", href: "/projects" },
      { label: "About Portable Office Cabin", href: "/about" },
      { label: "Contact Us for a Free Quote", href: "/contact" },
    ],
  },
];

export function InternalLinkingHub() {
  return (
    <section className="section-padding bg-background border-t border-border/40">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Complete Product Guide
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Explore Everything We Manufacture
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
            India's most comprehensive range of <Link href="/products?category=portable-cabins" className="text-accent hover:underline font-medium">portable cabins</Link>,{" "}
            <Link href="/products?category=container-offices" className="text-accent hover:underline font-medium">container offices</Link>,{" "}
            <Link href="/products?category=prefab-homes" className="text-accent hover:underline font-medium">prefab homes</Link>,{" "}
            <Link href="/products?category=security-cabins" className="text-accent hover:underline font-medium">security cabins</Link>, and{" "}
            <Link href="/products?category=cargo-storage-shipping-containers" className="text-accent hover:underline font-medium">cargo storage containers</Link>.{" "}
            Manufactured at our Bangalore facility and delivered pan-India.
          </p>
        </div>

        {/* Link Clusters Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {linkClusters.map((cluster) => (
            <div
              key={cluster.pillar}
              className="bg-card border border-border/50 rounded-2xl p-6 hover:border-accent/40 hover:shadow-card transition-all duration-300"
            >
              {/* Pillar Link */}
              <Link
                href={cluster.pillarHref}
                className="group flex items-center gap-2 mb-3"
              >
                <div className="w-1 h-5 bg-gradient-to-b from-accent to-amber-light rounded-full shrink-0" />
                <h3 className="font-display font-bold text-base text-foreground group-hover:text-accent transition-colors leading-tight">
                  {cluster.pillar}
                </h3>
                <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all ml-auto shrink-0" />
              </Link>

              <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                {cluster.description}
              </p>

              {/* Spoke Links */}
              <ul className="space-y-1.5">
                {cluster.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group/link"
                    >
                      <span className="w-1 h-1 rounded-full bg-accent/40 group-hover/link:bg-accent shrink-0 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Authority Strip */}
        <div className="bg-gradient-to-r from-muted/60 via-card to-muted/60 rounded-2xl p-6 lg:p-8 border border-border/50">
          <div className="grid lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-display font-bold text-base text-foreground mb-3">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Portable Cabin Price", href: "/products?category=portable-cabins" },
                  { label: "Porta Cabin Manufacturer", href: "/products/porta-cabin" },
                  { label: "Site Office Container", href: "/products?category=site-office-containers" },
                  { label: "Prefab Home India", href: "/products?category=prefab-homes" },
                  { label: "Container Office Bangalore", href: "/products?category=container-offices" },
                  { label: "Security Cabin", href: "/products?category=security-cabins" },
                ].map((tag) => (
                  <Link
                    key={tag.label}
                    href={tag.href}
                    className="text-xs bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground font-medium px-3 py-1.5 rounded-full transition-all duration-200 border border-accent/20 hover:border-accent"
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-base text-foreground mb-3">Applications</h3>
              <ul className="space-y-1.5">
                {[
                  { label: "Construction Site Offices", href: "/products?category=site-office-containers" },
                  { label: "Worker Accommodation Units", href: "/products?category=portable-cabins" },
                  { label: "Industrial Security Cabins", href: "/products?category=security-cabins" },
                  { label: "Event Portable Toilets", href: "/products?category=portable-toilet-cabins" },
                  { label: "Farmhouse & Resort Homes", href: "/products?category=prefab-homes" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-border group-hover:bg-accent shrink-0 transition-colors" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display font-bold text-base text-foreground mb-3">Quick Links</h3>
              <ul className="space-y-1.5">
                {[
                  { label: "All Products Catalogue", href: "/products" },
                  { label: "Rental Services", href: "/rental-service" },
                  { label: "Blog – Industry Guides", href: "/blog" },
                  { label: "Our Projects", href: "/projects" },
                  { label: "Book Free Consultation", href: "/book-appointment" },
                  { label: "Get a Free Quote", href: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1.5 group"
                    >
                      <ExternalLink className="h-3 w-3 text-accent/50 group-hover:text-accent shrink-0 transition-colors" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
