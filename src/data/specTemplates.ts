// Rich technical-specification data model + built-in templates.
//
// The Specifications admin builder stores `sections` as JSONB, so this rich
// structure (parts, numbered items, key/value rows and sub-headed bullet
// blocks) persists without a schema migration. Legacy specs (rows-only,
// no `kind`/`number`/`blocks`) remain fully compatible.

export type SpecRow = { id: string; label: string; value: string };
export type SpecBlock = { id: string; heading: string; bullets: string[] };
export type SpecSection = {
  id: string;
  /** "part" renders as a full-width divider banner (e.g. "A. Ground Floor"). */
  kind?: "part" | "item";
  /**
   * Explicit item number shown before the title (e.g. "1", "1.1", "10.a").
   * - non-empty string  -> shown as `${number}. ${title}`
   * - empty string ("") -> no number (e.g. General Notes sub-sections)
   * - undefined         -> legacy auto-numbering by position
   */
  number?: string;
  title: string;
  rows: SpecRow[];
  blocks?: SpecBlock[];
};

export type SpecTemplate = {
  label: string;
  client_name: string;
  project_details: string;
  ref_number: string;
  sections: SpecSection[];
};

const rid = () => Math.random().toString(36).slice(2, 9);

// ---- Builder helpers (keep the template below readable) ----
const part = (title: string): SpecSection => ({
  id: rid(),
  kind: "part",
  number: "",
  title,
  rows: [],
  blocks: [],
});

const item = (
  number: string,
  title: string,
  rows: Array<[string, string]>,
  blocks: Array<[string, string[]]>,
): SpecSection => ({
  id: rid(),
  kind: "item",
  number,
  title,
  rows: rows.map(([label, value]) => ({ id: rid(), label, value })),
  blocks: blocks.map(([heading, bullets]) => ({ id: rid(), heading, bullets })),
});

// A note block (General Notes) — an item with no number and a single unheaded
// bullet list under its title.
const note = (title: string, bullets: string[]): SpecSection => ({
  id: rid(),
  kind: "item",
  number: "",
  title,
  rows: [],
  blocks: [{ id: rid(), heading: "", bullets }],
});

