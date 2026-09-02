/**
 * CONTAINER OFFICE — PER-SIZE EDITORIAL CONTENT + THE FAMILY MATERIAL BREAK-UP.
 *
 * The COMMERCE truth for these sizes (price, SKU, availability, gates, URL) lives in
 * src/data/productFamilies.ts and is not duplicated here. This module holds what that file
 * deliberately does not: the WRITING — genuinely size-specific introductions, layouts,
 * limitations and FAQs for each standard size, plus the family's structured specification
 * break-up and its included / optional / customer-scope lists.
 *
 * ── WHY A SEPARATE REGISTRY ─────────────────────────────────────────────────────────────────
 * productFamilies.ts is machine-consumed by the cart, the feed, the schema and 900+ test
 * assertions; long-form prose does not belong inside it. This registry follows the pattern
 * productChildPages.ts established: content keyed by slug, read by the view, rendering nothing
 * when a key is absent — so adding a size's content can never break a size that has none.
 *
 * ── THE CONTENT RULES (enforced by scripts/product-variants.test.ts §14) ────────────────────
 *   • NO ₹ figure anywhere. Prices come from the commerce catalogue or they do not appear.
 *   • NO seating / occupancy counts. No capacity figure has ever been owner-confirmed, so
 *     layouts are described by FUNCTION (what the room is), never by headcount.
 *   • NO height claims. The external height is unconfirmed per size (see
 *     ProductFamily.heightConfirmedPerSize); only the qualified "family standard" row in the
 *     spec table may mention it, and that row already exists.
 *   • NO lead-time, warranty or transport promises. Lead time renders from variant.leadTime;
 *     no warranty term exists anywhere in this codebase and none is invented here.
 *   • Every intro is UNIQUE — written about the size, not templated around it. The test
 *     asserts pairwise distinctness.
 *
 * ── WHERE THE SPECIFICATION ROWS COME FROM ──────────────────────────────────────────────────
 * Three owner-verified sources, never blended silently:
 *   1. The catalogue record (products.ts id 10) and the family's includedConfiguration —
 *      public, long-standing claims (50 mm PUF/EPS/Rockwool panels, concealed copper wiring,
 *      MCB DB + LED, vinyl/laminate on cement board, aluminium/uPVC windows, steel door,
 *      AC provision, lifting hooks).
 *   2. The owner's own Material Master (src/lib/boq/seedMaterials.ts) — the exact sections
 *      and IS grades the admin costing engine builds these cabins from (ISMC 100 × 50 base,
 *      SHS 50 × 50 × 3 posts, IS 2062 E250 / IS 4923 YSt 210…). Presented as the STANDARD
 *      fabrication specification, with the final confirmation deferred to the quotation,
 *      because the admin can retune the master per project.
 *   3. Nothing else. specTemplates.ts carries different figures (1.2 mm CR sheet, 50 kg/m³
 *      wool) for a specific client template; those are NOT repeated here — publishing two
 *      conflicting thicknesses for the same wall is how spec tables lose a customer's trust.
 *
 * Quantities, weights and component prices are PER-SIZE COMPUTED values (the BOQ engine's
 * job) and are deliberately absent: a public row stating "14 floor joists" for a size the
 * engine has never priced would be an invented number. The break-up explains WHAT the cabin
 * is built from; the quotation states how much of it your configuration uses.
 */

/** One row of the specification break-up. Public fields only — no cost, no supplier. */
export interface SpecBreakupRow {
  /** Component name as a customer should read it. */
  item: string;
  /** What the component does in the build — one plain sentence. */
  description: string;
  /** Material / standard reference, when owner-verified (e.g. "IS 2062 E250"). */
  materialGrade?: string;
  /** Section or thickness, when owner-verified (e.g. "ISMC 100 × 50, 6 mm"). */
  section?: string;
  /** Scope of the standard configuration. */
  status: "included" | "optional" | "customer-scope";
  /** A short qualification shown with the row, when honesty needs one. */
  customerNote?: string;
}

export interface SpecBreakupGroup {
  /** Stable id — used for the accordion state and anchor links. */
  id: string;
  title: string;
  /** One-line summary shown on the collapsed group. */
  summary: string;
  rows: SpecBreakupRow[];
}

export interface SizeLayoutOption {
  title: string;
  description: string;
}

export interface SizeFaq {
  question: string;
  answer: string;
}

