/**
 * SINGLE SOURCE OF TRUTH for the public site's header and footer navigation.
 *
 * Why this file exists: before it, the header and the footer each carried their own
 * hardcoded copy of the nav links, the product-category list, the phone numbers, the
 * addresses and the registration IDs. Four copies of the same facts drift — that is
 * exactly the failure mode src/lib/company.ts was created to stop for business
 * identity. This module does the same job for navigation.
 *
 * HARD RULES for anything added here:
 *
 * 1. EVERY href must resolve to a real route. Verified against app/**\/page.tsx.
 *    - `/manufacturing` does NOT exist — do not add it.
 *    - `/projects` exists only as a 301 to `/gallery` (next.config.ts) — link
 *      `/gallery` directly so users and crawlers skip the redirect hop.
 *    - There is NO `/search` route and no search backend. The header search box
 *      drives the existing client-side filter on /products; see HeaderSearch.
 * 2. Product categories are derived from `categories` in src/data/products.ts —
 *    never retyped. Those 15 slugs are live, indexed, and statically guaranteed to
 *    resolve (src/lib/products/merge.ts unions static categories over DB rows, so a
 *    Supabase outage cannot 404 them).
 * 3. Category URLs use the path form `/products/category/<slug>`. NEVER
 *    `/products?category=<slug>` — middleware.ts 301s that and strips the query.
 * 4. Business facts come from COMPANY (src/lib/company.ts). Do not retype a phone
 *    number, address, GSTIN or opening hour here.
 */

import { categories, type Category } from "@/data/products";
import { COMPANY } from "@/lib/company";

export interface NavLinkItem {
  name: string;
  href: string;
  /** Optional one-line description, used by the desktop mega menu. */
  description?: string;
  /** Marks an off-site link so the renderer can add target/rel. */
  external?: boolean;
}

/* ------------------------------------------------------------------ *
 * Primary navigation
 * ------------------------------------------------------------------ */

/**
 * The primary nav row. It gets a full-width row of its own beneath the brand/CTA
 * bar, so it no longer competes with the logo and action buttons for horizontal
 * space — which is what previously forced the desktop header up to a 1280px
 * breakpoint. Nine items fit comfortably from 1024px.
 *
 * The 15 product categories still live in the mega menu, not here. Every entry is a
 * confirmed route.
 */
export const primaryNavigation: NavLinkItem[] = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about-us" },
  { name: "Products", href: "/products" },
  { name: "Rentals", href: "/rental-service" },
  { name: "Projects", href: "/gallery" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Blog", href: "/blog" },
  { name: "FAQ", href: "/faq" },
  { name: "Contact", href: "/contact" },
];

/** Routes whose "current page" highlight is owned by the Products mega menu. */
export const PRODUCTS_ACTIVE_PREFIX = "/products";

/**
 * True when `href` is the page currently being viewed, for `aria-current="page"`
 * and the active styling in both the desktop bar and the mobile drawer.
 *
 * "/" must match exactly or it would light up on every route. Every other entry also
 * matches its descendants, so /blog stays highlighted while reading /blog/a-post.
 *
 * Lives here rather than beside the nav components so both renderers share one
 * definition (and so neither component file exports a non-component, which breaks
 * React Fast Refresh).
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ *
 * Product mega menu
 * ------------------------------------------------------------------ */

const categoryBySlug = new Map<string, Category>(categories.map((c) => [c.slug, c]));

/** Resolves a slug to its live category record, or null if it was removed upstream. */
function category(slug: string): Category | null {
  return categoryBySlug.get(slug) ?? null;
}

export interface MegaMenuGroup {
  title: string;
  /** Slugs, in display order. Resolved against src/data/products.ts at build time. */
  slugs: string[];
}

/**
 * The 15 real categories, grouped into four readable columns. Grouping is
 * presentation only — it invents no routes. If a slug is ever deleted from
 * src/data/products.ts it simply drops out of the menu (see megaMenuColumns).
 */
