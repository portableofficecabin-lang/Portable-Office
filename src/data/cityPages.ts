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

  {
    slug: "container-office-in-bommasandra",
    city: "Bommasandra",
    metaTitle: "Container Office in Bommasandra",
    metaDescription:
      "Buy or rent a container office in Bommasandra from Portable Office Cabin. Durable, customized & ready-to-use office cabins with quick delivery. Enquire now!",
    keywords:
      "Container Office in Bommasandra, portable office cabin Bommasandra, prefab office container Bommasandra, site office cabin Bommasandra, container office manufacturer Bommasandra, office container on rent Bommasandra Industrial Area",
    geo: { region: "IN-KA", placename: "Bommasandra, Bengaluru, Karnataka, India", position: "12.8090;77.7030", icbm: "12.8090, 77.7030" },

    heroImage: {
      src: "/images/cities/container-office-in-bommasandra.webp",
      alt: "Container office in Bommasandra — ready-to-use portable container office with lockable entrance door and grilled sliding windows by Portable Office Cabin",
      width: 1024,
      height: 1024,
    },
    interiorImage: {
      src: "/images/cities/container-office-in-bommasandra-interior.webp",
      alt: "Inside a container office for Bommasandra — laminated wood-finish wall panels, false ceiling, vinyl flooring, grilled windows and office furniture",
      width: 1024,
      height: 1024,
    },
    gallery: [
      {
        src: "/images/cities/container-office-in-bommasandra-corner-view.webp",
        alt: "Corner view of a container office for Bommasandra industrial sites — grilled windows, external lights and weatherproof steel cladding",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/cities/container-office-in-bommasandra-roof-side-view.webp",
        alt: "Leak-proof sheet roof with turbo ventilators and long side elevation of a container office for Bommasandra",
        width: 1024,
        height: 1024,
      },
      {
        src: "/images/cities/container-office-in-bommasandra-end-view.webp",
        alt: "End elevation of a Bommasandra container office with louvre ventilation and external electrical points",
        width: 1024,
        height: 1024,
      },
    ],

    h1: "Container Office in Bommasandra",
    tagline: "Durable, Ready-to-Use Container Offices in Bommasandra by Portable Office Cabin",
    intro: [
      "Setting up an office in an industrial area should not take months of construction. If your business needs a container office in Bommasandra, Portable Office Cabin can deliver a fully finished, secure, and comfortable workspace directly to your site — ready to occupy within days. As a direct manufacturer of container offices, portable cabins, and prefab structures, we help companies across Bommasandra get professional office space at a fraction of the cost of conventional buildings.",
      "Bommasandra is one of Bengaluru's most important industrial zones. Located on Hosur Road with excellent connectivity to Electronic City, Hebbagodi, Chandapura, Attibele, and the Jigani-Bommasandra Link Road, the area is home to the Bommasandra Industrial Area (KIADB), large pharma and biotech campuses, engineering units, automotive component manufacturers, warehouses, and countless growing businesses. With the metro now reaching Bommasandra, the region is expanding faster than ever — and with that growth comes an urgent need for quick, flexible office space. That is exactly the need our container offices are built to solve.",
    ],

    whyHeading: "What Is a Container Office and Why Does It Make Sense in Bommasandra?",
    whyIntro:
      "A container office is a steel-structured, factory-built office cabin that arrives at your site complete with insulated walls, flooring, windows, doors, and electrical fittings. Unlike civil construction, there is no digging, no curing time, no scaffolding, and no months of waiting. The cabin is simply transported to your location, placed on a level surface, connected to power — and your team starts working. For businesses in Bommasandra, this approach has clear advantages:",
    whyBullets: [
      { title: "Speed", text: "Factories expanding their capacity, contractors starting new projects, and companies waiting for permanent buildings cannot afford delays. A container office gives you usable workspace in days." },
      { title: "Lower cost", text: "You avoid the heavy expenses of foundations, masonry, labour contracts, and finishing work. The total cost is far below traditional construction — and rental options bring the entry cost down even further." },
      { title: "Relocatable asset", text: "Industrial plots change, projects finish, and companies shift. Your container office is not tied to the ground. Lift it, load it, and take it to your next site anywhere in or around Bengaluru." },
      { title: "Built for industrial conditions", text: "Dust, heat, and monsoon rain are part of daily life on Hosur Road. Our cabins are engineered with anti-corrosive steel frames, insulated panels, and leak-proof roofing to handle it all." },
      { title: "Secure workspace", text: "With strong steel walls and lockable doors, your computers, files, and site documents stay protected round the clock." },
    ],

    solutionsHeading: "Container Office Options We Offer in Bommasandra",
    solutionsIntro:
      "Portable Office Cabin manufactures a full range of container office models. Whatever your team size or budget, we have a solution for your Bommasandra site:",
    solutions: [
      { title: "Standard Site Office Container", text: "A practical, ready-made cabin with insulation, windows, lockable door, lights, fans, and plug points. The go-to choice for site engineers, supervisors, and small teams." },
      { title: "Custom-Designed Office Container", text: "Tell us your layout and we will build it — manager cabins, staff workstations, reception area, meeting room, partitions, and storage, all inside a single container structure sized to your requirement." },
      { title: "AC Executive Office Container", text: "A premium cabin with high-grade insulation, laminated interior panels, false ceiling, modern lighting, and air-conditioning provision. Ideal for client meetings, marketing offices, and executive use at industrial campuses in Bommasandra." },
      { title: "Office Container with Attached Toilet & Pantry", text: "A self-sufficient unit that combines workspace with an attached washroom and pantry — extremely useful at construction sites and locations where separate facilities are not yet built." },
      { title: "Multi-Cabin Office Complex", text: "Need space for a bigger team? We build large and multi-unit container offices with several rooms, conference space, and storage areas for long-term projects." },
      { title: "Container Office on Rent in Bommasandra", text: "For short-term projects, our rental container offices give you a complete working office without capital expenditure. Use it for the project duration and return it when you are done." },
    ],

    featuresHeading: "Standard Features of Our Container Offices",
    featuresIntro: "Every container office we supply in Bommasandra includes:",
    features: [
      "Robust steel framework with anti-rust treatment for long service life",
      "Insulated sandwich panels (PUF / EPS / Rockwool) for temperature and noise control",
      "Durable flooring — plywood, cement board, or vinyl finish",
      "Windows with safety grills and quality aluminium / UPVC frames",
      "Heavy-duty lockable entrance door",
      "Complete internal electricals: lights, fans, switches, sockets, MCB",
      "AC, networking, and CCTV provisions on request",
      "Weatherproof, leak-proof roof design",
      "Optional attached toilet, pantry, ramp, and staircase",
    ],
    sizesNote:
      "Available sizes: 10x10 ft, 20x10 ft, 30x10 ft, and 40x10 ft — plus fully custom dimensions built to suit your plot and team size.",

    industriesHeading: "Who Uses Our Container Offices in Bommasandra?",
    industriesIntro: "The Bommasandra belt hosts a wide mix of industries, and our cabins serve them all:",
    industries: [
      { title: "Pharma, biotech & healthcare manufacturers", text: "temporary admin offices during plant construction and expansion" },
      { title: "Engineering & automotive component units", text: "supervisor cabins, quality offices, HR and time-office cabins" },
      { title: "Construction & infrastructure contractors", text: "site offices, engineer rooms, meeting cabins" },
      { title: "Warehouses & logistics companies", text: "billing counters, dispatch offices, security-cum-office cabins" },
      { title: "Real estate developers", text: "sales and marketing offices at apartment and layout projects" },
      { title: "IT & corporate campuses under construction", text: "project management offices and consultant cabins" },
    ],

    customHeading: "Customize Every Detail",
    customIntro:
      "When you order a container office in Bommasandra from us, you are not choosing from a fixed catalogue — you are designing your own workspace:",
    customBullets: [
      { title: "Size & layout", text: "single room, partitioned cabins, or open-plan office" },
      { title: "Interior finish", text: "laminated walls, false ceiling, premium flooring" },
      { title: "Electrical plan", text: "extra points for ACs, servers, printers, and appliances" },
      { title: "Furniture provision", text: "workstations, storage units, and seating arrangements" },
      { title: "Branding", text: "exterior painted in your company colours with logo and signage" },
      { title: "Utility add-ons", text: "attached toilet, pantry counter, sun shade, ramp, and steps" },
    ],
    customOutro: "Send us your requirement and our team will share a layout drawing and a clear, itemised quotation.",

    whyUsHeading: "Why Portable Office Cabin Is the Right Choice in Bommasandra",
    whyUsIntro: "Here is what sets us apart when you order your container office in Bommasandra:",
    whyUsBullets: [
      { title: "We are the manufacturer", text: "You buy directly from the factory — better prices, faster timelines, and full control over quality." },
      { title: "Proven build quality", text: "Tested steel sections, branded insulation materials, and reliable electrical fittings in every cabin." },
      { title: "Quick delivery to Bommasandra", text: "Our logistics team manages transport, unloading, and positioning at your site on Hosur Road, in the KIADB industrial area, or anywhere nearby." },
      { title: "Flexible options", text: "Buy new, customize fully, or rent for your project period." },
      { title: "Complete range", text: "Along with container offices, we supply security cabins, bunk houses, portable toilets, and site accommodation units — everything your site needs from one supplier." },
      { title: "Dependable support", text: "Our relationship does not end at delivery; we provide prompt after-sales service whenever you need it." },
    ],

    areasHeading: "Areas We Serve Around Bommasandra",
    areasText:
      "Along with Bommasandra and the Bommasandra Industrial Area, we regularly deliver container offices across the entire South Bengaluru corridor, including Jigani, Electronic City, Hebbagodi, Chandapura, Anekal, Attibele, Hosur Road, Bannerghatta Road, Harohalli, and Sarjapur. Wherever your project is located, we will get your office there.",

    howHeading: "From Enquiry to Working Office — In 4 Simple Steps",
    howSteps: [
      { title: "Tell us what you need", text: "Call or WhatsApp us with your size, layout, and site details." },
      { title: "Receive your quotation", text: "We share design options and transparent pricing — free of charge." },
      { title: "We manufacture your cabin", text: "Your container office is built at our facility under strict quality checks." },
      { title: "Delivery & handover at your Bommasandra site", text: "We transport, place, and hand over your office ready to use." },
    ],

    faqs: [
      { question: "How much does a container office cost in Bommasandra?", answer: "Pricing depends on size, insulation, interiors, and add-ons. A basic site cabin is very economical, while fully furnished AC offices cost more. Share your requirement and we will send an exact, no-obligation quotation." },
      { question: "How quickly can you deliver to Bommasandra?", answer: "Ready-stock cabins can reach your site within a few days. Customized offices typically take 1–3 weeks depending on specifications. Bommasandra's location on Hosur Road makes transport and installation quick and easy for our team." },
      { question: "Is renting available instead of buying?", answer: "Yes. Rental container offices are available for project-based needs — a popular choice for contractors and companies with temporary requirements in the industrial area." },
      { question: "Will the cabin stay cool in summer?", answer: "Yes. Insulated PUF/EPS/Rockwool panels keep the interior noticeably cooler than outside. With the AC provision we include, the cabin remains comfortable in every season." },
      { question: "Can I move the office to a different site later?", answer: "Of course. That is the core benefit of a container office — it can be lifted onto a truck and relocated to any new site whenever your project moves." },
      { question: "What sizes do you offer?", answer: "Standard options are 10x10, 20x10, 30x10, and 40x10 ft. Custom sizes and multi-cabin configurations are also manufactured on request." },
      { question: "Do I need a foundation at my site?", answer: "No major civil work is required. A level surface or simple concrete blocks are enough. Our team will guide you on basic site preparation before delivery." },
      { question: "Can you add a toilet or pantry to the office?", answer: "Yes. We build combination units with attached toilets and pantry sections, and we also supply standalone portable toilet units for your site." },
    ],

    ctaHeading: "Book Your Container Office in Bommasandra Today",
    ctaText:
      "Give your team a professional, secure, and comfortable workspace — without waiting for construction. Contact Portable Office Cabin today for a free consultation and quotation on your container office in Bommasandra. Buy or rent, standard or fully customized — we will build it your way and deliver it to your site.",
  },
];

export function cityPageBySlug(slug: string): CityPage | undefined {
  return CITY_PAGES.find((c) => c.slug === slug);
}
