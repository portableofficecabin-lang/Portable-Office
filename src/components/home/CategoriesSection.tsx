import Link from "next/link";
import { Building, Briefcase, LayoutGrid, Home, Bath, Shield, ArrowRight, Container, Building2, Users, BedDouble, Warehouse, Archive, Hammer, DoorOpen, Armchair } from "lucide-react";
import { categories } from "@/data/products";

const iconMap: Record<string, React.ElementType> = {
  building: Building,
  briefcase: Briefcase,
  layout: LayoutGrid,
  home: Home,
  bath: Bath,
  shield: Shield,
  container: Container,
  building2: Building2,
  users: Users,
  bedDouble: BedDouble,
  warehouse: Warehouse,
  archive: Archive,
  hammer: Hammer,
  doorOpen: DoorOpen,
  armchair: Armchair,
};

export function CategoriesSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            What We Build
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Pick What You Need
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Whether you need a small security booth or a full family home, 
            we've probably built one before. Our portable office cabins and other solutions are available in a variety of sizes to suit different needs, including compact guard rooms, spacious meeting rooms, or larger family homes. Here's what we offer.
          </p>
          <div className="bg-card border border-border/50 rounded-2xl p-6 lg:p-8 max-w-4xl mx-auto text-left">
            <h3 className="font-display font-bold text-xl text-foreground mb-3">Introduction to Portable Workspaces</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Portable workspaces have transformed the way businesses and institutions across India approach their space requirements. Gone are the days when traditional construction was the only option for creating offices, site facilities, or professional environments. Today, advanced technology and innovative design have made portable cabins, office containers, and security cabins the go-to solutions for both temporary and permanent needs. These modern, prefabricated products offer unmatched flexibility, allowing organizations to quickly set up high-quality, professional spaces at construction sites, schools, and company premises. Leading manufacturers in India are at the forefront of this shift, delivering quality products that combine durability, smart design, and efficient use of space. Whether you need a temporary office, a secure guard cabin, or a fully equipped site office, portable workspaces provide a reliable, cost-effective, and sustainable alternative to traditional construction—helping institutions and businesses stay agile and competitive in a fast-paced market.
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const Icon = iconMap[category.icon] || Building;
            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative bg-gradient-to-br from-card via-card to-muted/30 p-6 rounded-2xl border border-border/50 hover:border-accent/50 shadow-card hover:shadow-2xl transition-all duration-500 animate-fade-up overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative flex items-start gap-4">
                  <div className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center group-hover:from-accent group-hover:to-amber-light transition-all duration-500 shadow-lg group-hover:shadow-accent/30">
                    <Icon className="w-8 h-8 text-accent group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl text-foreground mb-2 group-hover:text-accent transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                      {category.description}
                    </p>
                    {category.slug === "portable-cabins" && (
                      <p className="text-muted-foreground text-xs mb-2 italic">
                        MS portable cabin options are also available, featuring sturdy steel construction and customizable designs to suit a variety of uses.
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-accent font-semibold bg-accent/10 px-3 py-1 rounded-full">
                        {category.productCount} products
                      </span>
                      <ArrowRight className="w-5 h-5 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
