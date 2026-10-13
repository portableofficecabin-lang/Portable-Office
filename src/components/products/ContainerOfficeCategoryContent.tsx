import Link from "next/link";
import { ContainerOfficeLocationLists } from "@/components/locations/ContainerOfficeLocations";
import {
  CONTAINER_OFFICE_BANGALORE_PATH,
  CONTAINER_OFFICE_DIRECTORY_PATH,
} from "@/data/containerOfficeCluster";

export function ContainerOfficeCategoryContent() {
  return (
    <section
      className="mt-12 space-y-8 border-t border-border/50 pt-10"
      aria-label="Container office buying guide"
    >
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Container Office Cabins for Construction and Industrial Sites
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Portable Office Cabin manufactures container office cabins for
          construction sites, industrial projects, site administration and
          temporary workplaces. Our solutions include mild steel container
          offices, insulated site offices and customized layouts designed
          around your project requirements.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Customers can request office partitions, doors, windows, electrical
          fittings, insulation, flooring and furniture based on the intended
          application. Final specifications and dimensions are confirmed
          through the approved quotation and drawing.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Container Office Sizes and Specifications
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Container offices can be planned for compact site cabins,
          administrative offices and larger project workspaces. Available
          dimensions, structural materials, insulation systems and interior
          arrangements depend on the selected model and approved design.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          For accurate container office pricing, share your required length,
          width, location, layout, electrical requirements and interior
          specifications. Transportation, unloading and installation scope
          should be confirmed separately in the quotation.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Container Office Manufacturer Serving Bangalore and Hosur
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Portable Office Cabin serves projects in Bangalore, Hosur,
          Karnataka and Tamil Nadu, with delivery to other locations
          subject to project feasibility and transport arrangements.
          Container offices can be configured for site offices,
          meeting rooms, engineering workspaces and staff facilities.
        </p>
        {/* Container-office cluster: this category is the pillar; the Bangalore landing page owns
            Bangalore-specific searches and each location page owns its own area
            (src/data/containerOfficeCluster.ts). */}
        <p className="text-muted-foreground leading-relaxed">
          For projects within the city, see{" "}
          <Link href={CONTAINER_OFFICE_BANGALORE_PATH} className="font-medium text-accent hover:underline underline-offset-4">
            container offices for Bangalore projects
          </Link>
          . The local guides below cover the industrial areas we supply in both states, with what
          each area typically needs and answers for that location.
        </p>
        <ContainerOfficeLocationLists />
        <p className="text-muted-foreground leading-relaxed">
          <Link href={CONTAINER_OFFICE_DIRECTORY_PATH} className="font-medium text-accent hover:underline underline-offset-4">
            See every location we serve, grouped by state
          </Link>
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Explore Related Portable Office Solutions
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-accent">
          <li>
            <Link href="/products/category/site-office-containers">
              Container Site Offices
            </Link>
          </li>
          <li>
            <Link href="/products/category/portable-cabins">
              Portable Office Cabins
            </Link>
          </li>
          <li>
            <Link href="/products">
              View All Portable Cabin Products
            </Link>
          </li>
          <li>
            <Link href="/contact">
              Request a Container Office Quotation
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