export const megaMenuGroups: MegaMenuGroup[] = [
  {
    title: "Cabins & Offices",
    slugs: ["portable-cabins", "site-office-containers", "container-offices", "security-cabins"],
  },
  {
    title: "Worker Accommodation",
    slugs: ["labour-colony", "g1-workmen-accommodation", "bunker-bed-container-cabin", "prefab-homes"],
  },
  {
    title: "Sanitation & Storage",
    slugs: ["portable-toilet-cabins", "cargo-storage-shipping-containers", "storage-shed"],
  },
  {
    title: "Buildings & Fit-out",
    slugs: ["peb-building", "fabrication", "upvc-windows-doors", "modular-furniture"],
  },
];

export interface MegaMenuColumn {
  title: string;
  items: Array<{ name: string; href: string; description: string; icon: string }>;
}

/** Mega menu columns with every slug resolved to its real name/description/icon. */
export const megaMenuColumns: MegaMenuColumn[] = megaMenuGroups.map((group) => ({
  title: group.title,
  items: group.slugs
    .map((slug) => category(slug))
    .filter((c): c is Category => c !== null)
    .map((c) => ({
      name: c.name,
      href: `/products/category/${c.slug}`,
      description: c.description,
      icon: c.icon,
    })),
}));

/**
 * The mega menu's right-hand rail. Secondary journeys that are not categories —
 * all confirmed routes.
 */
export const megaMenuFeatured: NavLinkItem[] = [
  { name: "View All Products", href: "/products", description: "The complete range, with specs and prices" },
  { name: "Cabins on Rent", href: "/rental-service", description: "Monthly rental with delivery and installation" },
  { name: "Marketplace", href: "/marketplace", description: "Ready stock available for immediate dispatch" },
  { name: "Book a Consultation", href: "/book-appointment", description: "Talk sizing and layout with our team" },
  { name: "Offers & Promotions", href: "/promotions", description: "Current deals on ready-stock units" },
];

/* ------------------------------------------------------------------ *
 * Footer link groups
 * ------------------------------------------------------------------ */

/**
 * ALL 15 category links, in the footer.
 *
 * Not a subset, deliberately. The old header rendered every category into the static
 * HTML (its dropdown was CSS-hover, so the links were always in the DOM, merely
 * hidden). The new mega menu only mounts when opened, which is the right call for
 * accessibility but removes those links from the HTML. Carrying the full set here —
 * in a Server Component that renders on every public page — keeps all 15 commercial
 * category URLs internally linked sitewide, which is what they had before.
 *
 * Derived from `categories`, so this list cannot drift from the real slugs.
 */
export const footerProductLinks: NavLinkItem[] = categories.map((c) => ({
  name: c.name,
  href: `/products/category/${c.slug}`,
}));

/** Appended after the category list so "View All" is always last. */
export const footerProductsViewAll: NavLinkItem = { name: "View All Products", href: "/products" };