export interface ContainerOfficeSizeContent {
  /** Joins to SizeVariant.sizeSlug in productFamilies.ts. */
  sizeSlug: string;
  /** One sentence: who this size is genuinely for. Shown under the H1 area. */
  positioning: string;
  /** 2–3 paragraphs written FOR this size. Never shared between sizes. */
  intro: string[];
  /** What the size is best used as. Function, not headcount. */
  bestUses: string[];
  /** Layouts that are realistically possible at this footprint — and only those. */
  layouts: SizeLayoutOption[];
  /** The honest constraint — what a buyer gives up at this size vs going larger. */
  limitations: string;
  /** Slug of the natural next size up, for the "need more room?" cross-link. */
  stepUpSlug?: string;
  /** Rendered visibly AND passed to FAQPage schema — same array, by rule. */
  faqs: SizeFaq[];
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * THE FAMILY SPECIFICATION BREAK-UP — one definition, rendered on every size page.
 *
 * Family-level truth: which components make up the cabin. Identical across sizes BY DESIGN —
 * the sizes differ in dimensions and quantities, not in what the cabin is made of, and
 * pretending otherwise would be the manufactured-uniqueness this codebase refuses to do.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Shown once above the break-up. The honesty frame for every grade/section stated below. */
export const SPEC_BREAKUP_DISCLAIMER =
  "This break-up describes the standard fabricated specification these cabins are built to. " +
  "Exact sections, makes and quantities for your size and layout are stated in the written " +
  "quotation, which is the binding specification. Where a Corten container shell is used " +
  "instead of a fabricated frame, the shell replaces the wall framing rows below and your " +
  "quotation says so explicitly.";

export const CONTAINER_OFFICE_SPEC_GROUPS: SpecBreakupGroup[] = [
  {
    id: "structural-frame",
    title: "Structural frame",
    summary: "MS base chassis, corner and intermediate posts, wall framing and lifting points",
    rows: [
      {
        item: "Base frame / chassis",
        description:
          "The perimeter chassis the whole cabin sits on and is lifted by. Carries the floor joists and transfers the crane loads.",
        materialGrade: "IS 2062 E250",
        section: "MS channel ISMC 100 × 50, 6 mm",
        status: "included",
      },
      {
        item: "Floor cross members",
        description: "Joists spanning the chassis under the floor deck.",
        materialGrade: "IS 4923 YSt 210",
        section: "MS rectangular tube 100 × 50 × 3 mm",
        status: "included",
      },
      {
        item: "Corner and intermediate posts",
        description: "The vertical structure at each corner and along the walls.",
        materialGrade: "IS 4923 YSt 210",
        section: "MS square tube 50 × 50 × 3 mm",
        status: "included",
      },
      {
        item: "Wall stiffeners",
        description: "Intermediate studs that keep long wall runs flat and rigid.",
        materialGrade: "IS 4923 YSt 210",
        section: "MS square tube 40 × 40 × 2 mm",
        status: "included",
      },
      {
        item: "Top frame and rails",
        description: "The head-level frame tying the posts together and carrying the roof.",
        materialGrade: "IS 4923 YSt 210",
        section: "MS square tube 50 × 50 × 2 mm",
        status: "included",
      },
      {
        item: "Roof cross members",
        description: "Purlins spanning the top frame under the roof sheet.",
        materialGrade: "IS 811",
        section: "C-purlin 75 × 40 × 2 mm",
        status: "included",
      },
      {
        item: "Lifting lugs / corner plates",
        description:
          "Welded corner lifting points for crane handling and flatbed transport — how the cabin relocates between sites.",
        materialGrade: "IS 2062 E250",
        section: "MS angle 50 × 50 × 5 mm lugs, M12 grade 8.8 fasteners",
        status: "included",
      },
    ],
  },
  {
    id: "wall-and-roof",
    title: "Wall and roof",
    summary: "Insulated sandwich-panel walls, lined interior, weathered steel roof",
    rows: [
      {
        item: "Wall panels",
        description:
          "Factory-made insulated sandwich panels forming the external wall and its finished inner face in one component.",
        section: "50 mm PUF / EPS / Rockwool core",
        status: "included",
        customerNote: "Core material is selected at quotation to suit the site and budget.",
      },
      {
        item: "Internal lining",
        description:
          "Pre-painted steel inner skin — a wipe-clean office wall surface that needs no site painting.",
        materialGrade: "PPGI, factory finish",
        status: "included",
      },
      {
        item: "Roof sheet",
        description: "Profiled steel roof sheet laid to shed water, over the purlins.",
        materialGrade: "Pre-coated steel (PPGI/PPGL)",
        section: "0.5 mm trapezoidal profile",
        status: "included",
      },
      {
        item: "Ceiling",
        description: "Plain pre-painted ceiling sheet closing the roof cavity.",
        materialGrade: "PPGI, factory finish",
        status: "included",
      },
      {
        item: "Sealant and flashing",
        description:
          "Neutral-cure silicone sealing and flashings at joints and openings, keeping the envelope weather-tight.",
        materialGrade: "ASTM C920 neutral-cure silicone",
        status: "included",
      },
    ],
  },
  {
    id: "flooring",
    title: "Flooring",
    summary: "Board deck on steel joists with a vinyl or laminate finish",
    rows: [
      {
        item: "Floor deck",
        description: "Rigid board deck fixed over the steel joists.",
        materialGrade: "IS 14276 cement board (marine ply where specified)",
        section: "18 mm",
        status: "included",
      },
      {
        item: "Floor finish",
        description: "Office-grade sheet finish over the deck — the surface you walk on.",
        materialGrade: "Vinyl (IS 3462) or laminate",
        status: "included",
        customerNote: "Finish selected at quotation. Premium finishes are an optional upgrade.",
      },
    ],
  },
  {
    id: "doors-and-windows",
    title: "Doors and windows",
    summary: "Steel entrance door, glazed aluminium or uPVC windows",
    rows: [
      {
        item: "Entrance door",
        description: "Steel entrance door with lock — the cabin's secure main opening.",
        materialGrade: "MS, factory finished",
        status: "included",
      },
      {
        item: "Windows",
        description: "Glazed sliding windows bringing daylight into the office.",
        materialGrade: "Powder-coated aluminium or uPVC",
        status: "included",
        customerNote: "Count and positions are set by your layout at quotation.",
      },
      {
        item: "Window safety grills",
        description: "MS security grills over the windows for unattended sites.",
        materialGrade: "MS square bar",
        status: "optional",
      },
      {
        item: "Internal door",
        description: "A second door where a partition creates a separate cabin or room.",
        status: "optional",
        customerNote: "Applies only to layouts with an internal partition.",
      },
    ],
  },
  {
    id: "electrical",
    title: "Electrical",
    summary: "Concealed copper wiring, distribution board, LED lighting and points",
    rows: [
      {
        item: "Wiring",
        description: "Concealed copper wiring run in conduit from the distribution board.",
        materialGrade: "FR copper, IS 694",
        status: "included",
      },
      {
        item: "Distribution board",
        description: "MCB distribution board — the cabin's own protected supply point.",
        materialGrade: "IS 8623",
        status: "included",
      },
      {
        item: "Lighting",
        description: "LED light fittings sized to the cabin.",
        status: "included",
      },
      {
        item: "Switches and sockets",
        description: "Modular switch and socket points for desks and equipment.",
        status: "included",
        customerNote: "Point count follows your layout; extra points are a simple add-on.",
      },
      {
        item: "Air-conditioning provision",
        description:
          "Wall provision and a dedicated point for a split AC sized to the cabin volume.",
        status: "included",
        customerNote: "The AC UNIT itself is supplied as an optional add-on, not included.",
      },
      {
        item: "Data / network conduit",
        description: "Conduit provision for LAN cabling alongside the power runs.",
        status: "optional",
      },
    ],
  },
  {
    id: "finishing",
    title: "Finishing",
    summary: "Surface preparation, primer and enamel system inside and out",
    rows: [
      {
        item: "Surface preparation",
        description: "Steelwork cleaned and prepared before any coating goes on.",
        status: "included",
      },
      {
        item: "Primer",
        description: "Red-oxide primer coat on the fabricated steel.",
        materialGrade: "IS 2074",
        status: "included",
      },
      {
        item: "Finish paint",
        description: "Synthetic enamel finish coats over the primer.",
        materialGrade: "IS 2932, two coats",
        status: "included",
      },
      {
        item: "Silicone / sealing",
        description: "Final sealing pass at junctions, sills and penetrations.",
        status: "included",
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * SCOPE — what the standard price covers, what is an add-on, what stays with the customer.
 *
 * Every line is grounded in existing owner-published copy: the family's includedConfiguration,
 * the checkout's own separate Transport and Installation lines, and the portable-cabin
 * installation guide ("simple level base", "crane unloading quoted separately").
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

export const CONTAINER_OFFICE_OPTIONAL_ITEMS: { item: string; note: string }[] = [
  { item: "Split air conditioner", note: "The cabin ships with the AC provision; the unit itself is priced as an add-on." },
  { item: "Office furniture", note: "Desks, chairs and storage from our modular furniture range, quoted per layout." },
  { item: "Attached toilet cubicle", note: "Where the footprint allows — discussed against your layout at quotation." },
  { item: "Pantry counter", note: "A wet-point counter with provision for appliances, where the layout allows." },
  { item: "Additional or uPVC windows", note: "Extra openings, or a uPVC upgrade in place of aluminium." },
  { item: "Window safety grills", note: "MS grills for cabins left unattended on open sites." },
  { item: "Additional electrical and data points", note: "Extra sockets and LAN conduit beyond the standard count." },
];

export const CONTAINER_OFFICE_CUSTOMER_SCOPE: { item: string; note: string }[] = [
  { item: "Transport to site", note: "Calculated from your delivery PIN code at checkout or in the quotation — never hidden in the cabin price." },
  { item: "Crane / offloading at site", note: "Unloading arrangements depend entirely on your site access and are quoted separately." },
  { item: "On-site installation & positioning", note: "An optional chargeable service — many buyers with a crane on site place the cabin themselves." },
  { item: "Level base at site", note: "The cabin sits on a simple level base — compacted ground with concrete pads or a low plinth. No building-grade foundation is needed, and the base is customer scope." },
  { item: "Electrical supply to the cabin", note: "Power up to the cabin's distribution board is the site electrician's scope; everything downstream is ours." },
  { item: "Water and drainage connections", note: "Applies only to layouts with a toilet or pantry — site-side plumbing connections are customer scope." },
];

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * PER-SIZE CONTENT — five sizes, five genuinely different pieces of writing.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

const SIZES: ContainerOfficeSizeContent[] = [
  {
    sizeSlug: "10x10-ft",
    positioning:
      "The smallest standard container office — a single square room for a gate, a guard-plus-clerk post, or one person working at the front of a site.",
    intro: [
      "The 10 ft × 10 ft is the entry point of the range, and its square plan is the reason it works. " +
        "At 100 sq ft, a long narrow room would feel like a corridor; a square one takes a desk against " +
        "one wall, a chair for a visitor, and still leaves the door swing clear. That is exactly the shape " +
        "of job it gets bought for — the gate office that checks vehicles in, the security post that also " +
        "does paperwork, the ticket or enquiry counter at the front of a larger site.",
      "Because it is the lightest unit in the range, it is also the least demanding to place: it needs the " +
        "smallest clear area, the shortest lift, and the least road space of any standard size. Sites that " +
        "cannot take a twenty-footer through the gate can very often take this.",
    ],
    bestUses: [
      "Gate and security office",
      "Site entry / visitor check-in post",
      "Single-person site office",
      "Ticket or enquiry counter",
      "Watchman cabin with a working desk",
    ],
    layouts: [
      {
        title: "Single open room",
        description:
          "One desk against a wall, visitor chair, and storage above or below the desk line. The square plan keeps the door swing and the working area from fighting each other.",
      },
      {
        title: "Counter layout",
        description:
          "A service window on one face with the desk behind it — the classic gate-pass and enquiry arrangement, keeping visitors outside the cabin.",
      },
    ],
    limitations:
      "This is a one-room footprint, honestly stated: at 100 sq ft an internal partition would leave two " +
      "spaces that are each too small to work in, so we do not recommend one. If the job needs a separate " +
      "cabin for a manager, or a toilet inside the unit, the 20 ft sizes are where those layouts start to work.",
    stepUpSlug: "20x8-ft",
    faqs: [
      {
        question: "Can a 10 ft x 10 ft container office have a toilet inside?",
        answer:
          "We do not recommend it at this footprint — a toilet cubicle would take roughly a fifth of the room and put a wet area beside your desk. The usual arrangement is a separate portable toilet cabin beside the office, which we also manufacture, or stepping up to a 20 ft size where an attached toilet layout works properly.",
      },
      {
        question: "What is a 10 ft x 10 ft container office used for?",
        answer:
          "Mostly gate duty: security posts that also handle paperwork, visitor check-in at site entrances, and single-person offices at the front of a project. The square plan suits a desk, a visitor chair and a service window better than a narrow room of the same area would.",
      },
      {
        question: "How is the price for this size decided?",
        answer:
          "Each standard size is priced as a complete factory-finished cabin against your chosen layout and options. Request a quotation for this size and you receive a written price covering the cabin itself, with transport calculated separately from your delivery PIN code — nothing is estimated from a rate per square foot.",
      },
    ],
  },
  {
    sizeSlug: "20x8-ft",
    positioning:
      "The container-module classic — a 20 ft × 8 ft office on the footprint that travels most easily by road and crane.",
    intro: [
      "The 20 ft × 8 ft exists because of logistics. Its footprint matches the standard twenty-foot " +
        "container module, which means it travels on an ordinary lorry, lifts with a modest crane, and " +
        "fits sites and routes that were planned around container traffic. If your cabin will move " +
        "between projects more than once, that compatibility is worth having.",
      "Inside, 160 sq ft on a 8 ft width sets the working pattern: desks run along the walls rather than " +
        "facing each other across the room, with the circulation down the middle. It is a genuinely " +
        "workable small office arranged that way — a linear working wall, files at the far end, and the " +
        "door at one end keeping the interruptions away from the desks.",
    ],
    bestUses: [
      "Compact site office that relocates often",
      "Engineer's office at a constrained site",
      "Billing or dispatch office in a yard",
      "Supervisor's cabin beside a weighbridge",
    ],
    layouts: [
      {
        title: "Linear open office",
        description:
          "Desks in a run along one long wall, storage on the other, circulation between. The arrangement the 8 ft width is made for.",
      },
      {
        title: "Office with end store",
        description:
          "A light partition near the far end creates a lockable store or records room, keeping the working area clear.",
      },
    ],
    limitations:
      "The 8 ft width is the trade-off for the transport advantage: face-to-face desk arrangements and " +
      "meeting tables do not sit comfortably in it. If you need people meeting around a table rather than " +
      "working along a wall, the 20 ft × 10 ft gives the extra width that makes that possible.",
    stepUpSlug: "20x10-ft",
    faqs: [
      {
        question: "Why choose 20 ft x 8 ft instead of 20 ft x 10 ft?",
        answer:
          "Choose it for the moves, not the interior. The 8 ft width matches the standard container module, so this size travels and lifts with the least fuss of any office in the range. If the cabin will sit in one place for years, the two extra feet of the 20 ft x 10 ft buy a noticeably more comfortable room.",
      },
      {
        question: "What layout works best in a 20 ft x 8 ft office?",
        answer:
          "A linear one: desks along one long wall, storage opposite, and the door at one end. The width rewards that arrangement and punishes face-to-face desks. An end partition for a lockable store is the one subdivision that works well.",
      },
      {
        question: "Is this the same as a converted shipping container?",
        answer:
          "It shares the footprint, which is where the transport advantage comes from, but our standard build is a fabricated MS structure with insulated sandwich-panel walls — a purpose-built office, not a cut-open freight box. Where a genuine Corten container shell is used instead, your quotation states that explicitly.",
      },
    ],
  },
  {
    sizeSlug: "20x10-ft",
    positioning:
      "The standard site office of the range — 200 sq ft with enough width for a partition, and the size most projects actually order.",
    intro: [
      "If one size is the default answer, it is this one. The 20 ft × 10 ft carries 200 sq ft on a width " +
        "that changes how the room works: at 10 ft, two people can face each other across a desk, a small " +
        "table fits without blocking the door, and a partition can come off one end without strangling " +
        "either space. That flexibility is why it is the family's reference size — the one the size " +
        "selector opens on.",
      "It is the honest middle of the range in every direction. Big enough to be a proper project office " +
        "with a private corner for the engineer in charge; small enough that it still places easily on a " +
        "working site and moves on without ceremony when the project closes.",
    ],
    bestUses: [
      "Standard project site office",
      "Engineer's office with a private cabin",
      "Sales or booking office at a development",
      "Clerk-of-works office on a construction site",
    ],
    layouts: [
      {
        title: "Open office",
        description:
          "The full 200 sq ft as one room — desks along the walls with a shared table in the middle, the arrangement that seats a working site team.",
      },
      {
        title: "Office with manager cabin",
        description:
          "A partition across one end creates a private cabin with the balance as open office — the classic site-office split this width exists for.",
      },
      {
        title: "Office with reception counter",
        description:
          "A counter inside the door faces visitors, with the working desks beyond — suited to booking and sales offices where the public walks in.",
      },
    ],
    limitations:
      "One partition is the sensible maximum: dividing 200 sq ft twice leaves rooms that are each too " +
      "tight to furnish properly. When the brief calls for a separate meeting room as well as a manager " +
      "cabin — three spaces, not two — that is the 30 ft × 10 ft's job.",
    stepUpSlug: "30x10-ft",
    faqs: [
      {
        question: "Why is 20 ft x 10 ft called the standard size?",
        answer:
          "Because it is the size most site offices actually need: wide enough for facing desks and a partition, compact enough to place and relocate without special arrangements. It is the default size our container office pages open on for exactly that reason.",
      },
      {
        question: "Can a 20 ft x 10 ft office have a manager cabin inside?",
        answer:
          "Yes — a partition across one end is the layout this width is chosen for. You get a private cabin plus an open office in one unit. Positions of the partition, the internal door and the electrical points are set against your layout at quotation.",
      },
      {
        question: "Can I add a toilet to this size?",
        answer:
          "An attached toilet cubicle is possible at this footprint as an optional layout, with the site-side water and drainage connections in your scope. Many sites still prefer a separate toilet cabin beside the office; both routes are priced at quotation so you can compare.",
      },
    ],
  },
  {
    sizeSlug: "30x10-ft",
    positioning:
      "The project office — 300 sq ft that splits cleanly into a private cabin plus a working office, for teams that run a site rather than just supervise it.",
    intro: [
      "At 30 ft × 10 ft, the container office stops being a cabin and starts being an office in the " +
        "ordinary sense of the word. The extra ten feet over the standard size is exactly one room's " +
        "worth: a private cabin for the project manager AND an open office for the team, each properly " +
        "sized, with the partition where the layout wants it rather than where the walls force it.",
      "This is the size project-duration sites order — the office that hosts the weekly contractor " +
        "meeting, holds the drawings rack, and gives the person signing the bills a door they can close. " +
        "It still ships as one factory-finished unit and lifts onto a prepared base the same way the " +
        "smaller sizes do; it simply needs a longer clear run at site to receive it.",
    ],
    bestUses: [
      "Project manager's office with team room",
      "Site office for a project-duration deployment",
      "Consultant or PMC office at a large site",
      "Office with drawing and records room",
    ],
    layouts: [
      {
        title: "Manager cabin + open office",
        description:
          "The defining layout: a partitioned private cabin at one end, the remaining office open for the team — two proper rooms in one unit.",
      },
      {
        title: "Two-cabin layout",
        description:
          "Partitions forming two private cabins with a shared circulation space — suited to consultant teams where two people each need a door.",
      },
      {
        title: "Office with meeting corner",
        description:
          "Open plan with a table zone at the far end from the door, so meetings and desk work coexist without a partition.",
      },
    ],
    limitations:
      "What this size does not give you is a genuinely separate meeting room on top of the manager cabin " +
      "— carving a third room out of 300 sq ft leaves each space compromised. Sites that need cabin, team " +
      "office AND a meeting room in one unit are 40 ft × 10 ft territory. And being a 30 ft unit, it asks " +
      "for a correspondingly longer clear area at site for the lift and set-down.",
    stepUpSlug: "40x10-ft",
    faqs: [
      {
        question: "What layout does a 30 ft x 10 ft container office usually get?",
        answer:
          "A manager cabin partitioned at one end with the rest as open team office — the two-room split is the reason this size is ordered. Two private cabins, or an open plan with a meeting corner, are the common alternatives.",
      },
      {
        question: "How does the 30 ft size arrive at site?",
        answer:
          "As one complete factory-finished unit, the same as the smaller sizes — it is craned onto your prepared level base and is usable once power is connected. Being longer, it needs a proportionally longer clear area for the vehicle and the lift, which is worth walking the route for before delivery day.",
      },
      {
        question: "When is 30 ft x 10 ft the wrong choice?",
        answer:
          "When the cabin moves between sites every few weeks — the 20 ft sizes handle frequent relocation with less arrangement — or when you genuinely need three separate rooms, which is the 40 ft x 10 ft's brief, not this one's.",
      },
    ],
  },
  {
    sizeSlug: "40x10-ft",
    positioning:
      "The largest standard size — 400 sq ft for a full site establishment: cabins, team office and a meeting space under one roof.",
    intro: [
      "The 40 ft × 10 ft is the range's establishment office. At 400 sq ft it does what no smaller size " +
        "can: hold a private cabin, a working office and a separate meeting room at the same time, each " +
        "big enough to do its job. For infrastructure projects and long-duration sites, it replaces a " +
        "cluster of smaller cabins with one building — one delivery, one lift, one power connection.",
      "Its length is also its logistics profile: forty feet is the other standard of the container " +
        "world, so the unit travels on the vehicles and routes that already carry 40 ft modules. What it " +
        "asks of you is space at the destination — a clear, accessible run long enough to receive a " +
        "40 ft unit and the crane that places it. Where that space exists, this size delivers the most " +
        "office per delivery of anything we build as standard.",
    ],
    bestUses: [
      "Main site establishment office",
      "Project office with conference room",
      "Multi-team office on infrastructure projects",
      "Long-duration site headquarters",
    ],
    layouts: [
      {
        title: "Cabin + office + meeting room",
        description:
          "The three-room establishment layout: private cabin at one end, meeting room at the other, open team office between — the arrangement this length exists for.",
      },
      {
        title: "Conference layout",
        description:
          "A large meeting room with a supporting office — for sites where the cabin's main job is hosting reviews, inductions and client meetings.",
      },
      {
        title: "Open project office",
        description:
          "The full 400 sq ft as one team floor, desks in rows with a break-out zone at the far end from the door.",
      },
      {
        title: "Office with toilet and pantry",
        description:
          "The self-contained variant: working space plus an attached toilet cubicle and pantry counter, with the site-side water and drainage connections in your scope.",
      },
    ],
    limitations:
      "The constraint is the site, not the cabin: a 40 ft unit needs a clear, reachable run of ground " +
      "long enough to receive it and crane access alongside. Tight urban plots and congested compounds " +
      "sometimes cannot offer that, and two smaller units placed separately become the better answer — " +
      "we will tell you which, honestly, when we see the site details.",
    faqs: [
      {
        question: "Can a 40 ft x 10 ft container office have a meeting room inside?",
        answer:
          "Yes — this is the size where a genuinely separate meeting room works alongside a private cabin and an open office. Three usable rooms in one unit is precisely what the extra length buys over the 30 ft size.",
      },
      {
        question: "What should my site have ready for a 40 ft unit?",
        answer:
          "A clear run long enough to receive a 40 ft module, crane access beside it, and a simple level base — compacted ground with concrete pads or a low plinth. Walk the delivery route for gate widths and overhead lines before delivery day; if access is tight, send us the constraints and we plan the lift or advise a different configuration.",
      },
      {
        question: "Is one 40 ft office better than two 20 ft cabins?",
        answer:
          "One unit means one delivery, one lift, one power connection and no walking between cabins in the rain — better where the space exists. Two 20 ft cabins win on constrained sites and where teams genuinely work apart. Share the site plan and we will recommend one, with reasons.",
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * LOOKUPS
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

const BY_SLUG = new Map(SIZES.map((s) => [s.sizeSlug, s]));

/** Per-size content for a container-office size, or undefined (render nothing). */
export function getContainerOfficeSizeContent(
  familySlug: string,
  sizeSlug: string,
): ContainerOfficeSizeContent | undefined {
  // Scoped to the container-office family by design: this registry is that family's writing.
  if (familySlug !== "container-office") return undefined;
  return BY_SLUG.get(sizeSlug);
}

/** Every size slug this registry covers — the test asserts this matches the published ladder. */
export function containerOfficeContentSlugs(): string[] {
  return SIZES.map((s) => s.sizeSlug);
}

/** Feet → metres, one decimal — derived from the size's own definition, never typed twice. */
export function feetToMetresLabel(lengthFt: number, widthFt: number): string {
  const m = (ft: number) => (ft * 0.3048).toFixed(2);
  return `${m(lengthFt)} m × ${m(widthFt)} m`;
}
