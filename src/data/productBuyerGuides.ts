import { COMPANY } from "@/lib/company";
import {
  DISPATCH_WORKING_DAYS,
  DELIVERY_WORKING_DAYS,
  INSTALLATION_NOT_COVERED,
} from "@/data/shippingZones";

/**
 * PRODUCT BUYER GUIDES — long-form, product-specific buying help for the catalogue products that
 * had no content section of their own (the "thin" pages of the 2026-11-25 product SEO audit:
 * Guard Security Cabin 412 words, Luxury Prefab Villa 405, 40ft Bunkhouse 524, 20ft Storage
 * Container 760 — every other product already renders a dedicated *Content component).
 *
 * SOURCING RULE — every statement below comes from one of:
 *   • the product's own catalogue record in src/data/products.ts (specifications + features) or its
 *     commerce record in src/data/productCommerce.ts (size, material, bestFor);
 *   • src/data/shippingZones.ts (dispatch / delivery windows, what installation does NOT cover) —
 *     imported, never retyped, so the copy cannot drift from checkout;
 *   • src/lib/company.ts (factory location, GSTIN, Udyam) — the verified company record.
 * Everything else is general buying guidance (what a site needs before a unit arrives, how to
 * look after it), phrased as guidance — never as a claim about a project, a customer, a test
 * result or a certification.
 *
 * NEVER in this file: a ₹ figure (the page's price box is the only price — a second ₹ on a
 * Merchant-fed page is read as a conflicting price), a warranty period (the /warranty page is the
 * single source), a year, a completed-project or customer claim, a certification, or a performance
 * number not in the catalogue. src/data/productBuyerGuides.test.ts enforces all of these.
 *
 * Rendered by src/components/products/ProductBuyerGuide.tsx (server component; FAQ answers are in
 * the HTML via <details>, no FAQPage markup — Merchant landing pages carry no new FAQPage schema,
 * per the October 2026 audit decision A7).
 */

export interface GuideLink {
  href: string;
  label: string;
}

/** A paragraph, or a paragraph with one inline link: `${before} <a>${link.label}</a>${after}`. */
export type GuideParagraph = string | { before: string; link: GuideLink; after: string };

