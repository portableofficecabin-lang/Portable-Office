/**
 * CATEGORY LANDING SECTIONS — the data behind the server-rendered landing content on
 * /products/category/<slug> and the category-matched link blocks on product pages.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────
 * Four categories already ship hand-built landing content (portable-cabins, container-offices,
 * prefab-building, home-construction). The other populated categories rendered only the product
 * grid and a one-line tagline, so their parent page said almost nothing a buyer comparing
 * manufacturers could use, and their meta descriptions were 36–69 characters long. This file gives
 * those categories one shared, data-driven landing section instead of six more bespoke components.
 *
 * ── THE FACTS POLICY (read before editing copy) ─────────────────────────────────────────────
 *   • Every ₹ figure is COMPUTED, never typed: model prices come from sellPrice(getCommerce(id))
 *     behind the same isPurchasable()/isOutrightSale() gates as the cards, the product page, the
 *     cart, checkout, the JSON-LD offer and the Merchant feed. Transport, dispatch and installation
 *     figures come from src/data/shippingZones.ts — the table checkout itself charges from.
 *   • No "starting from", no price ranges, no strikethroughs. A model either shows its one fixed
 *     GST-inclusive price or "Price on request". A rental shows its monthly figure with "/ month".
 *   • Copy describes categories, buying decisions and how the products are used. It does NOT
 *     restate a single model's specification in prose (the comparison table and the product page
 *     own those), so an owner edit to a product can never leave this copy contradicting it.
 *   • No certifications, ratings, project counts, years in business or warranty periods are
 *     asserted here. Warranty questions point at the published warranty policy.
 *   • Every link target below exists today and returns 200 (checked against the sitemap when the
 *     file was written). Location links are category-matched — a security-cabin page links to
 *     security-cabin location pages, never to an unrelated city list.
 *
 * Data and helpers only — no JSX — so the server component stays the single renderer and the
 * react-refresh lint rule (components-only exports from .tsx) is not tripped.
 */

import { getProductDetailPath, type Category, type Product } from "@/data/products";
import { getCommerce, isOutrightSale, isPurchasable, priceUnitSuffix, isRentalPrice } from "@/data/productCommerce";
import { cityPageBySlug } from "@/data/cityPages";
import { DISPATCH_WORKING_DAYS, INSTALLATION, SHIPPING_ZONES } from "@/data/shippingZones";
import { GST_PERCENT_LABEL, formatINR, sellPrice } from "@/lib/pricing/gst";

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  TYPES
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

export interface LinkItem {
  name: string;
  href: string;
  /** One line shown under the link, where a bare anchor would not say enough. */
  description?: string;
}

export interface Faq {
  question: string;
  answer: string;
}

/** One row of the category's model comparison table — everything computed from the catalogue. */
export interface CategoryModel {
  id: string;
  /** Commerce H1 where one exists, so the anchor matches the destination page's <h1>. */
  name: string;
  path: string;
  size: string;
  /** Floor area from the product's own spec rows, when it states one and the size does not. */
  area?: string;
  construction: string;
  bestFor: string;
  /** "₹5,66,400" or "₹16,520 / month"; undefined when the SKU cannot be bought online. */
  priceLabel?: string;
  /** Numeric GST-inclusive figure, for sorting only. */
  priceInr?: number;
  rental: boolean;
}

/** The facts copy and FAQs may interpolate. All computed, none typed. */
export interface CategoryFacts {
  categoryName: string;
  models: CategoryModel[];
  modelCount: number;
  outrightCount: number;
  rental?: CategoryModel;
  dispatch: string;
  installation: string;
  gst: string;
  localTransit: string;
  farthestTransit: string;
  /** "Rest of India" — the farthest zone name without its "Zone N — " prefix. */
  farthestZone: string;
}

export interface TransportRow {
  zone: string;
  areas: string;
  charge: string;
  transit: string;
}

/** Category-matched links used on BOTH the category page and its product pages. */
export interface CategoryLinks {
  /** "<Category> by location" — heading for the location block. */
  locationHeading?: string;
  locationLinks: LinkItem[];
  guideLinks: LinkItem[];
  relatedCategorySlugs: string[];
  /**
   * products.ts ids of GENUINELY related products in OTHER categories. Used only to fill the
   * product page's related-products rail when the product's own category has fewer than three
   * siblings (the toilet block had none at all, so its rail rendered nothing).
   */
  crossSellProductIds: string[];
}

/** The authored part of a category landing section. */
interface CategoryLandingCopy {
  /** H2 that opens the section. */
  heading: string;
  metaDescription: (f: CategoryFacts) => string;
  intro: (f: CategoryFacts) => string[];
  applicationsHeading: string;
  applications: { title: string; text: string }[];
  choosingHeading: string;
  choosing: { title: string; text: string }[];
  faqs: (f: CategoryFacts) => Faq[];
  /** Noun used in the enquiry form, e.g. "security cabin". */
  enquiryNoun: string;
}

/** Everything the server component renders and the page's JSON-LD reads — resolved once. */
export interface ResolvedCategoryLanding extends Omit<CategoryLandingCopy, "metaDescription" | "intro" | "faqs"> {
  slug: string;
  categoryName: string;
  intro: string[];
  faqs: Faq[];
  models: CategoryModel[];
  transport: TransportRow[];
  dispatch: string;
  installation: { label: string; charge: string; description: string };
  gst: string;
  links: CategoryLinks;
  relatedCategories: LinkItem[];
}

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  SHARED LINK TARGETS (all verified 200, in the sitemap)
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

