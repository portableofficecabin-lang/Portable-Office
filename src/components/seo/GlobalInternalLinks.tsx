"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface InternalLinkItem {
  label: string;
  href: string;
  description: string;
}

const defaultLinks: InternalLinkItem[] = [
  {
    label: "Explore Products",
    href: "/products",
    description: "Browse portable cabins, container offices, prefab homes, and storage containers.",
  },
  {
    label: "See Project Work",
    href: "/gallery",
    description: "View real installations across construction, industrial, and institutional sites.",
  },
  {
    label: "Contact Our Team",
    href: "/contact",
    description: "Share your requirement and get sizing, pricing, and delivery guidance.",
  },
];

const routeLinks: Array<{ match: RegExp; links: InternalLinkItem[] }> = [
  {
    match: /^\/$/,
    links: [
      {
        label: "Browse All Products",
        href: "/products",
        description: "Compare cabins, offices, prefab buildings, and cargo containers.",
      },
      {
        label: "Read Our Blog",
        href: "/blog",
        description: "Explore buying guides, technical explainers, and project insights.",
      },
      {
        label: "Book an Appointment",
        href: "/book-appointment",
        description: "Schedule a consultation for your next modular building requirement.",
      },
    ],
  },
  {
    match: /^\/products/,
    links: [
      {
        label: "Cargo Storage Containers",
        href: "/products/category/cargo-storage-shipping-containers",
        description: "See sale, rental, and conversion-ready steel container options.",
      },
      {
        label: "Container Office Solutions",
        href: "/products/category/container-offices",
        description: "Compare insulated, office-ready modular container workspaces.",
      },
      {
        label: "Talk to Sales",
        href: "/contact",
        description: "Get a tailored recommendation based on size, budget, and site conditions.",
      },
    ],
  },
  {
    match: /^\/gallery/,
    links: [
      {
        label: "View Product Range",
        href: "/products",
        description: "Match each project style to the relevant modular product category.",
      },
      {
        label: "About Portable Office Cabin",
        href: "/about-us",
        description: "Learn more about our manufacturing and installation capabilities.",
      },
      {
        label: "Request a Quote",
        href: "/contact",
        description: "Share your drawings or requirements for pricing and planning help.",
      },
    ],
  },
  {
    match: /^\/blog/,
    links: [
      {
        label: "Portable Office Cabin Homepage",
        href: "/",
        description: "Portable Office Cabin manufactures portable cabins, container offices, and prefab modular structures across India.",
      },
      {
        label: "Explore Products",
        href: "/products",
        description: "Jump from this article to relevant modular and container solutions.",
      },
      {
        label: "See Live Projects",
        href: "/gallery",
        description: "Review real-world installations to compare layouts and finishes.",
      },
    ],
  },
  {
    match: /^\/(contact|book-appointment)/,
    links: [
      {
        label: "Browse Products First",
        href: "/products",
        description: "Review categories and identify the right modular solution before enquiring.",
      },
      {
        label: "See Completed Projects",
        href: "/gallery",
        description: "Understand the scale, quality, and applications we deliver.",
      },
      {
        label: "Read Frequently Asked Questions",
        href: "/faq",
        description: "Check answers on pricing, delivery, installation, and customization.",
      },
    ],
  },
];

export function GlobalInternalLinks() {
  const pathname = usePathname();

  const matchedGroup = routeLinks.find((group) => group.match.test(pathname));
  const links = matchedGroup?.links ?? defaultLinks;
  const uniqueLinks = links.filter((item, index, all) => all.findIndex((entry) => entry.href === item.href) === index).slice(0, 3);

  return (
    <section className="border-t border-border bg-muted/20">
      <div className="container-custom py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-accent" />
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Internal Links</span>
        </div>
        <div className="mb-6 max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-foreground">Keep exploring Portable Office Cabin</h2>
          <p className="mt-2 text-muted-foreground">
            Jump to related pages for products, projects, pricing guidance, and enquiry support.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {uniqueLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-card"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground transition-colors group-hover:text-accent">{link.label}</h3>
                <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
