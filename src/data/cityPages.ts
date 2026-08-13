/**
 * CITY / AREA LANDING PAGES — data-driven SEO pages under /cities-we-serve/<slug>.
 *
 * One entry here = one fully server-rendered landing page (route: app/(site)/cities-we-serve/[slug]),
 * with exact meta title/description, FAQPage + breadcrumb JSON-LD and a sitemap entry — no code
 * changes needed to add the next city. Copy is the approved SEO text for that location.
 *
 * RULES (site-wide, non-negotiable):
 *  · NO ₹ figures in this copy — pricing questions always route to a quotation (GMC safety).
 *  · No manufacturing-location claims beyond what the site already states elsewhere.
 */

export interface CityPageFaq {
  question: string;
  answer: string;
}

export interface CityPageListItem {
  /** Bold lead-in (optional). */
  title?: string;
  text: string;
}

export interface CityPage {
  /** URL slug under /cities-we-serve/, e.g. "container-office-in-jigani". */
  slug: string;
  city: string;
  /** EXACT meta title (rendered absolute — no site-name suffix appended). */
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  /** geo meta for the local page (position "lat;lng", icbm "lat, lng"). */
  geo: { region: string; placename: string; position: string; icbm: string };

  /** Hero image (also the page's og:image). Root-relative path under /public. */
  heroImage: { src: string; alt: string; width: number; height: number };
  /** Optional second image shown beside the customization section. */
  interiorImage?: { src: string; alt: string; width: number; height: number };
  /** Optional gallery (rendered as a grid after the features section). */
  gallery?: { src: string; alt: string; width: number; height: number }[];

  h1: string;
  tagline: string;
  intro: string[];

  whyHeading: string;
  whyIntro: string;
  whyBullets: CityPageListItem[];

  solutionsHeading: string;
  solutionsIntro: string;
  solutions: CityPageListItem[];

  featuresHeading: string;
  featuresIntro: string;
  features: string[];
  sizesNote: string;

  industriesHeading: string;
  industriesIntro: string;
  industries: CityPageListItem[];

  customHeading: string;
  customIntro: string;
  customBullets: CityPageListItem[];
  customOutro: string;

  whyUsHeading: string;
  whyUsIntro: string;
  whyUsBullets: CityPageListItem[];

  areasHeading: string;
  areasText: string;

  howHeading: string;
  howSteps: CityPageListItem[];

  faqs: CityPageFaq[];

  ctaHeading: string;
  ctaText: string;
}