const GUIDE = {
  installation: {
    name: "Installation and site preparation",
    href: "/products/portable-cabin/installation-and-site-preparation",
    description: "Base, access and crane planning before a unit arrives.",
  },
  transport: {
    name: "Transport and delivery",
    href: "/products/portable-cabin/transport-and-delivery",
    description: "Trucks, cranes and what to check on the route to site.",
  },
  layouts: {
    name: "Layouts and interiors",
    href: "/products/portable-cabin/layouts-and-interiors",
    description: "Planning desks, partitions, storage and services inside a cabin.",
  },
  insulation: {
    name: "Insulation and cooling",
    href: "/products/portable-cabin/insulation-and-cooling",
    description: "Keeping a steel cabin usable through a South Indian summer.",
  },
  materials: {
    name: "MS vs PUF panel construction",
    href: "/products/portable-cabin/materials-ms-vs-puf",
    description: "How the two common wall builds differ in heat, cost and life.",
  },
  toiletPantry: {
    name: "Cabins with toilet and pantry",
    href: "/products/portable-cabin/with-toilet-and-pantry",
    description: "What an attached toilet or pantry changes in a cabin layout.",
  },
  newVsUsed: {
    name: "Buying new vs used",
    href: "/products/portable-cabin/buying-guide-new-vs-used",
    description: "What to inspect before paying for a second-hand unit.",
  },
  maintenance: {
    name: "Maintenance and lifespan",
    href: "/products/portable-cabin/maintenance-and-lifespan",
    description: "The routine checks that keep a steel structure in service.",
  },
} satisfies Record<string, LinkItem>;

/** Location links for one promotion keyword — Bangalore, Karnataka, Tamil Nadu and Chennai,
 *  the service area the brief and the shipping zones both centre on. */
function promotionLocations(keywordSlug: string, chennai?: LinkItem): LinkItem[] {
  return [
    { name: "Bangalore", href: `/promotions/${keywordSlug}-in-bangalore` },
    { name: "Karnataka", href: `/promotions/${keywordSlug}-in-karnataka` },
    { name: "Tamil Nadu", href: `/promotions/${keywordSlug}-in-tamil-nadu` },
    chennai ?? { name: "Chennai", href: `/promotions/${keywordSlug}-in-chennai` },
  ];
}

/** Slug of the dedicated Chennai container-office city page (branch feat/city-chennai). */
export const CHENNAI_CITY_PAGE_SLUG = "container-office-in-chennai";

/**
 * "Chennai" for the container-office and site-office link lists: the dedicated city page once its
 * CITY_PAGES entry exists, otherwise the Chennai promotion page. Resolved from the data, so the
 * links move to the city page's canonical URL in the same deploy that publishes it — and can never
 * point at a page that does not exist yet.
 */
export function chennaiContainerLink(promotionKeywordSlug: string): LinkItem {
  return cityPageBySlug(CHENNAI_CITY_PAGE_SLUG)
    ? { name: "Chennai", href: `/cities-we-serve/${CHENNAI_CITY_PAGE_SLUG}` }
    : { name: "Chennai", href: `/promotions/${promotionKeywordSlug}-in-chennai` };
}

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  LINKS PER CATEGORY — category page AND its product pages
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

