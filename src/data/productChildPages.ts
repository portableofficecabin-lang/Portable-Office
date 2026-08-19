/**
 * PRODUCT CHILD PAGES — the SEO hierarchy under each main product page.
 *
 * One registry drives everything: the nested route (/products/<parent>/<child>), the
 * sitemap, the parent page's "Guides" section and every child's sibling links — so a
 * child page can never exist without being linked, and a link can never point at a
 * page that does not exist.
 *
 * URL contract:  /products/<parentSlug>/<childSlug>
 * (the nested route falls through Next's router even where the parent is a dedicated
 * static segment, e.g. /products/portable-cabin).
 *
 * CONTENT RULES (enforced by review, stated here so additions follow them):
 *  • Every child targets ONE primary keyword / search intent that no existing product,
 *    category, promotion or blog page already owns — children complement, never
 *    cannibalize. Location intents stay in /promotions; rental in the rent blog post.
 *  • NO "₹" and no numeric prices in this file, ever. Where a page needs prices, set
 *    `showPriceTable: true` and the template renders the parent category's purchasable
 *    SKUs live from the commerce source of truth (sellPrice / isPurchasable) — the same
 *    figures as the product page, cart and Merchant feed.
 *  • No unbacked figures (project counts, client percentages, years in business).
 *    Factual claims (materials, sizes, delivery, warranty, GST-inclusive pricing) must
 *    already appear on the live site.
 *  • Unique, useful copy per page — no shared boilerplate paragraphs between children.
 */

export interface ChildSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface ProductChildPage {
  /** URL segment under the parent, e.g. "price-and-cost-guide". */
  slug: string;
  /** The one primary keyword / intent this page targets (documentation + title aid). */
  keyword: string;
  /** <title> (site suffix added by buildPageMetadata). */
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  sections: ChildSection[];
  faqs: { q: string; a: string }[];
  /** Render the live GST-inclusive price table of the parent category's purchasable SKUs. */
  showPriceTable?: boolean;
  /** Cross-links beyond the automatic parent + sibling links. */
  related: { label: string; href: string }[];
}

export interface ProductChildGroup {
  /**
   * Parent URL segment, e.g. "portable-cabin" → /products/portable-cabin.
   *
   * INVARIANT: a page MUST exist at /products/<parentSlug> — either a real catalogue product
   * slug or a dedicated route under app/(site)/products/. The breadcrumb, the "View range" CTA,
   * every sibling card AND the BreadcrumbList JSON-LD all point at it, so registering a group
   * whose parent has no page ships a 404 inside structured data on a sitemap-submitted URL.
   */
  parentSlug: string;
  parentName: string;
  /**
   * Overrides the parent LINK only (not the child URLs), for a group whose parent is not at
   * /products/<parentSlug> — e.g. a category-nested parent at /products/category/<slug>.
   * Defaults to `/products/${parentSlug}`. Exists so that decision stays a data change.
   */
  parentPath?: string;
  /** Category whose OUTRIGHT-SALE SKUs feed the live price table + related products. */
  categorySlug: string;
  children: ProductChildPage[];
}