export const CITY_PAGES: CityPage[] = [
  {
    slug: "container-office-in-jigani",
    city: "Jigani",
    metaTitle: "Container Office in Jigani",
    metaDescription:
      "Looking for a container office in Jigani? Portable Office Cabin delivers ready-to-use, customized container offices with fast installation. Call us today!",
    keywords:
      "Container Office in Jigani, prefab office container Jigani, site office container Jigani, container office manufacturer Jigani, office container on rent Jigani",
    geo: { region: "IN-KA", placename: "Jigani, Bengaluru, Karnataka, India", position: "12.7861;77.6386", icbm: "12.7861, 77.6386" },

    heroImage: {
      src: "/images/cities/container-office-in-jigani.webp",
      alt: "Container office in Jigani — ready-to-use portable container office with lockable door and sliding windows by Portable Office Cabin",
      width: 1024,
      height: 1024,
    },
    interiorImage: {
      src: "/images/cities/container-office-in-jigani-interior.webp",
      alt: "Inside a customized container office — laminated wall panels, wooden-finish false ceiling, vinyl flooring and ceiling fans",
      width: 1024,
      height: 1024,
    },
    gallery: [
      {
        src: "/images/cities/container-office-in-jigani-entrance-view.webp",
        alt: "Container office for Jigani with lockable entrance door, digital lock and sliding windows — corner view",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/cities/container-office-in-jigani-side-view.webp",
        alt: "Side elevation of a portable container office for Jigani — door and two sliding windows with safety mesh",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/cities/container-office-in-jigani-angle-view.webp",
        alt: "Weatherproof steel container office cabin for Jigani industrial sites — angled exterior view",
        width: 1024,
        height: 1024,
      },
    ],

    h1: "Container Office in Jigani",
    tagline: "Ready-to-Use Container Offices in Jigani by Portable Office Cabin",
    intro: [
      "If you are searching for a reliable container office in Jigani, Portable Office Cabin is your trusted partner. We design, manufacture, and deliver high-quality container offices that are ready to use from day one. Whether you need a site office for a construction project, an admin cabin for your factory, or a comfortable workspace inside an industrial unit, our container offices give you a professional, secure, and fully functional office — without the time and cost of civil construction.",
      "Jigani is one of the fastest-growing industrial hubs on the southern edge of Bengaluru. With the Jigani Industrial Area, Jigani-Bommasandra Link Road, and hundreds of manufacturing units, warehouses, pharma companies, and granite processing facilities operating in the region, the demand for quick, flexible, and movable office space is higher than ever. That is exactly what our container offices deliver: a durable steel workspace that can be transported, installed, and occupied within days — not months.",
    ],

    whyHeading: "Why Businesses in Jigani Choose Container Offices",
    whyIntro:
      "Traditional brick-and-mortar office construction takes months, requires approvals, blocks capital, and cannot be moved once built. A container office solves all of these problems at once. Here is why factories, contractors, and businesses across Jigani are switching to container offices:",
    whyBullets: [
      { title: "Fast installation", text: "Your office is manufactured at our facility and delivered to your site ready to use. In most cases, you can start working inside your new container office within a few days of placing the order." },
      { title: "Cost-effective", text: "A container office costs a fraction of conventional construction. There is no foundation work, no long labour engagement, and no material wastage on site." },
      { title: "Completely movable", text: "When your project in Jigani ends or your site shifts, your office moves with you. Simply load it onto a truck and relocate it to your next site — your investment is never wasted." },
      { title: "Durable and secure", text: "Built with heavy-duty steel structures, our container offices withstand harsh sun, heavy monsoon rain, and dust-heavy industrial environments. Lockable doors and strong walls keep your documents, computers, and equipment safe." },
      { title: "Professional appearance", text: "A neat, well-finished container office creates the right impression for clients, auditors, and visitors at your site." },
    ],

    solutionsHeading: "Our Container Office Solutions in Jigani",
    solutionsIntro:
      "At Portable Office Cabin, we manufacture a complete range of container offices to suit every requirement and budget in Jigani:",
    solutions: [
      { title: "Standard Container Office", text: "A ready-made office cabin with insulated walls, flooring, windows, lockable door, and electrical fittings. Ideal for site supervisors, project managers, and small admin teams." },
      { title: "Customized Container Office", text: "Designed to your exact specifications — choose the size, layout, number of rooms, partitions, doors, windows, and finishes. We build offices with cabins for managers, workstations for staff, meeting areas, and reception spaces." },
      { title: "Air-Conditioned Executive Office Container", text: "A premium option with full insulation, AC provision, laminated interiors, false ceiling, and modern lighting — perfect for client-facing offices, marketing offices, and executive cabins at industrial sites in Jigani." },
      { title: "Site Office with Toilet Attachment", text: "A practical combination unit that includes an office space along with an attached toilet and pantry area, ideal for construction sites and remote locations where separate facilities are not available." },
      { title: "Multi-Room Office Container", text: "Larger units with multiple cabins, conference space, and storage — suitable for companies running long-term projects in Jigani Industrial Area, Bommasandra, and surrounding zones." },
      { title: "Container Office on Rent", text: "Need an office only for the duration of a project? We also offer container offices on a rental basis, so you get a fully functional workspace without capital investment." },
    ],

    featuresHeading: "Features and Specifications",
    featuresIntro: "Every container office we deliver in Jigani is built for Indian industrial conditions and comes with:",
    features: [
      "Heavy-duty steel frame structure with anti-corrosive treatment",
      "Insulated wall panels (PUF / EPS / Rockwool options) for heat and sound control",
      "Strong flooring with plywood, cement board, or vinyl finish options",
      "Aluminium / UPVC windows with safety grills",
      "Lockable steel or flush doors",
      "Complete electrical wiring with lights, fans, switches, and sockets",
      "Provision for air conditioning, networking, and CCTV",
      "Weatherproof and leak-proof roofing",
      "Optional attached toilet, pantry, and storage sections",
    ],
    sizesNote:
      "Popular sizes: 10x10 ft, 20x10 ft, 30x10 ft, and 40x10 ft container offices. Custom sizes are available on request — tell us your requirement and we will build it.",

    industriesHeading: "Industries We Serve in and around Jigani",
    industriesIntro: "Our container offices are trusted by a wide range of industries operating in the Jigani belt:",
    industries: [
      { title: "Construction & infrastructure companies", text: "site offices, engineer cabins, labour supervisor cabins" },
      { title: "Manufacturing units & factories", text: "admin offices, HR cabins, security-cum-office cabins" },
      { title: "Pharma & biotech companies", text: "temporary offices during plant expansion" },
      { title: "Granite & stone processing units", text: "dust-resistant office cabins" },
      { title: "Warehouses & logistics parks", text: "dispatch offices, billing counters, supervisor cabins" },
      { title: "Real estate developers", text: "marketing offices and sales galleries at project sites" },
      { title: "Solar and energy projects", text: "control room and site office containers" },
    ],

    customHeading: "Fully Customizable — Built the Way You Want",
    customIntro:
      "No two businesses are the same, and neither are our container offices. When you order a container office in Jigani from Portable Office Cabin, you can customize:",
    customBullets: [
      { title: "Size and layout", text: "single room, multi-room, open workspace, or cabin-style" },
      { title: "Interiors", text: "laminated panels, false ceiling, modular flooring" },
      { title: "Furniture provision", text: "tables, chairs, storage cabinets, workstations" },
      { title: "Electricals", text: "extra points for AC, servers, printers, and machinery interfaces" },
      { title: "Exterior finish", text: "company colours, branding, logo, and signage" },
      { title: "Add-ons", text: "attached toilet, pantry, ramp, staircase, and awnings" },
    ],
    customOutro: "Share your requirement with our team, and we will provide a design and quotation that fits your budget.",

    whyUsHeading: "Why Choose Portable Office Cabin?",
    whyUsIntro: "There are many suppliers, but here is why customers across Jigani and Bengaluru choose Portable Office Cabin:",
    whyUsBullets: [
      { title: "Direct manufacturer", text: "no middlemen, which means better pricing and full quality control." },
      { title: "Quality materials", text: "we use tested steel, branded insulation, and reliable electrical fittings." },
      { title: "Fast delivery and installation in Jigani", text: "our team handles transport, unloading, and placement at your site." },
      { title: "Custom designs", text: "from a basic watchman-cum-office cabin to a fully furnished AC executive office." },
      { title: "Buy or rent options", text: "flexible plans for short-term projects and long-term use." },
      { title: "After-sales support", text: "we stand behind every cabin we deliver with prompt service support." },
      { title: "Experience", text: "years of expertise in manufacturing portable cabins, container offices, security cabins, bunk houses, and portable toilets." },
    ],

    areasHeading: "Areas We Serve Near Jigani",
    areasText:
      "Along with Jigani and Jigani Industrial Area, we deliver container offices across the entire South Bengaluru industrial corridor, including Bommasandra, Anekal, Attibele, Electronic City, Chandapura, Hebbagodi, Hosur Road, Bannerghatta Road, Harohalli, and Sarjapur. Wherever your site is, our team can deliver and install your container office quickly and safely.",

    howHeading: "How It Works — From Enquiry to Installation",
    howSteps: [
      { title: "Share your requirement", text: "call or WhatsApp us with your size, layout, and usage details." },
      { title: "Get a free quotation", text: "we send you the design options and transparent pricing." },
      { title: "Manufacturing", text: "your container office is fabricated at our facility with strict quality checks." },
      { title: "Delivery & installation at your Jigani site", text: "we transport the cabin, place it, and hand it over ready to use." },
    ],

    faqs: [
      { question: "What is the price of a container office in Jigani?", answer: "The price depends on the size, insulation type, interior finish, and add-ons you choose. A basic cabin costs much less than a fully furnished AC office container. Contact us with your requirement and we will share an exact quotation — with no hidden charges." },
      { question: "How long does it take to deliver a container office in Jigani?", answer: "Standard cabins can typically be delivered within a few days. Customized container offices usually take 1–3 weeks depending on the specifications. Delivery and installation at your Jigani site are handled by our team." },
      { question: "Can I rent a container office instead of buying one?", answer: "Yes. We offer container offices on rent for project-based requirements. This is a popular option for construction companies and contractors working on short-term projects in and around Jigani." },
      { question: "Do container offices get hot in summer?", answer: "No. Our cabins are built with insulated panels (PUF/EPS/Rockwool) that keep the interior significantly cooler. With AC provision, the cabin stays comfortable throughout the year." },
      { question: "Can the container office be shifted to another site later?", answer: "Absolutely. Portability is one of the biggest advantages. The cabin can be lifted, loaded onto a truck, and relocated to any new site whenever needed." },
      { question: "What sizes are available?", answer: "Popular sizes are 10x10, 20x10, 30x10, and 40x10 ft. We also manufacture custom sizes based on your site and seating requirements." },
      { question: "Do you provide toilets and pantry along with the office?", answer: "Yes. We can build combination units with an attached toilet and pantry, or supply separate portable toilet units along with your container office." },
      { question: "Is any foundation required at my site?", answer: "No major civil foundation is needed. The cabin can be placed on a level surface or simple concrete blocks. Our team will guide you on site preparation before delivery." },
    ],

    ctaHeading: "Get Your Container Office in Jigani Today",
    ctaText:
      "Ready to set up a smart, secure, and professional workspace at your site? Portable Office Cabin is just a call away. Get a free consultation and quotation for your container office in Jigani — buy or rent, standard or fully customized.",
  },
];

export function cityPageBySlug(slug: string): CityPage | undefined {
  return CITY_PAGES.find((c) => c.slug === slug);
}