export const CATEGORY_LINKS: Record<string, CategoryLinks> = {
  "site-office-containers": {
    locationHeading: "Site office containers by location",
    locationLinks: [
      ...promotionLocations("site-office-container", chennaiContainerLink("site-office-container")),
      { name: "SIPCOT Hosur", href: "/cities-we-serve/container-office-in-sipcot-hosur" },
      { name: "Bommasandra", href: "/cities-we-serve/container-office-in-bommasandra" },
      { name: "Jigani", href: "/cities-we-serve/container-office-in-jigani" },
    ],
    guideLinks: [GUIDE.installation, GUIDE.transport, GUIDE.layouts, GUIDE.insulation],
    relatedCategorySlugs: ["container-offices", "portable-cabins", "cargo-storage-shipping-containers"],
    crossSellProductIds: [],
  },
  "security-cabins": {
    locationHeading: "Security cabins by location",
    locationLinks: promotionLocations("security-cabin"),
    guideLinks: [GUIDE.materials, GUIDE.insulation, GUIDE.installation],
    relatedCategorySlugs: ["portable-cabins", "site-office-containers"],
    // Small standalone cabins a gate or campus buyer also compares: the 10–40 ft steel office
    // container and the 20 ft executive cabin.
    crossSellProductIds: ["28", "1"],
  },
  "portable-toilet-cabins": {
    locationHeading: "Portable toilet cabins by location",
    locationLinks: promotionLocations("portable-toilet-cabin"),
    guideLinks: [
      {
        name: "Portable toilet cabin types",
        href: "/products/portable-toilet-cabin",
        description: "MS, GI, FRP and bio-toilet formats, built to order.",
      },
      GUIDE.toiletPantry,
      GUIDE.installation,
    ],
    relatedCategorySlugs: ["g1-workmen-accommodation", "site-office-containers"],
    // Sites that buy a toilet block are housing or managing a workforce: the accommodation block
    // and the two site offices are what the same buyer is comparing.
    crossSellProductIds: ["39", "42", "2"],
  },
  "cargo-storage-shipping-containers": {
    locationHeading: "Shipping containers by location",
    locationLinks: [
      { name: "Bangalore", href: "/promotions/shipping-container-in-bangalore" },
      { name: "Karnataka", href: "/promotions/shipping-container-in-karnataka" },
      { name: "Tamil Nadu", href: "/promotions/shipping-container-in-tamil-nadu" },
      { name: "Chennai", href: "/promotions/shipping-container-in-chennai" },
      { name: "Cargo storage containers in Bangalore", href: "/promotions/cargo-storage-container-in-bangalore" },
    ],
    guideLinks: [GUIDE.newVsUsed, GUIDE.transport, GUIDE.maintenance],
    relatedCategorySlugs: ["container-offices", "site-office-containers"],
    crossSellProductIds: [],
  },
  "g1-workmen-accommodation": {
    locationHeading: "Labour accommodation by location",
    locationLinks: [
      { name: "Labour camp setup in Bangalore", href: "/cities-we-serve/labour-camp-setup-bangalore" },
      ...promotionLocations("labour-colony"),
    ],
    guideLinks: [
      {
        name: "Prefabricated labour colony in Bengaluru",
        href: "/blog/prefabricated-labor-colony-bengaluru",
        description: "Planning a worker colony around a city project.",
      },
      {
        name: "Labour shed prefabricated structures",
        href: "/blog/labour-shed-prefabricated-structures",
        description: "Shed-type accommodation and when it is the better fit.",
      },
      GUIDE.toiletPantry,
    ],
    relatedCategorySlugs: ["portable-cabins", "portable-toilet-cabins"],
    // Single-storey accommodation sold in the Portable Cabins category.
    crossSellProductIds: ["22", "24", "7"],
  },
  "prefab-homes": {
    locationLinks: [],
    guideLinks: [
      {
        name: "Home construction services",
        href: "/products/category/home-construction",
        description: "A conventional RCC house built on your own plot instead.",
      },
      GUIDE.installation,
      GUIDE.insulation,
    ],
    relatedCategorySlugs: ["home-construction", "prefab-building"],
    // The RCC house build (the alternative a prefab-home buyer weighs) and the prefabricated cabin.
    crossSellProductIds: ["45", "13"],
  },
  /* The two categories below keep their own hand-built landing content; they appear here only so
   * their PRODUCT pages get the same category-matched location links. Guides are left empty for
   * portable-cabins because PortableCabinGuideLinks already mounts the hub and three guides there. */
  "portable-cabins": {
    locationHeading: "Portable cabins by location",
    locationLinks: promotionLocations("portable-cabin"),
    guideLinks: [],
    relatedCategorySlugs: [],
    crossSellProductIds: [],
  },
  "container-offices": {
    locationHeading: "Container offices by location",
    locationLinks: [
      ...promotionLocations("container-office", chennaiContainerLink("container-office")),
      { name: "SIPCOT Hosur", href: "/cities-we-serve/container-office-in-sipcot-hosur" },
      { name: "Bommasandra", href: "/cities-we-serve/container-office-in-bommasandra" },
      { name: "Jigani", href: "/cities-we-serve/container-office-in-jigani" },
    ],
    guideLinks: [GUIDE.installation, GUIDE.transport, GUIDE.layouts],
    relatedCategorySlugs: [],
    crossSellProductIds: [],
  },
};

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  AUTHORED COPY PER CATEGORY
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

/** "one model" / "5 models" */
const countWord = (n: number, noun: string) => `${n === 1 ? "one" : n} ${noun}${n === 1 ? "" : "s"}`;

function deliveryFaq(f: CategoryFacts, noun: string): Faq {
  return {
    question: `How long does delivery of a ${noun} take?`,
    answer:
      `Listed models are dispatched within ${f.dispatch} of order confirmation and payment. Transit ` +
      `is added on top and depends on the delivery zone: ${f.localTransit} within about 50 km of our ` +
      `facility and ${f.farthestTransit} for ${f.farthestZone}. Custom builds follow the ` +
      `programme agreed in their quotation.`,
  };
}

function priceFaq(f: CategoryFacts, noun: string): Faq {
  return {
    question: `Are the ${noun} prices on this page fixed?`,
    answer:
      `For the configurations listed, yes. Each model has one fixed price that includes ${f.gst} GST, ` +
      `and that is the amount charged at checkout. Transport is calculated at checkout from your ` +
      `delivery PIN code, and on-site installation is an optional line item of ${f.installation}. ` +
      `A different size, layout or fit-out is a custom build and is priced in a written quotation.`,
  };
}