export const productChildGroups: ProductChildGroup[] = [
  {
    parentSlug: "portable-cabin",
    parentName: "Portable Cabin",
    categorySlug: "portable-cabins",
    children: [
      {
        slug: "price-and-cost-guide",
        keyword: "portable cabin price",
        title: "Portable Cabin Price & Cost Guide",
        metaDescription:
          "What a portable cabin costs in India: fixed GST-inclusive prices, what drives the price up or down, and what transport and installation add. Live prices included.",
        h1: "Portable Cabin Price & Cost Guide",
        intro: [
          "Every purchasable cabin on this site carries one fixed, GST-inclusive price — the same figure on the product page, in the cart, at checkout and on the payment screen. This guide explains what sits behind that number so you can compare configurations confidently.",
          "The live prices below come from the same catalogue the checkout uses, so they can never be out of date.",
        ],
        sections: [
          {
            heading: "What decides the price of a portable cabin",
            paragraphs: [
              "Size is the biggest lever: steel, panels and flooring all scale with floor area, so a longer cabin costs more in close proportion to its footprint. The second lever is the wall system — PUF-insulated sandwich panels cost more than plain sheet walls but keep interiors workable through Indian summers.",
              "Fit-out completes the picture: electricals, lighting and AC provision, attached toilets, pantry counters, extra windows and premium flooring each add their own material and labour. A bare storage-grade cabin and a fully fitted executive office of the same size can sit far apart in price for exactly these reasons.",
            ],
            bullets: [
              "Floor area (length × width) — the dominant cost driver",
              "Wall system: plain MS/GI sheet vs PUF-insulated sandwich panels",
              "Electricals: wiring, lights, switches, AC points, MCB",
              "Wet areas: attached toilet or pantry plumbing",
              "Doors, windows and security grills",
              "Flooring grade and internal lining finish",
            ],
          },
          {
            heading: "What is included — and what is quoted separately",
            paragraphs: [
              "The displayed price is the ex-works cabin price including GST. Transport to your site and crane unloading are quoted separately because they depend entirely on distance and site access — the checkout calculates transport from your delivery PIN code before you pay, so there are no surprises.",
              "Installation is light by design: cabins arrive factory-finished and are placed on a simple level base, so most sites are operational the same day the cabin lands.",
            ],
          },
          {
            heading: "How to keep the cost down",
            paragraphs: [
              "Pick a standard size rather than a custom footprint, keep wet areas to one wall, and order early enough for road transport to be scheduled efficiently. If the cabin is needed for under a year, compare the rental route before buying — for short projects hire often wins.",
            ],
          },
        ],
        faqs: [
          {
            q: "Are the prices shown final?",
            a: "The cabin price is final and GST-inclusive. Transport and crane unloading are added at checkout based on your delivery PIN code, so the payable total is visible before payment.",
          },
          {
            q: "Why do two cabins of the same size have different prices?",
            a: "Wall system and fit-out. A PUF-insulated cabin with wiring, AC provision and an attached toilet carries more material and labour than a plain sheet cabin of the same footprint.",
          },
          {
            q: "Is a custom size more expensive than a standard one?",
            a: "Usually somewhat, because standard sizes are optimised for material sheets and transport. Use the cabin calculator on the home page for an instant estimate of your exact size.",
          },
          {
            q: "Do prices include delivery?",
            a: "No — delivery depends on distance and site access, so it is calculated separately at checkout from your PIN code and shown before you pay.",
          },
          {
            q: "Can I pay online?",
            a: "Yes. Fixed-price cabins can be ordered and paid for online through secure Razorpay checkout — UPI, cards and net banking are accepted.",
          },
        ],
        showPriceTable: true,
        related: [
          { label: "Use the instant price calculator", href: "/#cabin-calculator" },
          { label: "Porta cabins on rent — when hiring beats buying", href: "/blog/porta-cabins-on-rent" },
        ],
      },
      {
        slug: "sizes-and-dimensions",
        keyword: "portable cabin sizes",
        title: "Portable Cabin Sizes & Dimensions",
        metaDescription:
          "Standard portable cabin sizes in India — 10×8, 20×8 and 40×8 ft — with internal dimensions, who each size suits, and how custom sizes work.",
        h1: "Portable Cabin Sizes & Dimensions Guide",
        intro: [
          "Portable cabins in India follow container-friendly modules so they travel legally by road and lift safely by crane. This guide covers the standard sizes we build, what fits inside each, and when a custom footprint makes sense.",
        ],
        sections: [
          {
            heading: "The standard sizes",
            paragraphs: [
              "Three footprints cover most requirements. A 10×8 ft cabin suits a security post, ticket counter or single-desk office. A 20×8 ft cabin is the workhorse — a comfortable two-to-four person site office, a sample-collection room or a small classroom. A 40×8 ft cabin hosts a full office with cabins-within-the-cabin, a meeting area, or accommodation for a site crew.",
              "Height is typically 8 ft 6 in externally, giving a finished internal clear height comfortable for ceiling fans and ductless ACs.",
            ],
            bullets: [
              "10×8 ft — guard rooms, kiosks, single-desk offices",
              "20×8 ft — standard site offices, clinics, classrooms",
              "40×8 ft — large offices, multi-room layouts, bunkhouses",
            ],
          },
          {
            heading: "External vs internal dimensions",
            paragraphs: [
              "Wall thickness takes a small bite out of the quoted external size: with insulated sandwich panels, expect roughly 100 mm total across each axis. Plan furniture against internal dimensions, and remember the door swing when placing desks near the entrance.",
            ],
          },
          {
            heading: "When to go custom",
            paragraphs: [
              "Sites with narrow gates, rooftop placements and unusual plot shapes often need non-standard footprints. Custom sizes are a normal part of our production — the practical limits are road transport width and crane access at your site. Share the site constraints and we will spec a size that ships legally and lands safely.",
            ],
          },
        ],
        faqs: [
          { q: "What is the most popular portable cabin size?", a: "20×8 ft. It fits a working office for two to four people, travels on a standard lorry and lifts with a modest crane." },
          { q: "Can two cabins be joined?", a: "Yes — cabins are routinely placed side by side or end to end and joined on site, which is how wider offices and multi-room layouts are built beyond the 8 ft road-transport width." },
          { q: "Can a portable cabin have two floors?", a: "Ground-plus-one configurations are built as stacked modules with an external staircase — common for site offices where plot space is tight." },
          { q: "What ceiling height do cabins have?", a: "External height is typically 8 ft 6 in, with internal clear height suitable for fans and split or ductless AC units." },
          { q: "Do custom sizes cost much more?", a: "Somewhat, because standard sizes optimise sheet material and transport. The calculator on the home page prices your exact size instantly." },
        ],
        related: [
          { label: "Price & cost guide", href: "/products/portable-cabin/price-and-cost-guide" },
          { label: "Layouts & interiors", href: "/products/portable-cabin/layouts-and-interiors" },
        ],
      },
      {
        slug: "layouts-and-interiors",
        keyword: "portable cabin interior layout",
        title: "Portable Cabin Layouts & Interior Ideas",
        metaDescription:
          "Practical portable cabin layout ideas: site office plans, partitioned offices, pantry and toilet placement, furniture that fits, and finishes that last.",
        h1: "Portable Cabin Layouts & Interior Ideas",
        intro: [
          "A cabin earns its keep through its layout. The same 20×8 shell can be a cramped storeroom or a genuinely pleasant office depending on where the partitions, wet areas and windows go. These are the layouts we build most, and why they work.",
        ],
        sections: [
          {
            heading: "Layouts that work",
            paragraphs: [
              "The classic site office splits a 20×8 into a main office with a small meeting or storage room behind a partition. In 40×8 cabins, a centre corridor with rooms off one side keeps circulation clean; putting the toilet at one end keeps plumbing on a single wall and the office end quiet.",
              "For reception-type uses — clinics, sales counters, ticket booths — place the door on the long wall so visitors enter facing the desk, not the length of the room.",
            ],
            bullets: [
              "20×8 office + store: partition at one-third length",
              "40×8 corridor plan: rooms off one side, toilet at the far end",
              "Reception plan: long-wall entrance facing the counter",
              "Bunkhouse plan: beds along walls, lockers at the entry end",
            ],
          },
          {
            heading: "Interior finishes",
            paragraphs: [
              "Interiors are pre-finished at the factory: PPGI or laminated wall lining, vinyl or laminate flooring over marine plywood, concealed wiring with switches and LED lights in place. That is what makes same-day occupancy possible — there is no site-side painting or wiring stage.",
            ],
          },
          {
            heading: "Furniture and services",
            paragraphs: [
              "Desks, storage and bunks sized for cabin dimensions are available as part of the order, which avoids the classic problem of furniture that will not pass through the cabin door. AC points, extra sockets and data conduits are easiest to add at the factory — tell us the desk plan and the wiring will follow it.",
            ],
          },
        ],
        faqs: [
          { q: "Can a cabin be partitioned into rooms?", a: "Yes — factory-fitted partitions are standard and far cleaner than site-built ones. The layout is agreed on a simple drawing before production." },
          { q: "Where should the toilet go?", a: "At one end of the cabin, keeping all plumbing on a single external wall — cheaper to build, easier to maintain and quieter for the office space." },
          { q: "Do cabins come furnished?", a: "They can. Desks, chairs, storage and bunks sized for the cabin are available with the order, delivered installed." },
          { q: "Can I get AC in a portable cabin?", a: "Yes — AC provision (point, support and conduit) is a standard factory option, and PUF-insulated walls make the AC's job far easier." },
          { q: "What flooring do cabins use?", a: "Marine plywood decking finished with vinyl or laminate — durable, mop-cleanable and comfortable underfoot." },
        ],
        related: [
          { label: "Sizes & dimensions guide", href: "/products/portable-cabin/sizes-and-dimensions" },
          { label: "Cabin with toilet & pantry", href: "/products/portable-cabin/with-toilet-and-pantry" },
        ],
      },
      {
        slug: "with-toilet-and-pantry",
        keyword: "portable cabin with toilet",
        title: "Portable Cabin with Toilet & Pantry",
        metaDescription:
          "Portable cabins with attached toilet and pantry: layouts, plumbing and tank options, sizes that work, and what to prepare on site before delivery.",
        h1: "Portable Cabin with Attached Toilet & Pantry",
        intro: [
          "Adding a toilet or pantry turns a cabin from a workspace into a self-sufficient unit — no more depending on facilities elsewhere on site. Here is how attached wet areas are built, what they need from your site, and which sizes carry them well.",
        ],
        sections: [
          {
            heading: "How the wet area is built",
            paragraphs: [
              "The toilet is a factory-built room within the cabin: waterproofed flooring, wall-lined, with WC, wash basin and fittings plumbed to external connection points. The pantry follows the same logic — a counter, sink and power for kettle or induction, plumbed to the same wall.",
              "Keeping toilet and pantry on the same end wall means one water inlet and one outlet serve everything, which simplifies your site connection to a single point.",
            ],
          },
          {
            heading: "What your site needs to provide",
            paragraphs: [
              "Water in, waste out, power on: a tap connection or overhead tank feed, a drain line or septic/soak connection, and a standard electrical supply. Where drainage is unavailable, sealed holding tanks with scheduled emptying keep the unit usable on any site.",
            ],
            bullets: [
              "Water inlet: tap or tank feed to the wet-area wall",
              "Drainage: sewer line, soak pit, or sealed holding tank",
              "Power: standard site supply to the cabin DB",
            ],
          },
          {
            heading: "Sizes that carry a toilet well",
            paragraphs: [
              "From 20×8 ft upward the toilet stops competing with the workspace. In a 20×8, a toilet takes roughly a quarter of the floor; a 40×8 carries a toilet, a pantry and still keeps a generous office. For standalone sanitation without an office, see the dedicated portable toilet range instead.",
            ],
          },
        ],
        faqs: [
          { q: "Does the toilet come fully fitted?", a: "Yes — WC, basin, fittings, waterproof flooring and lighting are factory-installed. Your site connects water, drain and power to points on the cabin wall." },
          { q: "What if my site has no drainage?", a: "A sealed holding tank under or beside the cabin holds waste for scheduled emptying — standard practice for event sites and early-stage construction sites." },
          { q: "Which direction should the toilet door open?", a: "Into the toilet itself, so the swing never blocks the working space of the main room." },
          { q: "Can a pantry be added later?", a: "It is far cheaper at the factory, where plumbing and counters are fitted before the walls close. Retrofits are possible but involve site plumbing work." },
          { q: "Is a separate toilet cabin better?", a: "If several teams share sanitation, a standalone portable toilet block serves everyone without foot traffic through your office. If it is for one office's use, attached is more convenient." },
        ],
        related: [
          { label: "Portable toilet cabins range", href: "/products/category/portable-toilet-cabins" },
          { label: "Layouts & interiors", href: "/products/portable-cabin/layouts-and-interiors" },
        ],
      },
      {
        slug: "for-schools-and-classrooms",
        keyword: "portable cabin for school classroom",
        title: "Portable Cabins for Schools & Classrooms",
        metaDescription:
          "Portable classrooms for schools and institutions: sizes per class strength, ventilation and lighting, safety points, and delivery timed to the academic term.",
        h1: "Portable Cabins for Schools & Classrooms",
        intro: [
          "When admissions outgrow buildings, a portable classroom bridges the gap in days rather than a construction season. Schools use cabins as classrooms, staff rooms, labs, libraries and admin offices — this guide covers what a classroom cabin needs to get right.",
        ],
        sections: [
          {
            heading: "Sizing a classroom cabin",
            paragraphs: [
              "A 20×8 ft cabin seats a small tuition batch comfortably; a 40×8 handles a full class with a teaching wall and circulation space. For larger halls, two 40×8 units joined side-by-side create a nearly square room without site construction.",
              "Plan on the internal dimensions and leave the teaching wall clear of windows so boards and screens sit in even light.",
            ],
          },
          {
            heading: "Comfort and safety for children",
            paragraphs: [
              "Insulated PUF walls and roof keep afternoon classrooms usable without over-relying on fans. Cross-ventilation from windows on both long walls, LED lighting rated for reading, and grilled windows are the standard classroom spec. Doors open outward for easy egress, and access ramps are a simple addition where younger children or accessibility needs demand them.",
            ],
            bullets: [
              "PUF-insulated walls and roof for afternoon comfort",
              "Windows on both long walls for cross-ventilation",
              "Security grills and outward-opening doors",
              "Optional ramp and handrail access",
            ],
          },
          {
            heading: "Timing around the academic year",
            paragraphs: [
              "Cabins are factory-built while your site continues as normal, then delivered and placed over a weekend or holiday — an admissions decision taken mid-term can still translate into classroom capacity within the same term.",
            ],
          },
        ],
        faqs: [
          { q: "How many students fit in a classroom cabin?", a: "Depends on furniture and age group: a 40×8 ft cabin typically hosts a standard class with a teaching area; a 20×8 suits tuition batches or activity groups." },
          { q: "Are portable classrooms hot in summer?", a: "PUF-insulated panels change this completely — the insulated sandwich construction keeps interiors markedly cooler than sheet-metal rooms, and AC provision is available for the hottest regions." },
          { q: "Are cabins safe for children?", a: "Steel structure, grilled windows, outward-opening doors and concealed wiring with MCB protection are all standard. Ramps and handrails are available options." },
          { q: "Can the school move the cabin later?", a: "Yes — relocatability is the point. The cabin lifts onto a lorry and re-installs at the new location, useful for campuses that develop in phases." },
          { q: "What base does a classroom cabin need?", a: "A simple level base — compacted ground with concrete pads or a plinth. No building-grade foundation is required." },
        ],
        related: [
          { label: "Sizes & dimensions guide", href: "/products/portable-cabin/sizes-and-dimensions" },
          { label: "Insulation & cooling", href: "/products/portable-cabin/insulation-and-cooling" },
        ],
      },
      {
        slug: "insulation-and-cooling",
        keyword: "insulated portable cabin",
        title: "Insulated Portable Cabins — PUF Panels & Cooling",
        metaDescription:
          "How PUF-insulated portable cabins stay cool in Indian summers: panel construction, insulation thickness, AC sizing, and when plain sheet walls are enough.",
        h1: "Insulated Portable Cabins: PUF Panels & Cooling",
        intro: [
          "The difference between a cabin people avoid at 2 pm and one they work in comfortably is the wall build-up. This page explains the PUF sandwich panel, what it does for interior temperature, and how to think about AC sizing in an insulated cabin.",
        ],
        sections: [
          {
            heading: "What a PUF sandwich panel is",
            paragraphs: [
              "A PUF panel is two pre-painted steel skins bonded to a rigid polyurethane foam core. The foam is the insulator: it interrupts the heat path that plain metal walls conduct straight through, which is why a sheet-walled cabin bakes while a PUF cabin merely warms.",
              "The same panel construction insulates the roof, where the sun load is strongest — an insulated wall under a bare metal roof wastes most of its advantage.",
            ],
          },
          {
            heading: "Choosing insulation thickness",
            paragraphs: [
              "Thicker cores insulate more. Standard cabin walls use a mid-range core that balances cost and comfort for offices; cold-region or air-conditioned-all-day uses justify stepping up. The right answer follows the use: an occasionally-used store tolerates less, a clinic or classroom deserves more.",
            ],
          },
          {
            heading: "Cooling an insulated cabin",
            paragraphs: [
              "Insulation shrinks the AC you need: a compact split unit holds a PUF cabin at set temperature where a sheet cabin would run a larger unit continuously. Provisioning matters more than the machine — order the cabin with the AC point, support bracket and conduit in place, and the unit installs in minutes at site.",
            ],
            bullets: [
              "PUF core interrupts conducted heat through walls and roof",
              "Insulated cabins need smaller AC units that cycle less",
              "Factory AC provision: point, bracket and conduit ready",
            ],
          },
        ],
        faqs: [
          { q: "Do insulated cabins work without AC?", a: "They stay usable through most of the day with fans and cross-ventilation — insulation slows heat coming in. Peak-summer afternoon comfort in hot regions still benefits from AC." },
          { q: "Is roof insulation included?", a: "Insulated builds cover walls and roof — roof sun-load is the largest heat source, so insulating walls alone would waste the benefit." },
          { q: "Does insulation help in cold regions too?", a: "Yes — the same foam core that keeps heat out keeps warmth in, which is why PUF cabins serve hill-region sites year-round." },
          { q: "What AC size does a 20×8 cabin need?", a: "With PUF insulation, a compact split unit typically holds a 20×8 comfortably; exact sizing depends on region, glazing and occupancy — ask when ordering and the provision will match." },
          { q: "Are insulated panels heavier to transport?", a: "The panel is light for its stiffness — foam is mostly air. Transport and craneage are unaffected compared to a sheet cabin of the same size." },
        ],
        related: [
          { label: "Price & cost guide", href: "/products/portable-cabin/price-and-cost-guide" },
          { label: "For schools & classrooms", href: "/products/portable-cabin/for-schools-and-classrooms" },
        ],
      },
      {
        slug: "installation-and-site-preparation",
        keyword: "portable cabin installation",
        title: "Portable Cabin Installation & Site Preparation",
        metaDescription:
          "How a portable cabin is installed: base preparation, crane access, levelling, utility hook-ups and the day-of-delivery sequence, step by step.",
        h1: "Portable Cabin Installation & Site Preparation",
        intro: [
          "A cabin's installation day is short when the site is ready. This is the exact preparation we ask of every customer, the delivery-day sequence, and the small details — gate width, overhead lines, level ground — that decide whether placement takes an hour or an afternoon.",
        ],
        sections: [
          {
            heading: "Preparing the base",
            paragraphs: [
              "Cabins sit on a simple level base: compacted ground with concrete pads or blocks under the load points, or a low plinth where the site floods. The base does two jobs — keeping the cabin level so doors and windows operate sweetly, and lifting the underside clear of standing water.",
              "Levelness matters more than strength; the cabin's steel base frame spreads its weight, but a twisted base means binding doors from day one.",
            ],
          },
          {
            heading: "Access for the lorry and crane",
            paragraphs: [
              "The cabin arrives on a lorry and lifts into place by crane or hydra. Walk the route before delivery day: gate width, turning space, overhead cables and tree branches, and firm ground where the crane will set its outriggers. If access is tight, tell us the constraints and we plan the lift accordingly — or size the cabin to what the route allows.",
            ],
            bullets: [
              "Clear gate and route wide enough for a lorry",
              "Firm, level ground for crane outriggers",
              "No live overhead lines across the lift path",
              "Someone on site with placement authority",
            ],
          },
          {
            heading: "Delivery day, step by step",
            paragraphs: [
              "The lorry arrives, the crane slings the cabin from its lifting points, and the cabin lands on the prepared base and gets levelled. Utilities connect to the wall points — power to the DB, water and drain where wet areas exist — and the cabin is handed over the same day. Total time on a prepared site is measured in hours.",
            ],
          },
        ],
        faqs: [
          { q: "Do I need a concrete foundation?", a: "No — a level base of compacted ground with pads or a low plinth is sufficient. The cabin's steel base frame does the structural work." },
          { q: "What crane size is needed?", a: "It depends on cabin size and how far the crane must reach from where it can stand. Share site photos and cabin size and the correct crane comes with the delivery plan." },
          { q: "Can a cabin go on a rooftop?", a: "Frequently done — subject to the building's load capacity and crane reach. A structural check of the roof and a lift plan come first." },
          { q: "How long does installation take?", a: "On a prepared site, placement and levelling take hours, not days. Factory-finished interiors mean no site-side fit-out stage." },
          { q: "Who connects electricity and water?", a: "Your site electrician and plumber connect supply to the cabin's external points — the internal wiring and plumbing arrive complete and tested." },
        ],
        related: [
          { label: "Transport & delivery guide", href: "/products/portable-cabin/transport-and-delivery" },
          { label: "Sizes & dimensions guide", href: "/products/portable-cabin/sizes-and-dimensions" },
        ],
      },
      {
        slug: "maintenance-and-lifespan",
        keyword: "portable cabin lifespan",
        title: "Portable Cabin Lifespan & Maintenance",
        metaDescription:
          "How long a portable cabin lasts and the maintenance that gets it there: coatings, seals, roof care, electrical checks and a simple annual routine.",
        h1: "Portable Cabin Lifespan & Maintenance Guide",
        intro: [
          "A steel cabin built and coated properly is a long-term asset — our cabins are built to last 15 to 25 years with basic care. The care itself is modest; this page is the entire routine.",
        ],
        sections: [
          {
            heading: "Why steel cabins last",
            paragraphs: [
              "The structure is welded MS steel protected by anti-corrosive primer and finish coats; wall skins are pre-painted steel that carries its coating from the mill. Weather reaches a cabin's life mainly through neglected details — a blocked drain path, a damaged seal, a scratch left bare — which is why the maintenance routine is short but worth doing.",
            ],
          },
          {
            heading: "The annual routine",
            paragraphs: [
              "Once a year, walk the cabin: clear roof drainage and check the roof seams, inspect door and window seals, touch up any coating scratch before monsoon, and test the electrical DB and earth. After any relocation, re-check levelness — most door and window complaints trace back to a base that settled.",
            ],
            bullets: [
              "Clear roof drainage; inspect seams before monsoon",
              "Check door/window seals; replace worn gaskets",
              "Touch up coating scratches promptly",
              "Test MCB and earthing annually",
              "Re-level after any relocation or ground settlement",
            ],
          },
          {
            heading: "Repairs and refurbishment",
            paragraphs: [
              "Panels, doors, windows and flooring are all replaceable items — a cabin that looks tired after a decade of site duty refurbishes into near-new condition for a fraction of replacement cost. We provide a maintenance guide with every delivery, and our after-sales team is a phone call away.",
            ],
          },
        ],
        faqs: [
          { q: "How long does a portable cabin last?", a: "Built to last 15–25 years with proper care — the routine is minimal: periodic cleaning, seal and joint checks, and clear drainage." },
          { q: "Do cabins rust?", a: "The structure is primed and painted against corrosion and the skins are pre-painted steel. Rust starts at neglected scratches — touch them up and the cabin stays sound." },
          { q: "Can worn parts be replaced?", a: "Yes — panels, doors, windows, flooring and fittings are all serviceable or replaceable, which is what makes refurbishment economical." },
          { q: "Does relocation shorten a cabin's life?", a: "Not when lifted correctly from its lifting points onto a level base. Re-check levelness after every move — that is the one post-move task that matters." },
          { q: "Is there after-sales support?", a: "Yes — a maintenance guide ships with every cabin and our after-sales team is available on call for repairs and parts." },
        ],
        related: [
          { label: "Warranty information", href: "/warranty" },
          { label: "Installation & site preparation", href: "/products/portable-cabin/installation-and-site-preparation" },
        ],
      },
      {
        slug: "buying-guide-new-vs-used",
        keyword: "buy portable cabin new vs used",
        title: "Buying a Portable Cabin: New vs Used",
        metaDescription:
          "New or used portable cabin? A practical comparison of cost, condition risk, customisation and lifespan — and how to inspect a second-hand cabin before paying.",
        h1: "Buying a Portable Cabin: New vs Used",
        intro: [
          "The used market is real — cabins outlive projects, and good second-hand units exist. So do rough ones with hidden corrosion and dead wiring. This guide is the honest comparison, plus the inspection list we would use ourselves.",
        ],
        sections: [
          {
            heading: "The honest comparison",
            paragraphs: [
              "New wins on certainty: exact size and layout, fresh coatings and seals, wiring you can trust, warranty and after-sales, and full remaining lifespan. Used wins on one axis — headline price — and occasionally on immediate availability.",
              "The gap narrows once a used cabin needs re-coating, new seals, rewiring or floor repair. Price those honestly before comparing, and factor that a used cabin is the size it is — customisation after the fact costs more than specifying at the factory.",
            ],
          },
          {
            heading: "Inspecting a used cabin",
            paragraphs: [
              "Look where problems hide: the base frame underside for structural rust, floor edges for soft decking, roof seams for patched leaks, and the DB for scorched or improvised wiring. Operate every door and window — binding usually means a twisted frame from a bad lift, which no cosmetic repair fixes.",
            ],
            bullets: [
              "Base frame underside: structural corrosion",
              "Floor edges and wet-area corners: soft or swollen decking",
              "Roof seams: patches, sealant smears, water stains inside",
              "Electrical DB: scorching, loose terminals, missing earth",
              "Doors and windows: smooth operation proves a straight frame",
            ],
          },
          {
            heading: "A middle path",
            paragraphs: [
              "For short-duration needs, renting outperforms both buying options — no capital, no resale problem. And where budget drives the decision toward used, consider a new cabin in a plain specification instead: sheet walls now, with the option to add insulation or fit-out later.",
            ],
          },
        ],
        faqs: [
          { q: "How much cheaper is a used cabin?", a: "Varies with condition and age. Compare honestly: add the cost of re-coating, seals, wiring checks and any floor repair to the used price before deciding." },
          { q: "What is the biggest risk with used cabins?", a: "Hidden structural corrosion in the base frame and moisture-damaged decking — both expensive to fix and invisible in photos. Inspect underneath before paying." },
          { q: "Do used cabins come with warranty?", a: "Typically no. New cabins from us carry warranty and after-sales support, which is part of the price difference." },
          { q: "Can a used cabin be modified?", a: "Yes, but factory customisation of a new build is cleaner and usually cheaper than cutting into an existing cabin." },
          { q: "Should I rent instead?", a: "For needs under a year, usually yes — rental avoids capital cost and resale hassle. See our rental guide for how hiring works." },
        ],
        related: [
          { label: "Used shipping containers for sale", href: "/products/used-shipping-container-for-sale" },
          { label: "Porta cabins on rent", href: "/blog/porta-cabins-on-rent" },
        ],
      },
      {
        slug: "transport-and-delivery",
        keyword: "portable cabin transport",
        title: "Portable Cabin Transport & Delivery Across India",
        metaDescription:
          "How portable cabins are transported: lorry sizes per cabin size, crane unloading, route planning, pan-India delivery timelines and what affects freight cost.",
        h1: "Portable Cabin Transport & Delivery",
        intro: [
          "Every cabin we build travels by road, and delivery is part of the engineering: cabins are sized to ship legally, lifted from designed lifting points, and quoted for freight from your PIN code before you pay. This page covers how transport works and what drives its cost.",
        ],
        sections: [
          {
            heading: "How a cabin travels",
            paragraphs: [
              "Cabins up to 20 ft ride a standard lorry; 40 ft units use a trailer. The 8 ft width is not an accident — it keeps every standard cabin within legal road width so transport needs no special permissions and no escort, which keeps freight predictable.",
              "At both ends a crane or hydra does the lifting, slinging the cabin from its lifting points so the structure carries the load the way it was designed to.",
            ],
          },
          {
            heading: "What freight costs depend on",
            paragraphs: [
              "Distance dominates, then cabin size, then site access — a site a crane can park beside costs less to unload than one needing long reach. At checkout, transport is calculated from your delivery PIN code and shown in the total before payment, so freight is never a surprise line item afterwards.",
            ],
            bullets: [
              "Distance from the factory to your PIN code",
              "Cabin size: lorry vs trailer",
              "Unloading access: crane position and reach",
            ],
          },
          {
            heading: "Pan-India delivery",
            paragraphs: [
              "We deliver across India from our Tamil Nadu factory near Hosur. Long-haul deliveries are scheduled with transit time agreed upfront; the cabin arrives factory-finished, so distance adds transit days but no extra site work at your end.",
            ],
          },
        ],
        faqs: [
          { q: "How is transport cost calculated?", a: "From your delivery PIN code at checkout — distance, cabin size and unloading needs set the figure, and you see it before paying." },
          { q: "Do I need to arrange the crane?", a: "Unloading is planned with the delivery. Site access information from you decides the crane; tight sites just need to be flagged early." },
          { q: "Can cabins be delivered anywhere in India?", a: "Yes — pan-India delivery is standard, scheduled with agreed transit time for long hauls." },
          { q: "Is a permit needed to transport a cabin?", a: "Standard cabins are sized within legal road dimensions, so no special permits or escorts are needed — one reason the 8 ft width is standard." },
          { q: "What if my street is too narrow for a lorry?", a: "Tell us before dispatch — options include smaller cabins delivered separately and joined on site, or a hydra shuttling from the nearest accessible point." },
        ],
        related: [
          { label: "Installation & site preparation", href: "/products/portable-cabin/installation-and-site-preparation" },
          { label: "Shipping & delivery policy", href: "/shipping" },
        ],
      },
      {
        slug: "materials-ms-vs-puf",
        keyword: "portable cabin material ms vs puf",
        title: "Portable Cabin Materials: MS Sheet vs PUF Panel",
        metaDescription:
          "MS sheet walls or PUF sandwich panels? A straight comparison of the two portable cabin wall systems — comfort, cost, durability and which use suits each.",
        h1: "Portable Cabin Materials: MS Sheet vs PUF Panel",
        intro: [
          "Every cabin we build shares the same welded MS steel structure — the choice is the wall system on that skeleton. Plain MS/GI sheet and PUF sandwich panel serve different jobs well, and picking correctly saves money in both directions.",
        ],
        sections: [
          {
            heading: "The two wall systems",
            paragraphs: [
              "Sheet walls are single-skin pre-painted steel on the frame: robust, economical, quick — and thermally transparent, so the interior tracks the outside temperature. PUF panels sandwich a rigid foam core between two steel skins: stiffer, sealed, and genuinely insulated, at a higher panel cost.",
              "The structure beneath is identical either way — galvanized C and Z purlins on a welded MS frame — so durability of the skeleton is not the differentiator; comfort and running cost are.",
            ],
          },
          {
            heading: "Which to choose, by use",
            paragraphs: [
              "Choose sheet for stores, plant rooms, short-duration site presence and anywhere people spend minutes rather than hours. Choose PUF for offices, classrooms, clinics, accommodation and anywhere with AC — the insulation pays back through smaller AC units and lower running hours.",
            ],
            bullets: [
              "Sheet: storage, utility rooms, short projects, tight budgets",
              "PUF: offices, classrooms, clinics, living space, AC use",
              "Same welded MS structure and lifespan underneath both",
            ],
          },
          {
            heading: "Mixing systems",
            paragraphs: [
              "A common cost-smart build: PUF for the occupied rooms, sheet for the attached store — one cabin, two wall systems, priced accordingly. Specify by room and the factory builds it that way.",
            ],
          },
        ],
        faqs: [
          { q: "Is a PUF cabin stronger than a sheet cabin?", a: "Structurally they share the same welded MS frame. The PUF panel itself is stiffer than single sheet, but strength and lifespan come from the frame in both cases." },
          { q: "How much more does PUF cost?", a: "PUF panels carry a real premium over sheet per square metre of wall. Whether it pays back depends on occupancy: for daily-occupied spaces it usually does, via comfort and smaller AC." },
          { q: "Can a sheet cabin be upgraded to PUF later?", a: "Walls can be re-skinned, but it is site work and costs more than choosing PUF at the factory. If AC or all-day occupancy is likely, start with PUF." },
          { q: "Which lasts longer?", a: "Lifespan tracks the structure and coating care, not the wall system — both builds reach the same 15–25 year service life with basic maintenance." },
          { q: "What is GI used for?", a: "Galvanized steel appears in purlins and skins where extra corrosion protection helps — coastal and high-humidity sites benefit most." },
        ],
        related: [
          { label: "MS portable cabin — full guide", href: "/blog/ms-portable-cabin-durable-mild-steel-modular-building" },
          { label: "Insulation & cooling", href: "/products/portable-cabin/insulation-and-cooling" },
        ],
      },
    ],
  },
];

/** Group lookup by parent slug. */
export function getChildGroup(parentSlug: string): ProductChildGroup | undefined {
  return productChildGroups.find((g) => g.parentSlug === parentSlug);
}

/** Single child lookup. */
export function getChildPage(
  parentSlug: string,
  childSlug: string,
): { group: ProductChildGroup; page: ProductChildPage } | undefined {
  const group = getChildGroup(parentSlug);
  const page = group?.children.find((c) => c.slug === childSlug);
  return group && page ? { group, page } : undefined;
}

/** Every (parent, child) pair — the route's generateStaticParams and the sitemap read this. */
export function allChildParams(): { slug: string; child: string }[] {
  return productChildGroups.flatMap((g) => g.children.map((c) => ({ slug: g.parentSlug, child: c.slug })));
}