export const footerCompanyLinks: NavLinkItem[] = [
  { name: "About Us", href: "/about-us" },
  { name: "Projects & Gallery", href: "/gallery" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Offers & Promotions", href: "/promotions" },
  { name: "Blog", href: "/blog" },
  { name: "Careers", href: "/careers" },
];

export const footerSupportLinks: NavLinkItem[] = [
  { name: "Request a Quote", href: "/contact" },
  { name: "Book an Appointment", href: "/book-appointment" },
  { name: "Cabins on Rent", href: "/rental-service" },
  { name: "FAQs", href: "/faq" },
  { name: "Shipping & Delivery Policy", href: "/shipping" },
  { name: "Warranty Policy", href: "/warranty" },
  // No /my-account here: it is robots-disallowed and noindex,nofollow, so a sitewide
  // footer link to it would spend crawl budget on a page we ask not to be indexed.
  // The account link lives in the header, where signed-in users look for it.
];

/**
 * The policy set required by Google Merchant Center. BUSINESS-CRITICAL: every one
 * of these must stay publicly reachable from the footer with no login and with no
 * JavaScript dependency — never move these behind a client-side accordion.
 */
export const footerPolicyLinks: NavLinkItem[] = [
  { name: "Payment Policy", href: "/payment-policy" },
  { name: "Return, Refund & Cancellation Policy", href: "/refund-policy" },
  { name: "Customised Product Policy", href: "/custom-product-policy" },
  { name: "Shipping & Delivery Policy", href: "/shipping" },
  { name: "Warranty Policy", href: "/warranty" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/terms-and-conditions" },
];

/** Compact policy row for the bottom bar. */
export const bottomBarLinks: NavLinkItem[] = [
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/terms-and-conditions" },
  { name: "Refund Policy", href: "/refund-policy" },
  { name: "Shipping Policy", href: "/shipping" },
  { name: "Contact", href: "/contact" },
];

/* ------------------------------------------------------------------ *
 * Contact + social
 * ------------------------------------------------------------------ */

export const primaryPhone = COMPANY.phones[0];
export const secondaryPhone = COMPANY.phones[1];

/** Pre-filled WhatsApp deep link. Same number and wording as the floating button. */
export const whatsappUrl = `${COMPANY.whatsapp.url}?text=${encodeURIComponent(
  "Hi, I'd like a quote",
)}`;

/**
 * Social profiles.
 *
 * The hrefs below are the exact URLs the live footer has been shipping — they are
 * known-good. COMPANY.social holds cleaner canonical forms of the same three
 * profiles (and JSON-LD `sameAs` uses those), but swapping a verified-working link
 * for one this codebase cannot verify is a regression risk with no user-facing
 * gain, so the working URLs are kept. If the owner confirms the canonical forms
 * resolve, replace these with COMPANY.social and the two will finally agree.
 */
export const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/share/1ZMvxG4MGy/", icon: "facebook" },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/portable-office-cabin-9b939a168?utm_source=share&utm_content=profile&utm_medium=member_android",
    icon: "linkedin",
  },
  { name: "Instagram", href: "https://www.instagram.com/portableofficecabin?igsh=d3Z5azNvM3o0ZDI3", icon: "instagram" },
] as const;

/* ------------------------------------------------------------------ *
 * Trust indicators
 * ------------------------------------------------------------------ */

/**
 * Trust statements. Each one is backed by data already published on this site —
 * the ISO certificate number, GSTIN and Udyam number all come from COMPANY, and
 * "Manufacturer" / "PAN India delivery" restate the Organization + LocalBusiness
 * JSON-LD (areaServed spans the country). No unbacked figure (years in business,
 * project counts, client percentages) appears here — those strings are
 * inconsistent across the site and are not in the verified-facts file.
 */
/**
 * The three statements in the slim bar above the header.
 *
 * All three are substantiated by content already on this site: the Karnataka works
 * is at Hoskote near Bangalore (COMPANY.addresses.karnatakaFactory) and the site
 * publishes a "portable cabin manufacturers in Bangalore" page; customisation is the
 * documented quote-only build path; and PAN-India delivery restates the
 * LocalBusiness areaServed. No unbacked figure (years, project counts) appears here.
 */
export const topBarTrustItems = [
  { label: "Manufacturer in Bangalore", icon: "pin" },
  { label: "Custom sizes available", icon: "tag" },
  { label: "Delivery across India", icon: "truck" },
] as const;

export const footerTrustItems = [
  { label: "ISO 9001:2015 Certified", icon: "badge" },
  { label: "GST Invoice", icon: "receipt" },
  { label: "PAN India Delivery", icon: "truck" },
  { label: "In-house Manufacturing", icon: "factory" },
] as const;

/** Wording preserved from the previous footer, including the "Company" and "QMS"
 *  qualifiers, so the certification is stated exactly as it was. */
export const registrationBadges = [
  { label: "ISO 9001:2015 Certified Company", value: `QMS · Cert. No. ${COMPANY.isoCertificate}` },
  { label: "GSTIN", value: COMPANY.gstin },
  { label: "MSME / Udyam", value: COMPANY.udyam },
] as const;

/**
 * The company blurb. Kept in step with the Organization/LocalBusiness JSON-LD
 * descriptions so the visible footer and the structured data tell one story.
 */
export const companyBlurb =
  "Portable Office Cabin is a manufacturer of portable cabins, container offices, site offices, " +
  "labour colonies, security cabins, toilet cabins, prefab homes and customised modular structures — " +
  "built in our own facilities and delivered ready to use across India.";