const LANDING_COPY: Record<string, CategoryLandingCopy> = {
  "site-office-containers": {
    heading: "Site Office Containers: Compare Before You Order",
    metaDescription: (f) =>
      `Compare ${f.modelCount} site office containers by size, build and fixed GST-inclusive price. ` +
      `Corten and MS-frame units, crane-ready, from our Tamil Nadu factory.`,
    intro: (f) => [
      "A site office container is usually the first proper room on a project: the place where drawings " +
        "stay dry, the engineer works through the day and the client meeting happens. The models in " +
        "this category are all built for that job, but they are not interchangeable. They differ in how " +
        "the shell is made, how the walls are insulated and how much of the interior is fitted before " +
        "the unit leaves the factory.",
      `The ${countWord(f.modelCount, "model")} below can each be bought online at one fixed price ` +
        `that includes ${f.gst} GST. Open a model for its full specification table and photographs. If ` +
        "your site needs a length, layout or fit-out that is not listed, the enquiry form further down " +
        "takes your requirement for a written quotation.",
    ],
    applicationsHeading: "Where site office containers are used",
    applications: [
      {
        title: "Project and site engineering offices",
        text:
          "A dry, lockable room close to the work face for the site engineer, supervisors, drawings " +
          "and the daily progress meeting.",
      },
      {
        title: "Client and consultant meetings",
        text:
          "A presentable space to review drawings and bills with clients, architects and inspectors " +
          "without sending them back to a head office.",
      },
      {
        title: "Office with secure storage",
        text:
          "Combining a work area with lockable storage for instruments, documents and small tools, so " +
          "one unit does the job of two.",
      },
      {
        title: "Temporary offices during expansion",
        text:
          "Factories, warehouses and campuses use them as overflow offices while a permanent building " +
          "is being extended or refurbished.",
      },
    ],
    choosingHeading: "How to choose the right site office container",
    choosing: [
      {
        title: "Start from what has to fit inside",
        text:
          "List the desks, cabinets, meeting table and any partition or toilet you need, then compare " +
          "sizes in the table. Check the width first: it limits the layout most, and it is constrained by " +
          "what can travel by road.",
      },
      {
        title: "Container shell or fabricated frame",
        text:
          "A Corten container shell is rigid and weather-tight by design. A fabricated MS frame with " +
          "insulated panels can be built to widths a shipping container cannot, which matters for " +
          "workstation layouts.",
      },
      {
        title: "Insulation for the climate",
        text:
          "Rockwool is non-combustible mineral wool; PUF panels give high insulation for their " +
          "thickness. Either is far more comfortable than a bare steel wall in direct sun.",
      },
      {
        title: "Access and placement on site",
        text:
          "The unit arrives on a truck and is lifted into place, so plan a firm, level base and a clear " +
          "path for the truck and crane before dispatch.",
      },
    ],
    faqs: (f) => [
      {
        question: "What is the difference between a site office container and a portable cabin?",
        answer:
          "Both are factory-built and relocatable. A site office container is fitted out as a " +
          "workplace from the start, with wiring, lighting, socket points, windows and an office-grade " +
          "floor, and is sized for a project team. A portable cabin covers a wider range of uses, from " +
          "guard posts to bunkhouses. If your requirement is an office, compare the models in this " +
          "category first; for other uses, see the Portable Cabins category.",
      },
      priceFaq(f, "site office container"),
      deliveryFaq(f, "site office container"),
      {
        question: "Does a site office container need a foundation?",
        answer:
          "A single unit normally needs a firm, level base rather than a building foundation, such as " +
          "compacted ground, a PCC bed or block plinths under the support points, with drainage so " +
          "water does not collect under the floor. Our installation and site preparation guide covers " +
          "what to have ready before the unit arrives.",
      },
      {
        question: "Can the office be moved to the next project?",
        answer:
          "Yes. The units are built to be lifted by crane and carried on a truck, so the same office " +
          "can follow the project. Disconnect the power supply, secure or remove loose furniture, and " +
          "plan crane access at both the old and the new location.",
      },
      {
        question: "Can I add a toilet, pantry or extra partitions?",
        answer:
          "Yes, as a custom build. Toilets, pantry counters, partitions and additional AC points change " +
          "the plumbing and electrical layout, so they are quoted in writing rather than added at " +
          "checkout. Send the layout you need through the enquiry form on this page.",
      },
      {
        question: "Is an air conditioner included?",
        answer:
          "Check the model's specification. Where AC is mentioned, it means provision (wall openings, " +
          "wiring and power points) rather than the air-conditioning units themselves, which are " +
          "supplied only when they are included in a quotation.",
      },
    ],
    enquiryNoun: "site office container",
  },

  "security-cabins": {
    heading: "Choosing a Security Cabin for Your Gate",
    metaDescription: () =>
      "Compare security cabins and guard rooms by size, build and fixed GST-inclusive price. " +
      "Factory-built MS and PUF-insulated cabins for gates, campuses and sites.",
    intro: (f) => [
      "A security cabin is occupied for long shifts, in the sun, at the busiest point of a site: the " +
        "gate. The things that decide whether it works are a clear view of every approach, a counter " +
        "for the visitor register, shade and ventilation, and a structure that stands up to weather " +
        "and the occasional knock from a vehicle.",
      `This category lists the security cabins we sell online, ${countWord(f.modelCount, "model")} at ` +
        `fixed prices that include ${f.gst} GST. Compare the size and build below. For a booth in a ` +
        "different size, a checkpoint layout or several cabins for a multi-gate campus, send the " +
        "requirement through the enquiry form further down.",
    ],
    applicationsHeading: "Where security cabins are used",
    applications: [
      {
        title: "Factory and warehouse gates",
        text: "Visitor and vehicle logging, material gate passes and shift handover at the main entrance.",
      },
      {
        title: "Residential complexes",
        text: "A permanent-looking guard room at apartment and villa-community gates without civil work.",
      },
      {
        title: "Construction site entrances",
        text: "A cabin that can be lifted and moved when the site entrance shifts as the project progresses.",
      },
      {
        title: "Parking areas and checkpoints",
        text: "Ticketing, barrier control and checkpoints where the post needs all-round visibility.",
      },
    ],
    choosingHeading: "What to check before you buy",
    choosing: [
      {
        title: "Visibility",
        text: "Count the approaches the guard must watch and make sure each one faces glazing, not a blank wall.",
      },
      {
        title: "Who and what goes inside",
        text:
          "One guard with a register needs far less room than a post with two guards, a CCTV monitor " +
          "and lockers. Size the cabin to what it must hold.",
      },
      {
        title: "Heat",
        text:
          "Insulated walls and roof, cross-ventilation and an AC provision make the difference on an " +
          "exposed gate. An uninsulated steel box is hard to occupy through an afternoon shift.",
      },
      {
        title: "Placement",
        text:
          "Leave the cabin clear of the gate's swing and the vehicle path, on a level base with a power " +
          "supply nearby.",
      },
    ],
    faqs: (f) => [
      {
        question: "What size security cabin do I need?",
        answer:
          "Decide what has to fit inside first: one guard and a register desk, or two guards, a CCTV " +
          "monitor and lockers. Then compare the sizes in the table above. Leave room around the cabin " +
          "for the gate's swing and the vehicle path.",
      },
      {
        question: "Should I choose an MS or a PUF-insulated security cabin?",
        answer:
          "MS construction is robust and economical. PUF-insulated walls keep the interior noticeably " +
          "cooler in direct sun, which matters on an exposed gate. Each model's build is stated in the " +
          "Construction column above. Warranty periods depend on the build material and are set out in " +
          "our warranty policy.",
      },
      priceFaq(f, "security cabin"),
      deliveryFaq(f, "security cabin"),
      {
        question: "Can a security cabin be moved later?",
        answer:
          "Yes. The cabins are factory-built as single units and can be lifted onto a truck and placed " +
          "at a new gate. Disconnect the power supply first and plan lifting access at both locations.",
      },
      {
        question: "Can the cabin be finished in our corporate colours?",
        answer:
          "Yes, as a custom order. Colours, logo panels and signage are agreed in writing with the " +
          "quotation, so use the enquiry form with your brand requirements.",
      },
    ],
    enquiryNoun: "security cabin",
  },

  "portable-toilet-cabins": {
    heading: "Portable Toilet Cabins for Sites, Camps and Events",
    metaDescription: () =>
      "Factory-built portable toilet block with ceramic fittings and its own tanks, at a fixed " +
      "GST-inclusive price. Custom toilet cabins built to order.",
    intro: (f) => [
      "Site toilets are judged on three things: whether people will use them, whether they can be " +
        "cleaned quickly, and whether the water and waste capacity matches the headcount. A " +
        "factory-built toilet cabin settles all three before it arrives, because the fittings, " +
        "ventilation and tanks are installed in the factory rather than improvised on site.",
      `${f.modelCount === 1 ? "One configuration is" : `${f.modelCount} configurations are`} sold online ` +
        `at a fixed price that includes ${f.gst} GST, shown in the table below. Other formats, such as ` +
        "single-seat units, bathing blocks or a toilet attached to an office or accommodation cabin, " +
        "are built to order. Our portable toilet cabin guide explains the types, and the enquiry form " +
        "below takes your requirement.",
    ],
    applicationsHeading: "Where portable toilet cabins are used",
    applications: [
      {
        title: "Construction sites",
        text: "Toilets that can be placed near the work area from day one and moved as the site changes.",
      },
      {
        title: "Labour camps",
        text: "Sanitation blocks planned alongside dormitories so the colony works as one layout.",
      },
      {
        title: "Events and temporary gatherings",
        text: "Clean, enclosed toilets for venues that have no permanent facilities of their own.",
      },
      {
        title: "Factories during expansion",
        text: "Extra capacity during shutdowns, expansions or while permanent washrooms are rebuilt.",
      },
    ],
    choosingHeading: "How to plan toilet capacity",
    choosing: [
      {
        title: "Headcount and shifts",
        text:
          "Count the people on site at the busiest time, check the ratio your project is bound by, " +
          "and order enough seats for it.",
      },
      {
        title: "Water and waste",
        text:
          "Decide whether the block will run on its own tanks, with tanker refills and scheduled " +
          "emptying, or be connected to a water supply and drain on site.",
      },
      {
        title: "Separate facilities",
        text: "Plan separate units for men and women, with privacy screening and lighting for night use.",
      },
      {
        title: "Placement and servicing",
        text:
          "Place the block on a level base with drainage and leave a route for the water tanker and " +
          "the vehicle that empties the tank.",
      },
    ],
    faqs: (f) => [
      {
        question: "How many toilet seats does my site need?",
        answer:
          "It depends on your peak headcount and the sanitation ratio your project is required to meet " +
          "under the rules that apply to it. Work out the number of seats from that ratio, then add a " +
          "margin for shift overlaps. Tell us the headcount in the enquiry form if you want the blocks " +
          "planned with you.",
      },
      {
        question: "Does the toilet block need a sewer connection?",
        answer:
          "Not necessarily. The block sold online is supplied with its own water tank and septic tank " +
          "(capacities are on the product page), so it can work on a site without mains. If a water " +
          "supply or drain is available, mention it in your enquiry so connection points can be planned.",
      },
      priceFaq(f, "toilet cabin"),
      deliveryFaq(f, "toilet cabin"),
      {
        question: "What other portable toilet types do you make?",
        answer:
          "Besides the block sold online, MS, GI, FRP and bio-toilet formats are built to order. Our " +
          "portable toilet cabin guide describes each type; these are priced in a written quotation.",
      },
      {
        question: "How is a portable toilet cabin maintained?",
        answer:
          "Clean the wipe-clean surfaces and sanitaryware daily, keep the exhaust fans running, refill " +
          "the water tank as needed and have the septic tank emptied at intervals that suit its usage. " +
          "Check door closers, taps and lighting during routine site inspections.",
      },
    ],
    enquiryNoun: "toilet cabin",
  },

  "cargo-storage-shipping-containers": {
    heading: "Shipping and Storage Containers: Compare Grade, Size and Price",
    metaDescription: (f) =>
      `Compare ${f.modelCount} shipping and storage container listings by grade, size and fixed ` +
      `GST-inclusive price: used, refurbished and new 20 ft units, plus monthly rental.`,
    intro: (f) => [
      "This category covers the steel containers we supply for storage and conversion, from used " +
        "units sold as seen for basic dry storage to refurbished and new containers and painted units " +
        "for retail use. The listings differ mainly in condition grade, size and finish, and those " +
        "three decide the price far more than anything else.",
      `${f.outrightCount === 1 ? "The outright-sale listing has" : `All ${f.outrightCount} outright-sale listings have`} ` +
        `one fixed price that includes ${f.gst} GST, which is what you pay at checkout.` +
        (f.rental
          ? ` The rental listing is priced per month (${f.rental.priceLabel}) and is booked online as the first month's rent.`
          : "") +
        " Containers converted into offices, homes or cafés are priced by quotation.",
    ],
    applicationsHeading: "What the containers are used for",
    applications: [
      {
        title: "Secure storage on site",
        text: "Lockable, weather-tight storage for cement, tools, fittings and equipment on a project.",
      },
      {
        title: "Warehouse and factory overflow",
        text: "Extra storage that can be placed in a yard in a day and removed when it is no longer needed.",
      },
      {
        title: "A base for conversion",
        text: "The shell for an office, kiosk, café or accommodation unit, where a sound floor and straight panels matter most.",
      },
      {
        title: "Farm and rural storage",
        text: "Dry storage for produce, feed and machinery where a permanent shed is not justified.",
      },
    ],
    choosingHeading: "How to choose a container",
    choosing: [
      {
        title: "Understand the condition grade",
        text:
          "One-trip containers have made a single export voyage and are close to new. Cargo-worthy units " +
          "are structurally fit to carry cargo. Wind and water tight units keep weather out and suit " +
          "storage but are not certified for shipping. As-is units are sold as seen and may need repair.",
      },
      {
        title: "20 ft or 40 ft",
        text:
          "A standard 20 ft container holds roughly 33 cubic metres and a 40 ft roughly 67. The 20 ft is " +
          "easier to place on a tight site; the 40 ft is better value per cubic metre where there is room.",
      },
      {
        title: "Storage or conversion",
        text:
          "For storage, weather-tightness and secure doors matter most. For conversion into an office or " +
          "kiosk, choose a better grade so the floor and walls need less repair before fit-out.",
      },
      {
        title: "Delivery access",
        text:
          "A container arrives on a trailer and is lifted or slid into place. Check the road, the turning " +
          "space and overhead cables on the way in.",
      },
    ],
    faqs: (f) => [
      {
        question: "What does wind and water tight (WWT) mean?",
        answer:
          "A wind and water tight container keeps rain and wind out and is suitable for storage, but it " +
          "is not certified to carry cargo at sea. A cargo-worthy container has passed the structural " +
          "standard for shipping, and a one-trip container has made only a single export voyage.",
      },
      {
        question: "Why do the 20 ft listings have different prices?",
        answer:
          "Because they are different grades. Most of the 20 ft listing names state the grade (as-is, " +
          "wind and water tight, cargo-worthy or refurbished), and the price follows the condition of " +
          "the steel, the doors and the floor. Compare the grade in each listing before comparing prices.",
      },
      {
        question: "Should I buy a 20 ft or a 40 ft container?",
        answer:
          "Choose by volume and site space. A standard 20 ft container holds roughly 33 cubic metres and " +
          "a 40 ft roughly 67. The 20 ft is easier to deliver and place on a tight site; the 40 ft gives " +
          "more storage per unit where there is room for the trailer and the container.",
      },
      ...(f.rental
        ? [
            {
              question: "Can I rent a container instead of buying one?",
              answer:
                `Yes. The rental listing is priced at ${f.rental.priceLabel}, booked online as the first ` +
                "month's rent. Longer terms and different sizes are agreed in writing.",
            },
          ]
        : []),
      priceFaq(f, "container"),
      {
        question: "Does a container need a foundation?",
        answer:
          "Not a building foundation, but it should sit level on a firm base, commonly concrete blocks " +
          "under the corner castings, so the floor stays clear of standing water and the doors open and " +
          "close square.",
      },
      {
        question: "Can a container be converted into an office or kiosk?",
        answer:
          "Yes. Conversions add insulation, windows, doors, electrical work and interior finishes, so " +
          "they are priced by quotation. Our Container Offices category lists the office units we build.",
      },
    ],
    enquiryNoun: "container",
  },

  "g1-workmen-accommodation": {
    heading: "Multi-Storey Workmen Accommodation and Labour Colonies",
    metaDescription: () =>
      "Multi-storey workmen accommodation and labour colony blocks in modular steel. Compare priced " +
      "configurations or send your headcount for a site layout.",
    intro: (f) => [
      "When a project has to house a large workforce on limited land, building upwards is the " +
        "practical answer. The accommodation in this category is modular steel construction designed " +
        "for multi-storey blocks, with dormitories, toilets, kitchens and dining space planned as one " +
        "colony rather than as scattered single cabins.",
      `${f.modelCount === 2 ? "Both listings are" : `The ${countWord(f.modelCount, "listing")} are`} priced ` +
        `for the configuration shown in the Size column and can be bought online at that fixed price, ` +
        `which includes ${f.gst} GST. Most colonies are planned around the site, because headcount, ` +
        "land shape and the toilet and kitchen requirement change the layout, so larger or different " +
        "configurations are quoted in writing after we review your plan.",
    ],
    applicationsHeading: "Where workmen accommodation is used",
    applications: [
      {
        title: "Construction and infrastructure projects",
        text: "Metro, highway and building projects that need to house a workforce close to the site.",
      },
      {
        title: "Industrial plants",
        text: "Shutdown, maintenance and expansion crews at refineries, factories and process plants.",
      },
      {
        title: "Remote EPC and energy sites",
        text: "Solar, wind and transmission projects far from towns, where rented housing is not available.",
      },
      {
        title: "Staff housing",
        text: "Longer-term accommodation for factory and estate staff on the employer's own land.",
      },
    ],
    choosingHeading: "Planning a colony",
    choosing: [
      {
        title: "Headcount and bed type",
        text: "Bunk beds or single beds change the floor area per person more than any other decision.",
      },
      {
        title: "Facilities",
        text:
          "Plan toilets, bathing areas, kitchen, dining, drinking water and laundry together with the " +
          "dormitories, not afterwards.",
      },
      {
        title: "Land and storeys",
        text:
          "A ground-plus-one block needs about half the land of a single-storey layout, and a " +
          "ground-plus-two block about a third, but each floor needs stair access, safe walkways and " +
          "clear escape routes.",
      },
      {
        title: "Project duration",
        text:
          "Modular steel blocks can be dismantled and re-erected, so a colony planned for relocation " +
          "can serve the next project too.",
      },
    ],
    faqs: (f) => [
      {
        question: "What is the difference between the listings in this category?",
        answer:
          "They are priced for different configurations: " +
          f.models.map((m) => `${m.name} is listed as ${m.size}`).join("; ") +
          ". Each product page sets out what its configuration includes.",
      },
      {
        question: "How many workers can a colony house?",
        answer:
          "It depends on the bed layout and the facilities you include. Give us the headcount, the bed " +
          "type and your toilet and kitchen requirement in the enquiry form, and the blocks are sized to " +
          "suit.",
      },
      {
        question: "Can the accommodation be relocated after the project?",
        answer:
          "Yes. The structure is modular steel, so blocks can be dismantled, transported and re-erected " +
          "at another site. Some consumable items, such as sealants and floor finishes, are normally " +
          "renewed when a block is re-erected.",
      },
      {
        question: "Are toilets and kitchens included?",
        answer:
          "Each product page states what its priced configuration includes. Additional toilet blocks, " +
          "kitchens or dining halls are added to the colony layout and quoted in writing.",
      },
      priceFaq(f, "workmen accommodation"),
      {
        question: "Do I need approvals for a labour colony?",
        answer:
          "Requirements depend on the state, the local authority and your project's own contract and " +
          "safety conditions. Check them with your project's statutory and safety team before the " +
          "layout is finalised.",
      },
    ],
    enquiryNoun: "accommodation block",
  },

  "prefab-homes": {
    heading: "Prefab Homes: Steel-Framed Houses Installed on Your Land",
    metaDescription: () =>
      "Steel-framed prefab homes at fixed GST-inclusive prices, installed on a foundation prepared " +
      "on your land. Compare plans and floor areas, or request a layout.",
    intro: (f) => [
      "A prefab home is built from a steel frame and factory-made wall, roof and floor elements, then " +
        "assembled on a foundation prepared on your land. Because most of the work happens in the " +
        "factory, the time spent building on site is far shorter than for a brick-and-concrete house.",
      `${f.modelCount === 2 ? "Two home designs are" : `${countWord(f.modelCount, "home design")} are`} sold ` +
        `online at a fixed price that includes ${f.gst} GST for the configuration shown below. The ` +
        "foundation and site services are prepared before installation, and changes to the plan, " +
        "finishes or size are priced in a written quotation. If you would rather build a conventional " +
        "RCC house on your plot, see our home construction services.",
    ],
    applicationsHeading: "Where prefab homes are used",
    applications: [
      {
        title: "Farmhouses and weekend homes",
        text: "A finished home on agricultural or rural land without a long construction programme.",
      },
      {
        title: "Resort and homestay cottages",
        text: "Guest accommodation that can be added in phases as bookings grow.",
      },
      {
        title: "Staff quarters",
        text: "Housing for managers and staff on factory, estate and plantation land.",
      },
      {
        title: "An additional home on an existing plot",
        text: "A separate dwelling for family members where the main house already stands.",
      },
    ],
    choosingHeading: "Before you order a prefab home",
    choosing: [
      {
        title: "Plan and floor area",
        text: "Compare bedrooms, bathrooms and floor area in the table against how the home will actually be used.",
      },
      {
        title: "Approvals",
        text:
          "Building rules depend on the location and the land use. Check with your local authority or " +
          "panchayat before ordering.",
      },
      {
        title: "Foundation and services",
        text:
          "The foundation, water supply, power connection and drainage or septic system are prepared " +
          "before the home is installed.",
      },
      {
        title: "Climate",
        text: "Insulation, roof design and window placement decide how comfortable a steel-framed home is in summer.",
      },
    ],
    faqs: (f) => [
      {
        question: "Does a prefab home need a foundation?",
        answer:
          "Yes. A prefab home is installed on a foundation prepared on your land before the home arrives. " +
          "The foundation and the water, power and drainage connections are planned with the order.",
      },
      {
        question: "Do I need building approval for a prefab home?",
        answer:
          "Rules depend on the location and the land use, so check with your local authority or " +
          "panchayat before you order.",
      },
      {
        question: "What is the difference between the home designs listed here?",
        answer:
          "They differ in plan and size: " +
          f.models.map((m) => `${m.name} is listed as ${m.size}${m.area ? ` (${m.area})` : ""}`).join("; ") +
          ". Each product page lists the rooms, finishes and specification of its design.",
      },
      priceFaq(f, "prefab home"),
      {
        question: "Can I change the layout or finishes?",
        answer:
          "Yes, as a custom build. Room layout, finishes, glazing and size changes are priced in a written " +
          "quotation; send your plan or requirement through the enquiry form.",
      },
      {
        question: "How does a prefab home compare with an RCC house?",
        answer:
          "A prefab home spends most of its build time in the factory, so the site work is much shorter " +
          "and the structure is lighter. An RCC house is built in place over a longer programme. Both " +
          "last when they are designed and maintained properly; the choice usually comes down to time, " +
          "site conditions and how permanent the home needs to be.",
      },
    ],
    enquiryNoun: "prefab home",
  },
};

