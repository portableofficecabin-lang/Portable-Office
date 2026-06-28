import Link from "next/link";
import { ArrowRight } from "lucide-react";

const products = [
  {
    name: "Portable Cabins",
    slug: "portable-cabins",
    desc: "Ready-to-deploy modular cabins for offices, site rooms, and bunkhouses. Built tough, delivered fast.",
  },
  {
    name: "Container Offices",
    slug: "container-offices",
    desc: "Modern container-based workspaces with insulation, electricals, and finishes that don't feel like containers.",
  },
  {
    name: "Site Office Containers",
    slug: "site-office-containers",
    desc: "Heavy-duty site offices built from shipping containers for real construction site conditions.",
  },
  {
    name: "Shipping Containers",
    slug: "cargo-storage-shipping-containers",
    desc: "New and used 20ft/40ft Corten steel containers for storage, logistics, and conversion projects.",
  },
  {
    name: "Prefab Homes",
    slug: "prefab-homes",
    desc: "2BHK family homes and G+1 villas fully installed in days, not months — properly liveable.",
  },
  {
    name: "Security Cabins",
    slug: "security-cabins",
    desc: "Guard booths and security posts with great visibility, ventilation, and weatherproof finishes.",
  },
  {
    name: "Labour Hutments",
    slug: "labour-colony",
    desc: "Dignified prefabricated worker accommodation and labour colonies with toilets, kitchens, and bunks.",
  },
];

export function ProductRangeSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            Our Catalogue
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Our Product Range
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Seven core product lines, each engineered for Indian site conditions and built to last.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/products/category/${p.slug}`}
              className="group block bg-card border border-border/50 rounded-2xl p-6 hover:border-accent/50 hover:shadow-lg transition-all"
            >
              <h3 className="font-display font-bold text-xl text-foreground mb-2 group-hover:text-accent transition-colors">
                {p.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                View range <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