export const EMBASSY_360_TEMPLATE: SpecTemplate = {
  label: "Embassy 360 — Container Site Office",
  client_name: "Embassy Office Parks",
  project_details: "Embassy 360 — Container Site Office (Ground Floor, First Floor & Bought-Out Items)",
  ref_number: "POC/EMB-360/2026",
  sections: [
    // ================= A. GROUND FLOOR =================
    part("A. Ground Floor Technical Specification"),

    item(
      "1",
      "MS Fabricated Portable Container Cabin",
      [
        ["Size", "40' x 24' x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and supplying MS fabricated portable container cabin.",
          "Cabin shall be lifting and shifting type.",
          "Suitable for site office use.",
          "Complete MS structural frame shall be provided.",
          "Frame shall be fabricated with required MS sections as per approved drawing.",
          "Cabin shall be rigid, stable, and suitable for transportation and relocation.",
        ]],
        ["Structural Frame & Stiffeners", [
          "Bottom / base frame: ISMC channel heavy-duty structure / MS tube, 100 x 50 mm, 6 mm thick.",
          "Top / roof frame: MS square tube structure, 50 x 50 mm, 3 mm thick.",
          "Floor frame / stiffeners: MS rectangular tube reinforcement, 100 x 50 / 50 x 50 mm, 3 mm thick.",
          "Wall stiffeners: vertical and horizontal MS tube members, 50 x 50 mm, 3 mm thick.",
          "Approved steel makes: Jindal / Apollo / JSW / Sriraj or equivalent.",
          "All MS members treated with anti-corrosive primer and enamel paint (anti-rust finish).",
          "Complete frame welded rigid, true to line and level, suitable for transportation and relocation.",
        ]],
        ["External Cladding & Roof", [
          "External wall cladding: corrugated CR sheet, welded, mild steel, 1.2 mm (18 gauge).",
          "Roof: MS sheet, 1.2 mm (18 gauge); flat roof provided for G+1 (stacked) container.",
          "All sheet joints welded / sealed and made weather resistant.",
        ]],
        ["Insulation", [
          "Thermal insulation: glass wool (50 kg density) / Hitlon.",
          "Insulation thickness: 10 mm / 25 mm as required.",
          "Provides heat insulation to walls and roof as applicable.",
        ]],
        ["Lifting Arrangement", [
          "MS lifting hooks provided at top frame for crane lifting, shifting, and relocation.",
          "Load-bearing stacking lugs / plates provided at bottom corners for G+1 (stacked) installation.",
          "Lifting and stacking arrangement designed for safe handling of the container as a single piece.",
        ]],
        ["Wall, Floor & Internal Finish", [
          "Internal wall panels shall be finished with prefinished laminated boards.",
          "Wet area wall portions shall be finished with waterproof cement board.",
          "Premium finish shall be provided in toilet / wet areas.",
          "Flooring shall be finished with vinyl flooring.",
          "All internal joints, corners, and edges shall be neatly finished.",
          "All exposed surfaces shall be finished properly.",
        ]],
        ["Doors, Windows & Ventilation", [
          "Main entrance door shall be provided.",
          "Bulkhead light shall be provided at the main entrance.",
          "Aluminium / UPVC sliding windows shall be provided.",
          "Window size: 5' x 4'.",
          "Quantity of windows: 6 Nos.",
          "Each window shall be provided with safety grill.",
          "Windows shall be fixed properly with sealant and necessary hardware.",
        ]],
        ["Electrical Works", [
          "LED tube lights / surface-mounted lights shall be provided as required.",
          "Complete electrical wiring shall be included.",
          "Main distribution board shall be provided.",
          "Distribution board shall be protected with MCBs.",
          "Provision shall be made for:",
          "   – 5/6A switches and sockets",
          "   – 16A power sockets",
          "   – 20A power sockets",
          "Electrical works shall include conduits, wiring, switch boards, sockets, DB, MCBs, and accessories.",
          "All wiring shall be properly concealed / neatly routed as per site requirement.",
        ]],
        ["Completion", [
          "The item shall include all materials, fittings, fixtures, labour, tools, transportation support, installation, and finishing.",
          "Work shall be completed as per approved drawings and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "1.1",
      "SPC Flooring",
      [
        ["Area", "40' x 24'"],
        ["Quantity", "1 No. / As per area"],
      ],
      [
        ["Scope of Work", [
          "Providing and laying approved SPC flooring.",
          "SPC means Stone Plastic Composite flooring.",
          "Flooring shall be of approved make, shade, and finish.",
          "Flooring shall be laid over prepared surface.",
          "Surface shall be cleaned and levelled before installation.",
        ]],
        ["Included Works", [
          "Underlay shall be provided if required.",
          "Adhesive shall be used if applicable as per manufacturer's specification.",
          "Cutting, fitting, trimming, and edge finishing shall be included.",
          "Flooring edges shall be neatly finished.",
          "Skirting coordination shall be done wherever required.",
          "All joints shall be properly aligned.",
        ]],
        ["Completion", [
          "Item shall include material, labour, tools, accessories, and complete installation.",
          "Work shall be done as per manufacturer's specification, approved drawing, and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "2",
      "Additional Internal Partitions",
      [
        ["Sizes", "25' x 8'-6\" – 1 No.;  9'-6\" x 8'-6\" – 2 Nos.;  30'-3\" x 8'-6\" – 1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing additional internal partitions inside the portable cabin.",
          "Partitions shall be provided in front of toilet areas, conference room, and workstation areas.",
          "Partition framework shall be made with MS frame.",
          "Framework shall be fixed firmly to floor, wall, and ceiling structure wherever required.",
        ]],
        ["Material Specification", [
          "Partition panels shall be prefinished laminated panels.",
          "Wet area partitions shall be finished with waterproof cement board.",
          "All exposed edges shall be neatly finished.",
          "Joints shall be properly aligned.",
          "Partition shall be stable and durable.",
        ]],
        ["Included Works", [
          "MS framework",
          "Framing supports",
          "Laminated panels",
          "Waterproof cement board in wet areas",
          "Fixing hardware",
          "Edge finishing",
          "Sealing where required",
          "Labour and installation",
        ]],
        ["Completion", [
          "Installation shall be true in line, level, and plumb.",
          "Work shall be complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "3",
      "Meeting Room Table",
      [
        ["Size", "16' x 5'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing meeting room table.",
          "Table shall be suitable for conference / meeting room use.",
          "Table top shall be made of MDF pre-laminated board.",
          "Approved laminate shade and finish shall be used.",
          "Table top shall be properly supported with suitable frame / legs.",
        ]],
        ["Material Specification", [
          "Table top: MDF pre-laminated board.",
          "Thickness shall be as per approved design / standard furniture specification.",
          "All exposed edges shall be finished with matching PVC edge banding.",
          "Table shall be strong, stable, and properly aligned.",
          "Necessary cable manager / wire manager provision shall be provided if required.",
        ]],
        ["Included Works", [
          "Table top",
          "Support frame / legs",
          "Edge banding",
          "Hardware",
          "Fittings",
          "Installation",
          "Final cleaning and finishing",
        ]],
      ],
    ),

    item(
      "4",
      "Meeting Room Side Storage Unit with Door & Drawer",
      [
        ["Size", "4' x 1'-6\" x 7'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing side storage unit for meeting room.",
          "Storage shall be provided with doors and drawers.",
          "Unit shall be made with approved pre-laminated board / MDF pre-laminated board as per approved finish.",
          "Storage shall be suitable for files, stationery, and office use.",
        ]],
        ["Material Specification", [
          "Carcass shall be made with pre-laminated board.",
          "Shutters / drawers shall be finished with approved laminate.",
          "All exposed edges shall be edge banded.",
          "Proper back support and internal shelves shall be provided as per design.",
        ]],
        ["Hardware", [
          "SS hinges",
          "Handles",
          "Locks",
          "Drawer channels",
          "Magnetic catch / shutter magnet",
          "Screws and fixing accessories",
        ]],
        ["Completion", [
          "Unit shall be installed properly in line and level.",
          "Complete with hardware, finishing, and cleaning.",
        ]],
      ],
    ),

    item(
      "5",
      "L-Shape Storage Shelves / Side Storage Unit",
      [
        ["Size", "10' x 2' x 2'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing L-shape storage shelves / side storage unit.",
          "Unit shall be suitable for office storage.",
          "Storage shall be made with approved pre-laminated board.",
          "Internal and external surfaces shall be finished neatly.",
        ]],
        ["Material Specification", [
          "Board: Approved pre-laminated board / MDF pre-laminated board where required.",
          "All visible edges shall have matching edge banding.",
          "Shelves shall be properly supported.",
          "Storage shall be stable and durable.",
        ]],
        ["Included Works", [
          "Storage frame",
          "Shelves",
          "Side panels",
          "Hardware",
          "Edge finishing",
          "Fixing and installation",
        ]],
      ],
    ),

    item(
      "6",
      "Gents Toilet – Premium Finish",
      [
        ["Size", "11'-3\" x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing gents toilet with premium finish.",
          "Toilet shall be complete and fully functional.",
          "Internal partitions shall be provided.",
          "Wet area walls shall be finished with waterproof cement board.",
          "Ceramic wall tiles shall be provided up to 7 ft height.",
          "Work shall include all sanitary, plumbing, drainage, water supply, electrical, and finishing works.",
        ]],
        ["Toilet Components", [
          "EWC commode: 2 Nos.",
          "EWC partitions: Included.",
          "Urinals: 3 Nos.",
          "Urinal partitions: Included.",
          "Washbasins: 2 Nos.",
          "Mirrors: Included.",
          "Under-counter storage: Included.",
          "Countertop with fittings: Included.",
          "WPVC doors with door frame: Included.",
          "Ventilation louvers: Included.",
          "Exhaust fan: Included.",
        ]],
        ["Sanitary & CP Fittings", [
          "Health faucet",
          "Taps",
          "Tissue paper holder",
          "Bottle trap",
          "Waste coupling",
          "Angle cock",
          "Flush tank / flushing arrangement",
          "Urinal waste fittings",
          "All required plumbing accessories",
        ]],
        ["Approved Makes", [
          "Cera / Hindware / Parryware or equivalent approved make.",
        ]],
        ["Plumbing & Drainage", [
          "Water supply line shall be provided.",
          "Drainage line shall be connected properly.",
          "All joints shall be sealed.",
          "Leakage testing shall be carried out.",
          "Toilet shall be handed over in working condition.",
        ]],
        ["Completion", [
          "Complete with sanitary fixtures, MEP works, sealing, finishing, testing, and commissioning.",
          "Work shall be as per approved drawings and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "7",
      "U-Shape Workstation Table with Movable Storage",
      [
        ["Workstation Size", "1200 mm L x 600 mm D x 750 mm H"],
        ["Quantity", "4 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing U-shape workstation table.",
          "Workstation top shall be made of MDF pre-laminated board.",
          "Workstation shall be suitable for office staff seating.",
          "Integrated power manager shall be provided.",
          "Table shall be installed as per approved layout.",
        ]],
        ["Material Specification", [
          "Table top: MDF pre-laminated board.",
          "Finish: Approved laminate shade.",
          "All exposed edges shall be finished with PVC edge banding.",
          "Table shall be strong, stable, and properly levelled.",
        ]],
        ["Movable Storage Unit", [
          "Size: 400 mm W x 600 mm H x 500 mm D.",
          "Storage shall be made of MDF pre-laminated board / 18 mm pre-laminated board.",
          "Storage shall include:",
          "   – 1 drawer",
          "   – 1 cabinet",
          "   – Castor wheels for mobility",
          "   – Handle",
          "   – Lock",
          "   – Drawer channel",
          "Shutters shall be finished with laminate.",
          "Internal and external surfaces shall have laminate finish.",
        ]],
        ["Included Works", [
          "Workstation table",
          "Integrated power manager",
          "Movable storage",
          "Edge banding",
          "Hardware",
          "Loading and unloading",
          "Installation and fixing",
        ]],
        ["Approved Makes", [
          "MDF pre-laminated board / Greenpanel / VIR / DEVA or equivalent.",
        ]],
      ],
    ),

    item(
      "8",
      "Overhead Storage Cupboards",
      [
        ["Sizes", "32'-6\" x 1'-6\" – 1 No. (U-shape office area);  10' x 1'-6\" – 1 No. (storage shelves)"],
        ["Area", "63.75 Sft"],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing overhead storage cupboards.",
          "Cupboards shall be made of 18 mm thick pre-laminated board.",
          "Internal and external surfaces shall be finished with approved laminate shade.",
          "Cupboards shall be properly fixed to wall / structural support.",
        ]],
        ["Material Specification", [
          "Board thickness: 18 mm.",
          "Finish: Both side laminate finish.",
          "Edges shall be finished with matching PVC edge banding.",
          "Cupboard shutters shall be properly aligned.",
        ]],
        ["Hardware", [
          "SS hinges",
          "Handles",
          "Locks",
          "Shutter magnets",
          "Magnetic ball catch",
          "Screws and fixing accessories",
        ]],
        ["Completion", [
          "Cupboards shall be installed firmly and safely.",
          "Shutters shall open and close smoothly.",
          "Work shall be complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "9",
      "Aluminium Framed Glazed Door",
      [
        ["Size", "3' x 7'"],
        ["Quantity", "2 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing aluminium framed glazed doors.",
          "Doors shall be used for conference room / cabin areas.",
          "Aluminium sections shall be powder-coated.",
          "Door shutter shall be with 8 mm thick clear toughened glass.",
        ]],
        ["Material Specification", [
          "Frame: Powder-coated aluminium section.",
          "Glass: 8 mm clear toughened glass.",
          "Glazing beads and rubber gaskets shall be provided.",
          "Sealants shall be applied properly.",
        ]],
        ["Hardware", [
          "Door closer",
          "SS handles",
          "Lock set",
          "Hinges / patch fittings",
          "Floor spring if required",
          "Screws and fixing accessories",
        ]],
        ["Completion", [
          "Door shall be fixed true in line, level, and plumb.",
          "Door operation shall be smooth.",
          "Complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "10",
      "L-Shape Office Cabin Glass Partition",
      [
        ["Size", "15' x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing L-shape office cabin glass partition.",
          "Glass partition shall be fixed as per approved layout.",
          "Glass shall be 10 mm thick clear toughened glass.",
          "Manifestation stickers / frosted film shall be provided as per design.",
        ]],
        ["Included Works", [
          "10 mm clear toughened glass",
          "Aluminium fittings",
          "Clamps",
          "Brackets",
          "Patch fittings where required",
          "Sealants",
          "Accessories",
          "Alignment and finishing",
        ]],
        ["Completion", [
          "Partition shall be fixed true in line, level, and plumb.",
          "Installation shall be stable and safe.",
          "Work shall be completed with neat finishing.",
        ]],
      ],
    ),

    item(
      "11",
      "Office Cabin Glass Door",
      [
        ["Size", "3' x 7'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing office cabin glass door.",
          "Glass shall be 10 mm thick clear toughened glass.",
          "Manifestation stickers shall be provided.",
          "Door shall be installed with all required hardware.",
        ]],
        ["Material & Hardware", [
          "10 mm clear toughened glass",
          "Patch fittings",
          "Floor spring",
          "SS handles",
          "Lock set",
          "Hinges",
          "Sealants",
          "Required fixing accessories",
        ]],
        ["Approved Make", [
          "Saint-Gobain or equivalent approved make.",
        ]],
        ["Completion", [
          "Door shall be installed true in line, level, and plumb.",
          "Door shall operate smoothly.",
          "Complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "12",
      "Main Entry Glazed Door with Fixed Glass Partition",
      [
        ["Size", "10' x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing main entry glazed door with fixed glass partition.",
          "Glass shall be 10 mm thick clear toughened glass.",
          "Fixed glass partition shall be provided as per design.",
          "Door shall be complete with all required hardware.",
        ]],
        ["Hardware", [
          "Door closer",
          "Patch fittings",
          "SS handles",
          "Lock set",
          "Hinges",
          "Floor spring if required",
          "Sealants",
          "Fixing accessories",
        ]],
        ["Completion", [
          "Proper alignment and structural stability shall be ensured.",
          "Door shall operate smoothly.",
          "Finishing shall be neat and durable.",
        ]],
      ],
    ),

    item(
      "13",
      "Toughened Glass with Safety Film",
      [
        ["Size", "14' x 6'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing 10 mm thick clear toughened glass with safety film.",
          "Glass shall be supported on vertical MS columns and aluminium framing system.",
          "Installation shall be done as per approved design.",
        ]],
        ["Included Works", [
          "10 mm clear toughened glass",
          "Safety film",
          "MS vertical columns",
          "Aluminium framing",
          "Fish-mouth fittings / twin pro patch fittings",
          "Clamps",
          "Gaskets",
          "Sealants",
          "Edge polishing",
          "Cutting and drilling",
          "All fixing accessories",
        ]],
        ["Completion", [
          "Installation shall be stable, safe, and properly aligned.",
          "Finishing shall be neat and complete.",
        ]],
      ],
    ),

    item(
      "14",
      "MS Chequered Plate Steps with Railing",
      [
        ["Quantity", "1 Lot"],
        ["Location", "Ground Floor to First Floor"],
      ],
      [
        ["Scope of Work", [
          "Providing, fabricating, and fixing MS chequered plate steps.",
          "Steps shall be made using 3 mm thick MS chequered plate.",
          "Chequered plate shall be fixed over MS structural frame.",
          "MS tube railing shall be provided.",
        ]],
        ["Railing Specification", [
          "MS tube railing size: 40 mm to 50 mm or equivalent section.",
          "Railing shall include:",
          "   – Vertical posts",
          "   – Top rail",
          "   – Intermediate rail",
          "   – Base plate fixing",
        ]],
        ["Fabrication Works", [
          "Cutting",
          "Welding",
          "Grinding",
          "Edge finishing",
          "Base plate fixing",
          "Surface preparation",
        ]],
        ["Painting", [
          "One coat anti-corrosive primer.",
          "Two coats enamel / epoxy paint.",
        ]],
        ["Completion", [
          "Steps shall be structurally stable and safe for use.",
          "Work shall be complete as per approved drawing and site requirement.",
        ]],
      ],
    ),

    item(
      "15",
      "MS Chequered Plate Roofing",
      [
        ["Size", "40' x 24'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing MS chequered plate roofing.",
          "Roofing shall be made with 3.5 mm thick MS chequered plate.",
          "Chequered plate shall be fixed over MS structural framework.",
        ]],
        ["Included Works", [
          "Cutting",
          "Lifting",
          "Positioning",
          "Welding / bolting",
          "Edge finishing",
          "Sealing of joints",
          "Surface preparation",
        ]],
        ["Painting", [
          "One coat anti-corrosive primer.",
          "Two coats enamel / epoxy paint.",
        ]],
        ["Completion", [
          "Roofing shall be properly fixed and sealed.",
          "Work shall be complete with all materials, labour, tools, and accessories.",
        ]],
      ],
    ),

    // ================= B. FIRST FLOOR =================
    part("B. First Floor Technical Specification"),

    item(
      "1",
      "MS Fabricated Portable Container Cabin",
      [
        ["Size", "40' x 24' x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing, fabricating, supplying, and installing MS fabricated portable container cabin.",
          "Cabin shall be lifting and shifting type.",
          "Structural MS frame shall be provided.",
          "Cabin shall be suitable for first floor installation.",
          "Complete fabrication shall be done as per approved drawing.",
        ]],
        ["Structural Frame & Stiffeners", [
          "Bottom / base frame: ISMC channel heavy-duty structure / MS tube, 100 x 50 mm, 6 mm thick.",
          "Top / roof frame: MS square tube structure, 50 x 50 mm, 3 mm thick.",
          "Floor frame / stiffeners: MS rectangular tube reinforcement, 100 x 50 / 50 x 50 mm, 3 mm thick.",
          "Wall stiffeners: vertical and horizontal MS tube members, 50 x 50 mm, 3 mm thick.",
          "Approved steel makes: Jindal / Apollo / JSW / Sriraj or equivalent.",
          "All MS members treated with anti-corrosive primer and enamel paint (anti-rust finish).",
          "Complete frame welded rigid, true to line and level, suitable for transportation and relocation.",
        ]],
        ["External Cladding & Roof", [
          "External wall cladding: corrugated CR sheet, welded, mild steel, 1.2 mm (18 gauge).",
          "Roof: MS sheet, 1.2 mm (18 gauge); flat roof provided for first floor (G+1 stacked) container.",
          "All sheet joints welded / sealed and made weather resistant.",
        ]],
        ["Insulation", [
          "Thermal insulation: glass wool (50 kg density) / Hitlon.",
          "Insulation thickness: 10 mm / 25 mm as required.",
          "Provides heat insulation to walls and roof as applicable.",
        ]],
        ["Lifting Arrangement", [
          "MS lifting hooks provided at top frame for crane lifting, shifting, and relocation.",
          "Load-bearing stacking lugs / plates provided at bottom corners for G+1 (stacked) installation.",
          "Lifting and stacking arrangement designed for safe handling of the container as a single piece.",
        ]],
        ["Internal Finish", [
          "Internal wall panels shall be prefinished laminate finish.",
          "Wet areas shall be finished with waterproof cement board.",
          "Premium finish shall be provided in toilet / wet areas.",
          "Vinyl flooring shall be included.",
        ]],
        ["Electrical & Lighting", [
          "LED tube lights / surface-mounted lights shall be provided as required.",
          "Complete electrical wiring shall be included.",
          "Main distribution board shall be provided.",
          "DB shall be protected with MCBs.",
          "Provision shall be made for 5/6A, 16A, and 20A switches and sockets.",
        ]],
        ["Windows", [
          "Aluminium sliding windows shall be provided.",
          "Window size: 5' x 6'.",
          "Quantity: 4 Nos.",
          "Safety grill shall be provided for all windows.",
        ]],
        ["Completion", [
          "Complete with fittings, fixtures, wiring, accessories, installation, testing, and commissioning.",
          "Work shall be completed as per approved drawings and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "1.1",
      "SPC Flooring",
      [
        ["Area", "40' x 24'"],
        ["Thickness", "5 mm"],
        ["Quantity", "As per area"],
      ],
      [
        ["Scope of Work", [
          "Providing and laying 5 mm thick SPC flooring.",
          "Flooring shall be of approved make, shade, and finish.",
          "Flooring shall be installed over prepared surface.",
        ]],
        ["Included Works", [
          "Underlay",
          "Adhesive if applicable",
          "Cutting",
          "Fitting",
          "Trimming",
          "Edge finishing",
          "Skirting coordination",
          "Labour, tools, and accessories",
        ]],
        ["Completion", [
          "Complete as per manufacturer's specification and approved drawing.",
        ]],
      ],
    ),

    item(
      "2",
      "Additional Internal Partitions",
      [
        ["Sizes", "4'-6\" x 8'-6\" – 1 No.;  16'-9\" x 8'-6\" – 1 No.;  12'-3\" x 8'-6\" – 1 No.;  5' x 8'-6\" – 1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing internal partitions in dining room, office cabin, handwash side, and workstation areas.",
          "Partition shall be made using aluminium / GI framework.",
          "Infill shall be with pre-laminated boards and / or glass panels as per approved design.",
        ]],
        ["Included Works", [
          "Framework",
          "Infill panels",
          "Glass panels where required",
          "Doors where required",
          "Hardware",
          "Skirting",
          "Sealing",
          "Finishing",
        ]],
        ["Completion", [
          "Installation shall be true in line, level, and plumb.",
          "Partition shall be stable and durable.",
          "Work shall be complete as per approved drawing.",
        ]],
      ],
    ),

    item(
      "3",
      "Attached Open Pantry with Handwash Counter",
      [
        ["Size", "10' x 5'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing open pantry with handwash counter.",
          "Pantry shall be fixed on MS structural frame.",
          "Granite slab top shall be provided as per approved drawing.",
          "Half-height partition shall be included.",
        ]],
        ["Pantry Components", [
          "Stainless steel sink",
          "Sink tap",
          "Granite counter top",
          "Under-counter storage cabinets",
          "Plumbing connection",
          "Drainage connection",
          "Electrical provision where required",
        ]],
        ["Completion", [
          "All joints shall be sealed.",
          "Pantry shall be made fully functional.",
          "Complete with fittings, hardware, MEP connections, and finishing.",
        ]],
      ],
    ),

    item(
      "4.a",
      "U-Shape Workstation Table with Movable Storage",
      [
        ["Workstation Size", "1200 mm L x 600 mm D x 750 mm H"],
        ["Quantity", "2 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing U-shape workstation table.",
          "Workstation top shall be made of MDF pre-laminated board.",
          "Integrated power manager shall be provided.",
          "Workstation shall be installed as per approved layout.",
        ]],
        ["Material Specification", [
          "Table top: MDF pre-laminated board.",
          "Finish: Approved laminate shade.",
          "Exposed edges shall be finished with PVC edge banding.",
          "Powder coat shade for support: RAL 9005 or as per client confirmation.",
        ]],
        ["Movable Storage", [
          "Size: 400 mm W x 600 mm H x 500 mm D.",
          "Made of MDF pre-laminated board / 18 mm pre-laminated board.",
          "Includes 1 drawer and 1 cabinet.",
          "Storage shall be mounted on castors.",
          "Carcass shall have internal and external laminate finish.",
          "Shutters shall be finished with laminate.",
        ]],
        ["Completion", [
          "Complete with loading, unloading, hardware, installation, and finishing.",
          "Approved makes: MDF pre-laminated board / Greenpanel / VIR / DEVA or equivalent.",
        ]],
      ],
    ),

    item(
      "4.b",
      "Workstation Table",
      [
        ["Size", "1200 mm L x 600 mm D x 750 mm H"],
        ["Quantity", "3 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing workstation table.",
          "Table top shall be made of MDF pre-laminated board.",
          "Approved laminate finish shall be used.",
          "Integrated power manager shall be provided.",
        ]],
        ["Included Works", [
          "Complete fabrication",
          "Edge banding",
          "Hardware fittings",
          "Power manager",
          "Installation",
          "Alignment and finishing",
        ]],
        ["Completion", [
          "Powder coat shade: RAL 9005 or as per client confirmation.",
          "Complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "5",
      "Overhead Storage Cupboards",
      [
        ["Sizes", "29'-6\" x 1'-6\" – 1 No. (L-shape office area);  3'-6\" x 1'-6\" – 1 No. (pantry)"],
        ["Area", "49.50 Sft"],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing overhead storage cupboards for workspace and pantry.",
          "Cupboards shall be made of 18 mm thick pre-laminated board.",
          "Internal and external surfaces shall be laminated.",
        ]],
        ["Hardware", [
          "SS hinges",
          "Handles",
          "Locks",
          "Shutter magnets",
          "Magnetic ball catch",
          "Screws and accessories",
        ]],
        ["Completion", [
          "Cupboards shall be fixed properly to wall / support.",
          "Shutters shall work smoothly.",
          "Complete as per approved drawing.",
        ]],
      ],
    ),

    item(
      "6",
      "Aluminium Framed Glazed Door",
      [
        ["Size", "3' x 7'"],
        ["Quantity", "2 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing aluminium framed glazed doors.",
          "Doors shall be used for dining and cabin areas.",
          "Aluminium sections shall be powder coated.",
          "Door shall be provided with 8 mm thick clear toughened full glass.",
        ]],
        ["Hardware", [
          "Glazing beads",
          "Rubber gaskets",
          "Sealants",
          "Door closer",
          "SS handles",
          "Lock set",
          "Hinges / patch fittings",
          "Floor spring if required",
        ]],
        ["Completion", [
          "Door shall be installed true in line, level, and plumb.",
          "Door operation shall be smooth.",
        ]],
      ],
    ),

    item(
      "7",
      "L-Shape Office Cabin Glass Partition",
      [
        ["Size", "15' x 8'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing L-shape office cabin glass partition.",
          "Glass shall be 10 mm thick clear toughened glass.",
          "Manifestation stickers / frosted film shall be provided as per design.",
        ]],
        ["Included Works", [
          "Aluminium clamps",
          "Patch fittings",
          "Brackets",
          "Sealants",
          "Hardware",
          "Alignment and finishing",
        ]],
        ["Completion", [
          "Partition shall be stable, safe, and neatly finished.",
        ]],
      ],
    ),

    item(
      "8",
      "Office Cabin Glass Door",
      [
        ["Size", "3' x 7'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing office cabin glass door.",
          "Glass shall be 10 mm thick clear toughened glass.",
          "Manifestation stickers / frosted film shall be provided.",
        ]],
        ["Hardware", [
          "Patch fittings",
          "Floor spring",
          "SS handles",
          "Lock set",
          "Hinges",
          "Sealants",
          "Accessories",
        ]],
        ["Completion", [
          "Door shall be installed true in line, level, and plumb.",
          "Door shall operate smoothly.",
        ]],
      ],
    ),

    item(
      "9",
      "Office Cabin / Dining Area Round Table",
      [
        ["Size", "3' dia x 2'-6\" height"],
        ["Quantity", "3 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing round table for office cabin / dining area.",
          "Table top shall be made of MDF pre-laminated board.",
          "Table shall be provided with MS powder-coated legs.",
          "Table top shall be finished with approved laminate.",
        ]],
        ["Material Specification", [
          "Top: MDF pre-laminated board.",
          "Top thickness: As per approved design / 40 mm finish if required.",
          "Edge banding shall be provided on all exposed edges.",
          "Legs shall be MS powder-coated.",
          "Powder coat shade shall be as per approved sample.",
        ]],
        ["Completion", [
          "Complete with hardware, fittings, loading, unloading, and installation.",
          "Table shall be stable and properly levelled.",
        ]],
      ],
    ),

    item(
      "10.a",
      "Ladies Toilet – Premium Finish",
      [
        ["Size", "6' x 4'-3\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing ladies toilet with premium finish.",
          "Internal partition shall be provided with prefinished laminated boards / waterproof cement board in wet areas.",
          "Ceramic wall tiles shall be provided up to 7 ft height.",
          "Toilet shall be complete and functional.",
        ]],
        ["Toilet Components", [
          "EWC: 1 No.",
          "Washbasin: 1 No.",
          "Mirror",
          "Counter",
          "Health faucet",
          "Taps",
          "Tissue paper holder",
          "Ventilation louver",
          "Exhaust fan",
          "WPVC door with frame",
        ]],
        ["Approved Makes", [
          "Cera / Hindware / Parryware or equivalent.",
        ]],
        ["Completion", [
          "Complete with plumbing, drainage, water supply, sealing, finishing, and commissioning.",
        ]],
      ],
    ),

    item(
      "10.b",
      "Shower Area with Dry Space – Premium Finish",
      [
        ["Size", "11'-9\" x 6'"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and installing shower area with dry space.",
          "Internal partitions shall be with prefinished laminate wall panels / waterproof cement boards.",
          "Ceramic wall tiles shall be provided up to 7 ft height.",
          "WPVC door with frame shall be included.",
        ]],
        ["Included Works", [
          "Shower fittings",
          "Shower accessories",
          "Ventilation louver",
          "Exhaust fan",
          "Full-height mirror",
          "Plumbing line",
          "Drainage line",
          "Water supply line",
          "MEP works",
        ]],
        ["Approved Makes", [
          "Cera / Hindware / Parryware or equivalent.",
        ]],
        ["Completion", [
          "Shower area shall be fully functional.",
          "Work shall be complete as per approved drawing.",
        ]],
      ],
    ),

    item(
      "11",
      "Cabin Table with Side Storage Unit",
      [
        ["Cabin Table Size", "1500 mm L x 600 mm D x 750 mm H"],
        ["Side Storage Size", "750 mm H x 500 mm W x 450 mm D"],
        ["Quantity", "2 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing cabin table with side storage unit.",
          "Table top shall be made of MDF pre-laminated board.",
          "Approved laminate finish shall be provided.",
          "Integrated power manager shall be provided on table top.",
        ]],
        ["Table Specification", [
          "Table top: MDF pre-laminated board.",
          "Finish: Approved laminate.",
          "Edge finishing: ABS / PVC edge banding.",
          "Black power manager box shall be provided on worktop as per approved sample.",
        ]],
        ["Side Storage Specification", [
          "Side storage shall be made of MDF pre-laminated board / 18 mm pre-laminated board.",
          "Storage shall include:",
          "   – 1 drawer with lock at top",
          "   – 1 shutter at bottom",
          "   – Internal and external laminate finish",
          "   – Matching edge banding",
          "Hardware shall include hinges, handles, locks, channels, and accessories.",
        ]],
        ["Completion", [
          "Work includes shop drawing approval, fabrication, hardware, loading, unloading, installation, and finishing.",
          "Powder coat shade: RAL 9005.",
          "Complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    item(
      "12",
      "Toughened Glass with Safety Film",
      [
        ["Size", "15' x 6'-6\""],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing 10 mm thick clear toughened glass with safety film.",
          "Glass shall be supported on vertical MS columns and aluminium framing system.",
        ]],
        ["Included Works", [
          "10 mm toughened glass",
          "Safety film",
          "Fish-mouth fittings / twin pro patch fittings",
          "Clamps",
          "Gaskets",
          "Sealants",
          "Edge polishing",
          "Cutting and drilling",
          "Hardware and accessories",
        ]],
        ["Completion", [
          "Installation shall be aligned, stable, safe, and neatly finished.",
        ]],
      ],
    ),

    item(
      "13",
      "Overhead Water Storage Tank",
      [
        ["Capacity", "1000 Litres"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing, supplying, and installing overhead water storage tank.",
          "Tank capacity shall be 1000 litres.",
          "Tank shall be of approved make and quality.",
        ]],
        ["Included Connections", [
          "Inlet connection",
          "Outlet connection",
          "Overflow connection",
          "Washout connection",
          "Required fittings and accessories",
        ]],
        ["Completion", [
          "Tank shall be installed securely.",
          "Connections shall be checked for leakage.",
          "Complete as per approved drawing and Engineer-in-Charge direction.",
        ]],
      ],
    ),

    // ================= C. ADDITIONAL BOUGHT-OUT ITEMS =================
    part("C. Additional Bought-Out Items"),

    item(
      "1",
      "2.0 TR Split Air Conditioner",
      [["Quantity", "1 No."]],
      [
        ["Scope of Work", [
          "Providing, supplying, and installing 2.0 TR split AC unit.",
          "Approved makes: Blue Star / Voltas / Lloyd or equivalent.",
        ]],
        ["Included Works", [
          "Indoor unit",
          "Outdoor unit",
          "Copper piping with insulation",
          "Drain piping",
          "Electrical cabling",
          "Refrigerant gas charging",
          "Mounting supports and brackets",
          "Testing and commissioning",
        ]],
        ["Completion", [
          "AC shall be installed as per manufacturer's specification.",
          "Proper cooling and operation shall be demonstrated.",
        ]],
      ],
    ),

    item(
      "2",
      "1.5 TR Split Air Conditioner",
      [["Quantity", "2 Nos."]],
      [
        ["Scope of Work", [
          "Providing, supplying, and installing 1.5 TR split AC units.",
          "Approved makes: Blue Star / Voltas / Lloyd or equivalent.",
        ]],
        ["Included Works", [
          "Indoor and outdoor units",
          "Copper refrigerant piping with insulation",
          "Drain piping",
          "Electrical cabling",
          "Mounting brackets",
          "Hardware and accessories",
          "Testing and commissioning",
        ]],
      ],
    ),

    item(
      "3",
      "1.0 TR Split Air Conditioner",
      [["Quantity", "5 Nos."]],
      [
        ["Scope of Work", [
          "Providing, supplying, and installing 1.0 TR split AC units.",
          "Approved makes: Blue Star / Voltas / Lloyd or equivalent.",
        ]],
        ["Included Works", [
          "Indoor and outdoor units",
          "Copper refrigerant piping with insulation",
          "Drain piping",
          "Electrical cabling",
          "Mounting brackets",
          "Hardware and accessories",
          "Testing and commissioning",
        ]],
      ],
    ),

    item(
      "4",
      "Wall Mounted Fans",
      [["Quantity", "15 Nos."]],
      [
        ["Scope of Work", [
          "Providing and installing wall-mounted fans.",
          "Fans shall be of approved make and quality.",
          "Fans shall be fixed with necessary brackets and hardware.",
          "Electrical connection shall be provided.",
        ]],
        ["Completion", [
          "Fans shall be tested for proper operation.",
          "Complete with all hardware and fittings.",
        ]],
      ],
    ),

    item(
      "5",
      "Workstation / Meeting Room / Discussion Room Chairs",
      [["Quantity", "42 Nos."]],
      [
        ["Scope of Work", [
          "Providing chairs for workstation area, meeting room, and discussion room.",
          "Chairs shall be of approved make.",
          "Approved makes: Featherlite / Nilkamal or equivalent.",
        ]],
        ["Completion", [
          "Chairs shall be supplied in good condition.",
          "Colour and model shall be as per approved sample.",
        ]],
      ],
    ),

    item(
      "6",
      "Dining Area Plastic Chairs",
      [["Quantity", "10 Nos."]],
      [
        ["Scope of Work", [
          "Providing plastic chairs for dining area.",
          "Approved makes: Nilkamal or equivalent.",
          "Chairs shall be durable and suitable for office dining use.",
        ]],
      ],
    ),

    item(
      "7",
      "Refrigerator",
      [
        ["Capacity", "190 Litres"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing 190L refrigerator.",
          "Refrigerator may be single door / double door as per approved selection.",
          "Refrigerator shall be placed in pantry area as per drawing.",
          "Approved makes: Blue Star or equivalent.",
        ]],
      ],
    ),

    item(
      "8",
      "Microwave Oven",
      [
        ["Capacity", "20 Litres"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing 20L microwave oven.",
          "Approved makes: IFB / LG or equivalent.",
          "Unit shall be installed / placed in pantry area.",
        ]],
      ],
    ),

    item(
      "9",
      "Water Dispenser",
      [
        ["Type", "Floor mounted"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing floor-mounted water dispenser.",
          "Dispenser shall have hot, cold, and normal water options.",
          "Approved makes: Blue Star or equivalent.",
        ]],
      ],
    ),

    item(
      "10",
      "Coffee Table",
      [
        ["Size", "2' dia round table"],
        ["Quantity", "1 No."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing round coffee table.",
          "Table top shall be made of MDF pre-laminated board.",
          "Table shall be finished with approved laminate shade.",
          "Exposed edges shall be finished with matching PVC edge banding.",
          "Suitable support / legs shall be provided.",
        ]],
        ["Completion", [
          "Table shall be stable, neat, and ready for use.",
        ]],
      ],
    ),

    item(
      "11",
      "Window Blinds",
      [
        ["Size", "6' x 5'"],
        ["Quantity", "12 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing window blinds.",
          "Blinds shall be of approved colour and material.",
          "Blinds shall be fixed with all brackets, channels, and accessories.",
          "Smooth opening and closing operation shall be ensured.",
        ]],
      ],
    ),

    item(
      "12",
      "Writing Board",
      [
        ["Size", "5' x 4'"],
        ["Quantity", "4 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing writing boards.",
          "Boards shall be suitable for office / meeting room use.",
          "Boards shall be fixed with required screws, brackets, and accessories.",
        ]],
      ],
    ),

    item(
      "13",
      "Notice Board",
      [
        ["Size", "5' x 4'"],
        ["Quantity", "4 Nos."],
      ],
      [
        ["Scope of Work", [
          "Providing and fixing notice boards.",
          "Boards shall be suitable for office use.",
          "Required fixing accessories shall be included.",
          "Boards shall be fixed firmly on wall / partition.",
        ]],
      ],
    ),

    // ================= GENERAL NOTES =================
    part("General Notes"),

    note("Material & Workmanship", [
      "All materials shall be of approved make and quality.",
      "All works shall be carried out as per approved drawings.",
      "Final colour, shade, and finish shall be as per client approval.",
      "Workmanship shall be neat, strong, and durable.",
      "All edges, corners, joints, and visible surfaces shall be properly finished.",
    ]),

    note("Furniture Material Note", [
      "All table tops, workstation tops, cabin tables, meeting tables, round tables, and coffee tables shall be made of MDF pre-laminated board.",
      "All exposed edges shall be finished with matching PVC / ABS edge banding.",
      "Table supports shall be as per approved drawing.",
      "Furniture colour and laminate shade shall be as per approved sample.",
    ]),

    note("Electrical Note", [
      "All wiring shall be properly routed and safely connected.",
      "Main DB with MCB protection shall be provided as per requirement.",
      "Switches, sockets, lighting points, AC points, and power points shall be provided as per approved layout.",
    ]),

    note("Plumbing Note", [
      "All toilet, pantry, shower, and water tank connections shall be properly completed.",
      "Water supply and drainage connections shall be leak-proof.",
      "Testing shall be carried out before handover.",
    ]),

    note("Completion & Handover", [
      "All items shall include material, labour, tools, tackles, hardware, fittings, installation, testing, and commissioning.",
      "Site shall be cleaned after completion.",
      "Final work shall be handed over in ready-to-use condition.",
      "Work shall be completed as per approved drawings and Engineer-in-Charge direction.",
    ]),
  ],
};

export const SPEC_TEMPLATES: SpecTemplate[] = [EMBASSY_360_TEMPLATE];