/** Category slugs that render the shared landing section (used by scripts/category-landings.test.ts). */
export const CATEGORY_LANDING_SLUGS = Object.keys(LANDING_COPY);

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  RESOLUTION — computed from the merged catalogue the page already loaded
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

const AREA_SPEC = /^(floor area|total area|built-?up area|carpet area)$/i;

/** The category's models, in comparison order: outright sales by price, then rentals, then unpriced. */
export function categoryModels(slug: string, products: Product[]): CategoryModel[] {
  const rows = products
    .filter((p) => p.categorySlug === slug)
    .map((p): CategoryModel => {
      const c = getCommerce(p.id);
      const size = c?.size || p.specifications?.find((s) => /^(dimensions?|size)/i.test(s.label))?.value || "—";
      const areaSpec = p.specifications?.find((s) => AREA_SPEC.test(s.label.trim()))?.value;
      const purchasable = isPurchasable(p.id) && !!c;
      const price = purchasable ? sellPrice(c.basePrice) : undefined;
      return {
        id: p.id,
        name: c?.h1Title || p.name,
        path: getProductDetailPath(p),
        size,
        area: areaSpec && !/sq\.?\s?ft/i.test(size) ? areaSpec : undefined,
        construction: c?.material || "—",
        bestFor: c?.bestFor || "—",
        priceInr: price,
        priceLabel: price !== undefined ? `${formatINR(price)}${priceUnitSuffix(p.id)}` : undefined,
        rental: isRentalPrice(p.id),
      };
    });
  const rank = (m: CategoryModel) => (m.priceInr === undefined ? 2 : m.rental ? 1 : 0);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.priceInr ?? 0) - (b.priceInr ?? 0));
}