export interface GuideSection {
  heading: string;
  paragraphs?: GuideParagraph[];
  bullets?: string[];
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface ProductBuyerGuide {
  /** Static catalogue id (the commerce identity key) of the ONE product this guide renders on. */
  productId: string;
  sections: GuideSection[];
  faqHeading: string;
  faqs: GuideFaq[];
  quote: { heading: string; text: string };
}

const dispatch = `${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`;
const doorToDoor = `${DELIVERY_WORKING_DAYS.min}–${DELIVERY_WORKING_DAYS.max} working days`;
const foundationNotCovered = INSTALLATION_NOT_COVERED[0];
const factoryRegion = COMPANY.addresses.tamilNaduFactory.region;
const warrantyLink: GuideLink = { href: "/warranty", label: "Warranty page" };

/** Verified credentials, shown once at the foot of every guide. */
export const BUYER_GUIDE_CREDENTIALS = `Sold direct by ${COMPANY.legalName}: GSTIN ${COMPANY.gstin}, Udyam registration ${COMPANY.udyam}.`;

export const PRODUCT_BUYER_GUIDES: ProductBuyerGuide[] = [
  /* ── Guard Security Cabin — id 6 / POC-SC-6GD ─────────────────────────────────────────────
   * Sources: specifications (20ft x 10ft x 8ft; 4-side sliding glass; built-in workstation; LED
   * tube lights; 15A socket points; insulated roof with slope), features (all-round view; rain and
   * sun; lockable storage; AC can be added), commerce (MS Steel with Toughened Glass; Gate & Toll
   * Posts). Sibling: /products/security-cabin (custom sizes) — linked, not competed with. */
  {
    productId: "6",
    sections: [
      {
        heading: "A guard room with a clear view on all four sides",
        paragraphs: [
          "The Guard Security Cabin is a 20 ft × 10 ft × 8 ft guard room with sliding glass windows on all four sides, so whoever is on duty can watch the gate, the approach road and the parking area from the desk without stepping out. At about 200 sq ft it is a proper guard room rather than a one-person booth, with a built-in workstation for the visitor and vehicle register and lockable storage for the guard's belongings.",
          `It is built at our factory in ${factoryRegion} with an MS steel body and toughened glass, and it is sold as one fixed model at the price shown above.`,
          {
            before: "Need a smaller booth, a different window layout or an attached toilet? Our",
            link: { href: "/products/security-cabin", label: "custom-size security cabins" },
            after: " are built to order and quoted separately.",
          },
          {
            before: "To compare every model and price side by side, see our",
            link: { href: "/products/category/security-cabins", label: "security cabins" },
            after: " page.",
          },
        ],
      },
      {
        heading: "Where a 360-degree guard cabin earns its place",
        bullets: [
          "Factory and warehouse main gates, where the guard logs every vehicle and visitor at a desk facing the entry.",
          "Toll, weighbridge and checkpoint posts that need a view of traffic in both directions.",
          "Apartment and gated-community entrances that run visitor management at the gate.",
          "Parking entries and exits at offices, hospitals and shopping complexes.",
          "Construction site gates for the length of a project, moved on to the next site afterwards.",
        ],
      },
      {
        heading: "How the Guard Security Cabin is built",
        paragraphs: [
          "The roof is insulated and laid to a slope, so rainwater runs off instead of standing on top of the cabin, and the insulation keeps the room more comfortable through the afternoon sun. The four-side sliding windows open for ventilation and close against rain and dust.",
          "LED tube lights and 15A socket points are wired in at the factory, so the cabin is ready for a desk lamp, a phone charger, a boom-barrier controller or a CCTV monitor as soon as the power supply is connected. The cabin can also take an air conditioner; the AC unit is not part of the listed specification and is quoted separately on request.",
        ],
      },
      {
        heading: "Preparing the gate position before delivery",
        bullets: [
          "A firm, level base at the exact spot where the cabin will stand. For a gate cabin that stays for years, a PCC bed or a masonry plinth keeps it level and dry. " + foundationNotCovered,
          "Clear access for the delivery truck and the crane or hydra that lifts the cabin into place — check overhead cables, gate arches and kerbs on the route.",
          "A power supply point close to the cabin for the lights and sockets, sized for an AC if you plan to add one.",
          "Agree which way the desk and door should face the gate before delivery day, so the cabin is placed correctly the first time.",
        ],
      },
      {
        heading: "Delivery, installation and handover",
        paragraphs: [
          `The cabin is dispatched within ${dispatch} of order confirmation, and door-to-door delivery takes ${doorToDoor} depending on your PIN code. Checkout calculates the transport charge for your PIN code before you pay.`,
          "Installation is an optional line at checkout: our team levels the base, positions the cabin and completes the handover, with crane or hydra charges included for a standard single-unit placement.",
        ],
      },
      {
        heading: "Looking after a gate cabin",
        bullets: [
          "Clean the glass and the window tracks regularly so the sliders keep running smoothly and the view stays clear.",
          "Keep the roof slope and its run-off path free of leaves and debris.",
          "Touch up scratches in the painted MS body promptly so rust cannot start under the paint.",
          "Keep the base area drained so water does not stand under the cabin during the monsoon.",
        ],
        paragraphs: [
          {
            before: "Structural, electrical, leakage and paint-and-finish cover is set out on our",
            link: warrantyLink,
            after: ".",
          },
        ],
      },
    ],
    faqHeading: "Guard Security Cabin: questions buyers ask",
    faqs: [
      {
        question: "What size is the Guard Security Cabin?",
        answer: "It measures 20 ft × 10 ft × 8 ft, about 200 sq ft of floor area, with sliding glass windows on all four sides.",
      },
      {
        question: "What comes with the guard cabin as standard?",
        answer: "The listed specification: four-side sliding glass windows, a built-in workstation, lockable storage, LED tube lights, 15A socket points and an insulated sloped roof. Transport and the optional installation are added at checkout for your PIN code.",
      },
      {
        question: "Can an AC be fitted in the guard cabin?",
        answer: "Yes. The cabin can take an air conditioner. The AC unit is not part of the listed specification, so tell us and we will quote it separately.",
      },
      {
        question: "Does the guard cabin need a foundation?",
        answer: `It needs a firm, level base. A PCC bed or masonry plinth is the usual choice for a gate cabin that stays in place for years. ${foundationNotCovered}`,
      },
      {
        question: "How quickly can the cabin reach my site?",
        answer: `Dispatch is within ${dispatch} of order confirmation; door-to-door delivery takes ${doorToDoor} depending on your PIN code.`,
      },
      {
        question: "Can the guard cabin be moved to another gate later?",
        answer: "Yes. It is a single steel unit, so it can be lifted with a crane or hydra and placed at a new gate or a new site.",
      },
    ],
    quote: {
      heading: "Need a different size or an extra feature?",
      text: "Send us your gate layout, the number of guards per shift and any extras such as an AC, and we will quote a guard cabin to suit.",
    },
  },

  /* ── Portable Cabin 40ft Bunkhouse — id 7 / POC-PC-40BH ────────────────────────────────────
   * Sources: specifications (40ft x 10ft x 9.5ft; 8-12 persons; 6 double bunks; attached bathroom
   * with shower; pantry area; 2 x 1.5 ton split AC), features (fire extinguisher and smoke
   * detector; locker per person; common sitting area; emergency exit on both ends), commerce (MS
   * Frame with Insulated Panels; Worker Accommodation 8–12). "Meets worker welfare requirements" is
   * deliberately NOT repeated: no compliance document backs it. Siblings: /products/labour-colony
   * (50–500 workers). */
  {
    productId: "7",
    sections: [
      {
        heading: "A self-contained bunkhouse for a crew of 8 to 12",
        paragraphs: [
          "The Portable Cabin 40ft Bunkhouse is a 40 ft × 10 ft × 9.5 ft sleeping cabin for a small crew. Six double bunks sleep up to 12 people, each person gets a locker, and there is a common sitting area, a pantry area and an attached bathroom with a shower. Because the bathroom is inside the cabin, a small team at a remote site does not need a separate toilet block.",
          `It is built at our factory in ${factoryRegion} on an MS frame with insulated wall panels, and the listed specification includes two 1.5-ton split ACs.`,
          {
            before: "Housing 50 or more workers? A",
            link: { href: "/products/labour-colony", label: "prefabricated labour colony" },
            after: " with G+1 or G+2 blocks, kitchens and sanitation suits a larger workforce better than several bunkhouses.",
          },
        ],
      },
      {
        heading: "Layout and safety fittings",
        bullets: [
          "Six double bunks for up to 12 occupants, with a locker for each person.",
          "A common sitting area and a pantry area for tea and simple meals.",
          "An attached bathroom with a shower.",
          "Two 1.5-ton split ACs for the sleeping area.",
          "A fire extinguisher and a smoke detector.",
          "Emergency exits at both ends of the cabin.",
        ],
      },
      {
        heading: "Who a 40 ft bunkhouse suits",
        bullets: [
          "Small project crews at remote sites where rented rooms are too far away.",
          "Quarry, mining and plant-maintenance teams working shifts on site.",
          "Solar, wind and transmission-line crews that move from location to location.",
          "Security staff and drivers who need quarters next to the site they guard.",
        ],
      },
      {
        heading: "What your site needs before the bunkhouse arrives",
        bullets: [
          "A level base along the full 40 ft length, so the doors, bunks and bathroom fittings sit true. " + foundationNotCovered,
          "Road and gate access for a trailer long enough to carry a 40 ft cabin, and room for the crane or hydra that unloads it.",
          "A water supply line to the bathroom and pantry inlet, and a septic tank or soak pit arranged for the bathroom outlet.",
          "A power supply that can carry the lights, sockets and both split ACs.",
        ],
      },
      {
        heading: "Delivery and handover",
        paragraphs: [
          `The bunkhouse is dispatched within ${dispatch} of order confirmation and reaches most sites in ${doorToDoor}, depending on the PIN code; checkout shows the transport charge before you pay.`,
          "With the optional installation added at checkout, our team levels the base, positions the cabin and hands it over, with crane or hydra charges included for a standard single-unit placement.",
        ],
      },
      {
        heading: "Keeping a bunkhouse in good shape",
        bullets: [
          "Clean the AC filters regularly — with 12 people using the room they clog faster than in an office cabin.",
          "Keep the bathroom ventilated and check the sealant around the shower and fittings, so moisture cannot reach the floor.",
          "Check the fire extinguisher's pressure gauge and test the smoke detector as part of a routine site safety walk.",
          "Keep both emergency exits clear of beds, bags and stores at all times.",
        ],
        paragraphs: [
          {
            before: "Structural, electrical, leakage and paint-and-finish cover is set out on our",
            link: warrantyLink,
            after: ".",
          },
        ],
      },
    ],
    faqHeading: "40ft Bunkhouse: questions buyers ask",
    faqs: [
      {
        question: "How many people can sleep in the 40ft bunkhouse?",
        answer: "Up to 12. It has six double bunks, a locker for each person and a common sitting area.",
      },
      {
        question: "Does the bunkhouse have its own bathroom?",
        answer: "Yes. There is an attached bathroom with a shower inside the cabin, plus a pantry area.",
      },
      {
        question: "Are the air conditioners included?",
        answer: "The listed specification includes two 1.5-ton split ACs. Make sure the site power supply can carry them.",
      },
      {
        question: "What water and drainage connections does it need?",
        answer: "A water supply line to the bathroom and pantry inlet, and a septic tank or soak pit for the bathroom outlet. These site connections are arranged locally.",
      },
      {
        question: "How long does delivery take?",
        answer: `Dispatch is within ${dispatch} of order confirmation; door-to-door delivery takes ${doorToDoor} depending on your PIN code.`,
      },
      {
        question: "Can the bunkhouse move with the crew to the next site?",
        answer: "Yes. It is a single 40 ft cabin that can be lifted, transported on a trailer and set down at the next site.",
      },
    ],
    quote: {
      heading: "Planning accommodation for a bigger crew?",
      text: "Tell us the headcount, the site location and how long the crew will stay, and we will suggest bunkhouses or a labour colony layout and quote it.",
    },
  },

  /* ── Luxury Prefab Villa G+1 — id 8 / POC-PH-3LUX ──────────────────────────────────────────
   * Sources: specifications (60 ft x 25 ft overall; 1,500 sq ft; 3 bed / 2 bath; living 300 sq ft;
   * wraparound porch; 10ft ceiling; ACP cladding; WPC / PVC internal finish; frame 4 mm base /
   * 2 mm top / 1.2 mm exterior framing; roof structure 1.2 mm; MDF ceiling; glasswool 25 mm wall
   * insulation; glasswool roof insulation; tiled floors), features (real wood-finish interiors;
   * smart-home wiring ready; solar panel mounting points; full modular kitchen; garden landscaping
   * available), images comment ("Owner-supplied render set"). The frame MATERIAL and the
   * floor-by-floor split are not in the record, so neither is stated. Sibling: the 2BHK. */
  {
    productId: "8",
    sections: [
      {
        heading: "A 3BHK prefab villa with 10 ft ceilings and a wraparound porch",
        paragraphs: [
          "The Luxury Prefab Villa G+1 is the larger of our two prefab home models: 1,500 sq ft on a 60 ft × 25 ft overall size, with three bedrooms, two bathrooms, a 300 sq ft living room, a full modular kitchen and a wraparound porch. Ceilings are 10 ft high, which keeps the rooms feeling open.",
          "The pictures on this page are design renders of this model, so they show the intended finish rather than a particular completed house.",
          {
            before: "Looking for a smaller home? The",
            link: { href: "/products/family-prefab-home-2bhk", label: "Family Prefab Home 2BHK" },
            after: " is an 800 sq ft two-bedroom model built the same factory-first way.",
          },
        ],
      },
      {
        heading: "Build specification, layer by layer",
        bullets: [
          "Structural frame: 4 mm base frame, 2 mm top framing and 1.2 mm exterior framing.",
          "Walls: ACP cladding outside, 25 mm glasswool insulation, WPC / PVC finish inside.",
          "Roof: 1.2 mm roof structure with glasswool insulation, and an MDF ceiling finish below.",
          "Floors: tiles throughout.",
          "Kitchen: a full modular kitchen is included.",
          "Services: wiring ready for smart-home devices, and mounting points for solar panels on the roof.",
        ],
        paragraphs: [
          "Interiors use real wood finishes, and garden landscaping around the villa can be added on request.",
        ],
      },
      {
        heading: "Who chooses a prefab villa",
        bullets: [
          "Farm-land owners who want a comfortable weekend or retirement home without a long on-site build.",
          "Resort and homestay operators adding guest villas of a consistent standard.",
          "Families building on a plot where conventional construction would be slow or hard to supervise.",
        ],
      },
      {
        heading: "Getting your plot ready",
        bullets: [
          `A foundation built to the drawing we share after your order. ${foundationNotCovered}`,
          "Any building permission your local body requires for a residence — check this before you order.",
          "Water, sewage and power connections brought to the points marked on the drawing.",
          "Road access to the plot for the vehicles carrying the villa's components, with space to unload them.",
        ],
      },
      {
        heading: "Delivery and assembly",
        paragraphs: [
          "The villa's frame, panels and fittings are made in our factory and assembled on your plot once the foundation is ready. The time on site depends on the plot and how ready it is, and we confirm the plan with you before dispatch.",
          "The price box above shows the delivery window, and checkout calculates transport for your PIN code before you pay.",
        ],
      },
      {
        heading: "Caring for an ACP-clad home",
        bullets: [
          "Wash the ACP cladding with water and a mild detergent to keep the finish clean; avoid abrasive pads.",
          "Inspect the sealant at panel joints, windows and roof edges before each monsoon.",
          "Clear the roof and gutters of leaves so water drains away quickly.",
          "Wipe WPC / PVC interior surfaces with a damp cloth rather than soaking them.",
        ],
        paragraphs: [
          {
            before: "Structural, electrical, leakage and paint-and-finish cover is set out on our",
            link: warrantyLink,
            after: ".",
          },
        ],
      },
    ],
    faqHeading: "Luxury Prefab Villa: questions buyers ask",
    faqs: [
      {
        question: "How big is the Luxury Prefab Villa?",
        answer: "It has 1,500 sq ft on a 60 ft × 25 ft overall size, with three bedrooms, two bathrooms, a 300 sq ft living room and 10 ft ceilings.",
      },
      {
        question: "What are the villa's walls made of?",
        answer: "ACP cladding outside, 25 mm glasswool insulation in between and a WPC / PVC finish inside.",
      },
      {
        question: "Is the kitchen included?",
        answer: "Yes. A full modular kitchen is part of the listed specification.",
      },
      {
        question: "Can I add solar panels later?",
        answer: "Yes. The villa has solar panel mounting points, and the wiring is ready for smart-home devices.",
      },
      {
        question: "Who builds the foundation?",
        answer: `The foundation is built to our drawing before assembly. ${foundationNotCovered}`,
      },
      {
        question: "Are the photos of a finished villa?",
        answer: "No. They are design renders of this model, showing the intended layout and finish.",
      },
    ],
    quote: {
      heading: "Planning a villa on your plot?",
      text: "Share your plot size, location and any layout changes you have in mind, and we will send a written quotation with the drawing.",
    },
  },

  /* ── 20ft Storage Container (Corten Steel) — id 12 / POC-CSC-2040 ─────────────────────────────
   * Sources: specifications (20ft x 8ft x 8.5ft; 160 sq ft external, about 149 sq ft inside;
   * Corten (weathering) steel; 28mm marine-grade plywood floor; double-leaf lockable cargo doors;
   * corrugated sealed roof; anti-corrosion primer + industrial enamel; load capacity to be
   * confirmed), features (watertight; forklift pockets; stackable up to 3 high; customisable with
   * shelving, lighting & ventilation). It is SUPPLIED, not built here, so no factory claim; new vs
   * used is not stated in the record, so neither is claimed. Siblings: rental, 20 ft GP. */
  {
    productId: "12",
    sections: [
      {
        heading: "Lockable, weatherproof storage for a site, factory or shop",
        paragraphs: [
          "This 20 ft × 8 ft × 8.5 ft Corten (weathering) steel container is sold for storage: about 160 sq ft external and roughly 149 sq ft inside, with a 28 mm marine-grade plywood floor, double-leaf lockable cargo doors and a corrugated roof sealed against rain. It is finished in an anti-corrosion primer with an industrial enamel top coat.",
          {
            before: "Only need storage for a few months? Our",
            link: { href: "/products/shipping-container-rental", label: "shipping container rental" },
            after: " may cost less than buying.",
          },
          {
            before: "Want a standard general-purpose shipping container to convert instead? See the",
            link: { href: "/products/shipping-container-for-sale", label: "20 ft GP shipping container" },
            after: ".",
          },
        ],
      },
      {
        heading: "What people store in a 20 ft container",
        bullets: [
          "Cement, steel, tools and fittings at a construction site, locked up overnight.",
          "Spares, packaging and finished goods at a factory or warehouse that has run out of shed space.",
          "Seasonal or surplus stock for shops, distributors and e-commerce sellers.",
          "Household furniture and goods during a renovation or a move.",
          "Fertiliser, seed and equipment on a farm, kept dry and secure.",
        ],
      },
      {
        heading: "Confirm the load capacity before heavy loads",
        paragraphs: [
          "The rated payload depends on the particular container supplied. If you plan to store heavy or dense material such as steel, paper reels or stacked machinery, ask us before you order and we will confirm the figure from that container's CSC plate or the manufacturer's documentation.",
        ],
      },
      {
        heading: "Placing the container on your site",
        bullets: [
          "Choose firm, level ground. Concrete pads or blocks under the four corners keep the floor level, let the doors close properly and keep the base out of standing water. " + foundationNotCovered,
          "Leave clear space in front of the doors so both leaves can swing fully open.",
          "Check that the delivery truck and the crane or hydra can reach the spot without hitting cables or trees.",
          "The container has forklift pockets for moving it around a yard, and it can be stacked up to three units high when you need more storage on a small footprint.",
        ],
      },
      {
        heading: "Fit-out options",
        paragraphs: [
          "Shelving, lighting and ventilation can be added to suit what you store. Ventilation is worth adding for paper, grain and textiles, which suffer from condensation in a sealed steel box. These additions are quoted separately.",
        ],
      },
      {
        heading: "Delivery",
        paragraphs: [
          `The container is dispatched within ${dispatch} of order confirmation and delivered door to door in ${doorToDoor}, depending on the PIN code. Checkout shows the transport charge for your PIN code before you pay, and the optional installation line covers levelling the base and positioning the container.`,
        ],
      },
      {
        heading: "Simple care for a steel container",
        bullets: [
          "Check the door gaskets and keep the locking bars and hinges lubricated so the doors seal and open easily.",
          "Keep the roof free of standing water, leaves and debris.",
          "Touch up scratches and dents in the paint before rust can spread.",
          "Open the doors on dry days, or add vents, to let trapped moisture out.",
        ],
        paragraphs: [
          {
            before: "Warranty terms are set out on our",
            link: warrantyLink,
            after: ".",
          },
        ],
      },
    ],
    faqHeading: "20ft Storage Container: questions buyers ask",
    faqs: [
      {
        question: "What are the inside dimensions of the 20 ft storage container?",
        answer: "The outside measures 20 ft × 8 ft × 8.5 ft, about 160 sq ft. The usable floor inside is roughly 149 sq ft.",
      },
      {
        question: "How much weight can it hold?",
        answer: "It depends on the container supplied. Ask us before ordering for heavy loads and we will confirm the rated payload from the container's CSC plate or manufacturer documentation.",
      },
      {
        question: "Can the container be placed directly on soil?",
        answer: "It is better on firm, level ground with concrete pads or blocks under the corners, so the doors close properly and the base stays out of standing water.",
      },
      {
        question: "Can I add shelves, lights or vents?",
        answer: "Yes. Shelving, lighting and ventilation can be added and are quoted separately.",
      },
      {
        question: "Can containers be stacked?",
        answer: "Yes, up to three units high, which gives more storage on a small footprint.",
      },
      {
        question: "Should I buy or rent a storage container?",
        answer: "Buy if you need storage for a long time or will move it between your own sites; rent if you need it for a few months only.",
      },
    ],
    quote: {
      heading: "Need several containers or a fitted-out store?",
      text: "Tell us how many containers you need, what you will store and where they will go, and we will quote the containers and any shelving, lighting or vents.",
    },
  },
];

const BY_ID = new Map(PRODUCT_BUYER_GUIDES.map((g) => [g.productId, g]));

/** The buyer guide for a catalogue product, or undefined for products that have their own content. */
export function getProductBuyerGuide(productId: string): ProductBuyerGuide | undefined {
  return BY_ID.get(productId);
}