function transportRows(): TransportRow[] {
  return SHIPPING_ZONES.map((zone) => ({
    zone: zone.name,
    areas: zone.description,
    charge: zone.rate === 0 ? "Free" : formatINR(zone.rate),
    transit: `${zone.transitDaysMin}–${zone.transitDaysMax} days`,
  }));
}

function facts(slug: string, categoryName: string, products: Product[]): CategoryFacts {
  const models = categoryModels(slug, products);
  const local = SHIPPING_ZONES[0];
  const farthest = SHIPPING_ZONES[SHIPPING_ZONES.length - 1];
  return {
    categoryName,
    models,
    modelCount: models.length,
    outrightCount: models.filter((m) => isOutrightSale(m.id)).length,
    rental: models.find((m) => m.rental && m.priceLabel),
    dispatch: `${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`,
    installation: formatINR(INSTALLATION.rate),
    gst: GST_PERCENT_LABEL,
    localTransit: `${local.transitDaysMin}–${local.transitDaysMax} days`,
    farthestTransit: `${farthest.transitDaysMin}–${farthest.transitDaysMax} days`,
    farthestZone: farthest.name.replace(/^Zones*d+s*[—-]s*/, "").replace(/^Rest/, "the rest"),
  };
}

/**
 * Everything the landing section, its FAQPage JSON-LD and its summary ItemList need, resolved ONCE
 * from the merged catalogue. The page computes this and passes the same object to the renderer and
 * to the schema builders, so the visible FAQ and the FAQPage markup are the same array.
 */
export function resolveCategoryLanding(
  slug: string,
  products: Product[],
  categories: Category[],
): ResolvedCategoryLanding | undefined {
  const copy = LANDING_COPY[slug];
  const category = categories.find((c) => c.slug === slug);
  if (!copy || !category) return undefined;
  const f = facts(slug, category.name, products);
  if (f.modelCount === 0) return undefined;
  const links = CATEGORY_LINKS[slug];
  return {
    slug,
    categoryName: category.name,
    heading: copy.heading,
    intro: copy.intro(f),
    applicationsHeading: copy.applicationsHeading,
    applications: copy.applications,
    choosingHeading: copy.choosingHeading,
    choosing: copy.choosing,
    faqs: copy.faqs(f),
    enquiryNoun: copy.enquiryNoun,
    models: f.models,
    transport: transportRows(),
    dispatch: f.dispatch,
    installation: {
      label: INSTALLATION.label,
      charge: formatINR(INSTALLATION.rate),
      description: INSTALLATION.description,
    },
    gst: f.gst,
    links,
    relatedCategories: links.relatedCategorySlugs
      .map((s) => categories.find((c) => c.slug === s))
      .filter((c): c is Category => !!c)
      .map((c) => ({ name: c.name, href: `/products/category/${c.slug}`, description: c.description })),
  };
}

/** Meta description for a category with a landing section, or undefined. */
export function categoryLandingMetaDescription(
  slug: string,
  products: Product[],
  categoryName: string,
): string | undefined {
  const copy = LANDING_COPY[slug];
  if (!copy) return undefined;
  const f = facts(slug, categoryName, products);
  return f.modelCount > 0 ? copy.metaDescription(f) : undefined;
}
