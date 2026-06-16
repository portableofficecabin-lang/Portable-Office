import { CheckCircle2, MapPin, Wrench, ShieldCheck, Truck, MessageSquare } from "lucide-react";

type Block = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
};

type InsightContent = {
  pillTag: string;
  h2: string;
  intro: string;
  blocks: Block[];
  fieldNotes: { city: string; note: string }[];
  closing: string;
};

const INSIGHTS: Record<string, InsightContent> = {
  "executive-portable-cabin-20ft": {
    pillTag: "Field-tested unit",
    h2: "What our team has learned after building the Executive 20ft for six years",
    intro:
      "This particular cabin is the one we rebuild most often inside our Hosur and Krishnagiri workshops, and a lot of the small details on it exist because a site engineer once called us about a problem. We have written this section as a plain account of how the unit is actually used in the field, not as marketing copy.",
    blocks: [
      {
        heading: "Why the 20ft footprint keeps winning over the 16ft version",
        paragraphs: [
          "When clients ask us to compare the 16ft and the 20ft, we usually pull out a project photo from a 2024 IT build in Whitefield. The site office was running on a 16ft cabin and the project manager could not fit a printer, a meeting table for four and a tea station without it feeling crowded. They upgraded to the 20ft the next month. The extra forty inches of width plus a slightly taller 9.5ft ceiling completely changes how the unit feels indoors.",
          "Most of our repeat buyers — civil contractors, EPC project teams, RMC plant supervisors — settle on the 20ft because it gives them one usable workspace, one small storage zone and a discreet washroom corner if they want plumbing added later. Smaller sizes force compromises that get expensive in worker hours.",
        ],
      },
      {
        heading: "The 50mm PUF panel decision — and when we recommend going to 75mm",
        paragraphs: [
          "Our standard build uses 50mm polyurethane foam (PUF) sandwich panels with a density of 40 kg per cubic metre. For most of South India and central Maharashtra, this is the sweet spot — it keeps internal temperature roughly 6 to 8 degrees Celsius below outside ambient with a single 1.5-ton AC running.",
          "We suggest the 75mm upgrade only when the cabin is going to a coastal location like Mangalore, Visakhapatnam or Kandla, or when the customer plans to keep server equipment inside. The thicker panel adds about ₹18,000–₹22,000 to the base price but reduces AC load by roughly 20 percent over a year of use.",
        ],
        checklist: [
          "50mm panel: standard projects, inland sites, single-shift use",
          "75mm panel: coastal humidity, 24x7 operations, server or test equipment inside",
          "Rock-wool panel: required only when a fire-safety NOC is mandatory (hospitals, fuel depots)",
        ],
      },
      {
        heading: "Wiring, earthing and the things that quietly cause callbacks",
        paragraphs: [
          "Every Executive 20ft we ship leaves the factory with a 4-way MCB distribution board, a 30mA RCCB on the lighting circuit and a separate 32A point pre-wired for an AC. The earthing wire is run continuously from the body to a copper lug — this is the part most low-cost cabins skip, and it is the single biggest reason for nuisance tripping at the site.",
          "If your site has long voltage dips (common at the end of feeder lines in Tumkur, Hosur SIPCOT and the Pune Chakan belt), tell us in advance. We will add a 5 kVA servo stabiliser mount inside the cabin so you do not lose AC compressors during a brownout.",
        ],
      },
      {
        heading: "Honest answers to what people actually ask us on call",
        paragraphs: [
          "How long does this cabin last on a real site? Our oldest Executive 20ft still in service was installed at a Bengaluru metro depot in 2018 and is now on its third project — we have refurbished the floor and repainted twice. The steel base frame is engineered for 10 to 12 relocations.",
          "Can it be locked up for the monsoon and left vacant? Yes. Close the slider windows, leave the AC off, and we recommend placing a small bowl of silica gel inside. Reopen it in October and it is ready to use.",
          "Will the unit pass a labour department inspection? The Executive 20ft, when used as a site office, meets the BOCW rest-shelter clauses for spaces below 200 sq ft. We can provide a build certificate for any site inspection.",
        ],
      },
    ],
    fieldNotes: [
      { city: "Bengaluru", note: "Two units running at a metro extension package since 2022, no panel replacements required." },
      { city: "Chennai (Sriperumbudur)", note: "An auto ancillary plant uses it as a quality lab — added vinyl flooring upgrade in year two." },
      { city: "Hyderabad (Patancheru)", note: "Pharma client uses it as a documentation room with HEPA upgrade fitted on top of the standard build." },
    ],
    closing:
      "If you have a specific site condition we have not covered here, call the factory directly and ask for the technical desk. We will tell you honestly whether the Executive 20ft is the right unit or whether one of our larger 30ft or G+1 builds will save you money over the project lifetime.",
  },

  "labour-colony": {
    pillTag: "From recent deployments",
    h2: "Lessons from the last twelve large labour colonies we delivered",
    intro:
      "Between January 2025 and the start of the 2026 monsoon we handed over twelve labour-colony packages ranging from 80 beds to 540 beds. The text below summarises what worked, what we changed mid-project, and what we now recommend by default. Nothing here is sourced from a brochure — it is taken straight from our handover notes.",
    blocks: [
      {
        heading: "Bed-block layouts that survive a real headcount",
        paragraphs: [
          "Dormitory blocks of 12 beds with a central walkway perform better than 16-bed rooms. Workers move in and out at staggered shift timings, and a smaller block reduces sleep disturbance — a complaint we used to get every month and now almost never see.",
          "We have standardised the inter-block gap at 3.6 metres. It is wide enough for a stretcher trolley, a small forklift and the daily housekeeping cart to pass without anyone stepping into a dorm. The fire-safety officer on a recent EPC project specifically called this out as the cleanest layout he had audited that quarter.",
        ],
      },
      {
        heading: "The sanitation block is where projects either succeed or fail",
        paragraphs: [
          "Our current recommendation is one shower and one WC for every eight workers, with a separate hand-wash trough at the entry to the dining hall. Anything below this ratio creates queues before the morning shift, and we have measured productivity dips of 30 to 45 minutes on sites that under-sized this.",
          "For colonies above 200 beds we now propose a small biogas digester linked to the kitchen waste line. Two of our recent clients in the cement sector reduced LPG bills by close to 35 percent within six months. It is not the cheapest add-on, but the payback is real.",
        ],
        checklist: [
          "1 WC + 1 shower per 8 workers — non-negotiable for camps over 100 beds",
          "Roof-mounted solar hot water for sites above 1,200ft elevation (Nilgiris, Kodaikanal, Coorg)",
          "Greywater soak-pit must be at least 12 metres from the bore well",
        ],
      },
      {
        heading: "What we have stopped doing — and why",
        paragraphs: [
          "We no longer ship PPGI roofing without an additional anti-condensation underlay for high-altitude camps. After a project near Munnar reported water dripping inside the dorms in February, we tore down the cause to night-time condensation on the underside of the metal roof. The fix is now standard on every colony shipped above 1,000 metres.",
          "We have also stopped using untreated plywood doors for the toilet blocks. The combination of high humidity and constant water splash was warping doors inside eight months. Compact laminate doors cost about 2.4 times more per piece but last the entire project.",
        ],
      },
      {
        heading: "Things we will quote separately so the budget is honest",
        paragraphs: [
          "Septic tanks sized correctly for the headcount, RO-grade drinking water plants, fire-extinguisher refills, CCTV with a 14-day NVR, perimeter lighting, an attendance kiosk integrated with your HR software — these are all things we deliver but never bundle into the base price. Mixing them into a per-square-foot rate makes comparison difficult and usually disadvantages the customer.",
          "Ask for the BOQ in two columns: structure-and-finishes on one side, MEP-and-amenities on the other. It is the cleanest way to evaluate any prefab vendor.",
        ],
      },
    ],
    fieldNotes: [
      { city: "Mumbai (Bhiwandi)", note: "320-bed colony for a logistics-park client, delivered in 26 days including site grading." },
      { city: "Ahmedabad (Sanand)", note: "180-bed unit with a covered dining hall and prayer room added on customer request." },
      { city: "Hyderabad", note: "240-bed G+1 with rooftop solar — currently offsetting roughly 42 percent of the colony's daily electricity load." },
    ],
    closing:
      "If you are evaluating two or three quotes, send all of them to us and we will mark up — line by line — what is realistic, what is under-quoted and what you should push back on. We would rather lose a deal honestly than win one by hiding the cost of a sanitation block.",
  },

  "container-office": {
    pillTag: "Buyer's reality check",
    h2: "Reading a container-office quote correctly — what to question before you sign",
    intro:
      "Container offices are sold across India at price points that can vary by almost three times for what looks like the same product on a website photo. After enough customers walked into our factory with comparison quotes, we put together a small guide that explains where the real differences hide.",
    blocks: [
      {
        heading: "Used ISO container versus purpose-built office shell",
        paragraphs: [
          "A retired 20ft shipping container starts at around ₹1.45 lakh in the Chennai port belt. A purpose-built container office shell — same external dimensions but with proper cut-outs for windows, an insulated roof and an internal frame to take partition walls — starts at around ₹2.85 lakh from our Krishnagiri factory.",
          "Both can be turned into an office. The used container will always look slightly uneven inside because the corrugated walls are part of its structural strength and cannot be fully flattened. The purpose-built shell has flush interior walls because the structure is in the steel frame, not the skin. Choose based on how the office will be used, not on the per-square-foot rate.",
        ],
      },
      {
        heading: "The five line items that decide whether a quote is honest",
        paragraphs: [
          "Wall panel thickness and density, floor build-up, electrical load planning, window quality and roof treatment — these five line items account for almost the entire price difference between a cheap container office and a serious one. A quote that does not specify each of these in writing is almost always cutting corners on at least two of them.",
        ],
        checklist: [
          "Panel: 50mm PUF at 40 kg/m³ minimum — ask for the panel manufacturer name",
          "Floor: 18mm marine plywood over a steel cross-frame, finished with vinyl or laminate",
          "Electrical: load calculation must add up to your actual equipment plus 30 percent headroom",
          "Windows: powder-coated aluminium with a separate fly mesh and a key-lockable handle",
          "Roof: factory-applied PU coat or a removable HDPE shade — not just paint",
        ],
      },
      {
        heading: "When a container office is the wrong answer",
        paragraphs: [
          "We will tell a customer not to buy a container office if they need more than 600 sq ft of contiguous open floor, if the site has no truck access wider than 3.2 metres, or if the office will be used as a public-facing showroom in a high-footfall location. In all three cases a prefab cabin built in modules on site is either more practical or more presentable.",
          "We have walked away from quotes where the customer was being pushed toward a container office for the wrong reason. The right answer protects the buyer even when it costs us a sale, and that is the only way this business survives in the long run.",
        ],
      },
    ],
    fieldNotes: [
      { city: "Pune (Chakan)", note: "40ft container office split into a meeting room, two workstations and a small pantry — delivered in 11 days." },
      { city: "Bengaluru (Electronic City)", note: "Three 20ft units stacked as a temporary engineering office during a campus expansion." },
      { city: "Kolkata (Howrah)", note: "20ft unit fitted as a weighbridge cabin with reinforced flooring and a sealed cable trench." },
    ],
    closing:
      "Send us any quote you have received from another supplier. We will return it the same day with notes on what is realistic, what is missing and where you can save without losing build quality. No obligation to buy from us.",
  },

  "family-prefab-home-2bhk": {
    pillTag: "From homeowner conversations",
    h2: "What families actually ask before placing a 2BHK prefab home order",
    intro:
      "Buying a prefab home is a personal decision, and the questions we get on call are usually very different from the questions we get for a site office. The notes below answer the ones that come up most often — written exactly the way we explain them on the phone.",
    blocks: [
      {
        heading: "Will it actually feel like a home after a year of monsoon and summer?",
        paragraphs: [
          "Yes, if it is built with the right panel and the right roof. The 2BHK we deliver uses a light-gauge steel skeleton, 75mm PUF insulated walls and a double-layered insulated metal roof with a ceiling fall to drain water cleanly. Internal temperature swings stay within 4 to 5 degrees Celsius of comfort even during a Vidarbha summer or a Konkan monsoon.",
          "Where prefab homes go wrong is when someone tries to save 8 to 10 percent by using a thinner roof panel. The roof is the single most important surface in an Indian climate, and we do not negotiate on it.",
        ],
      },
      {
        heading: "Foundation, plumbing and the things that have to be done by you",
        paragraphs: [
          "We build the house in the factory and assemble it on site, but the foundation pad — usually a 6-inch RCC raft or a set of column footings — has to be ready before our team arrives. Most clients arrange this through a local contractor for about ₹85,000 to ₹1,40,000 depending on soil and access.",
          "Plumbing and septic must terminate at the locations marked on the drawing we send. If you change them later, expect a small extra charge and a day or two of delay. Electrical entry needs a service cable from the meter to a pre-marked point on the rear wall — we connect from there into the house.",
        ],
        checklist: [
          "Foundation ready before our installation team mobilises (avoids ₹6,000–₹9,000 per day idle charges)",
          "Septic tank dug to drawing depth, with an inspection chamber",
          "Power: minimum 5 kW sanctioned load for a 2BHK with one AC",
          "Borewell or municipal connection routed to the pre-marked inlet",
        ],
      },
      {
        heading: "Bank loans, registration and resale",
        paragraphs: [
          "Most nationalised banks now finance prefab homes as a 'composite home loan' provided the land is in your name and the local panchayat or municipal body issues a building permission. We supply the structural drawings, stability certificate from our in-house engineer and a fire-safety declaration to support the loan application.",
          "Resale of a prefab home is genuinely easier than people expect. Because the unit can be dismantled and relocated, the structure retains 50 to 60 percent of its original value even after seven or eight years — something a brick-and-mortar build does not offer.",
        ],
      },
      {
        heading: "Customisations we are happy to do — and a few we politely refuse",
        paragraphs: [
          "Custom kitchen layouts, bedroom sizes within a four-foot range, sliding versus hinged windows, modular wardrobes, false ceilings, jaali partitions, balcony additions, solar-ready wiring — all standard. We have built homes for families in the Western Ghats with full timber-clad exteriors and homes for clients in Rajasthan with reflective white roofs and verandah extensions.",
          "We will refuse only three things: load-bearing modifications that compromise the steel frame, second-floor additions beyond what the original drawing supports, and any change after the panels have been cut at the factory. Tell us early, and almost anything is possible.",
        ],
      },
    ],
    fieldNotes: [
      { city: "Coorg", note: "Family home with cedar cladding and a wood-burning stove, installed in 9 days on a sloped plot." },
      { city: "Tirupati", note: "2BHK + study built as a retirement home for an NRI client, full handover including registration support." },
      { city: "Pondicherry", note: "Beach-facing 2BHK with marine-grade anti-corrosion treatment on every steel surface." },
    ],
    closing:
      "If you are weighing a prefab home against a conventional construction, ask us for a side-by-side cost and timeline sheet for your specific plot. We will be honest about cases where a traditional build is genuinely the better answer.",
  },

  "contact": {
    pillTag: "Before you call",
    h2: "Reaching the right person at our office on the first call",
    intro:
      "Our enquiry desk handles a wide range of products, and the fastest way to get an accurate price or a technical answer is to know which team to ask for. This small guide saves you from being transferred more than once.",
    blocks: [
      {
        heading: "Who picks up what at our office",
        paragraphs: [
          "Site office and portable cabin enquiries are handled by our cabins desk between 9:30 am and 7:00 pm, Monday to Saturday. For shipping container sales — new, used or modified — ask for the container team; they have the live stock list for both our Krishnagiri and Hosur yards.",
          "Labour colony, G+1 worker accommodation and large camp tenders go to our projects desk, where a senior engineer reviews the brief before sending a costing. For prefab homes and 2BHK builds the conversation usually involves drawings, so we set up a callback with the design team rather than a quick phone quote.",
        ],
      },
      {
        heading: "What information speeds up an accurate quote",
        paragraphs: [
          "If you can share the city or pincode, the approximate size in feet, whether you need single-shift or 24x7 use, and your expected timeline, we can usually return a written quotation within the same working day.",
          "For rental enquiries please tell us the rental duration upfront. Our minimum rental period is six months, and the per-month rate changes meaningfully between a 6-month, 12-month and 24-month engagement.",
        ],
        checklist: [
          "Delivery pincode (so we can quote transport accurately)",
          "Cabin or container size in feet, or total square-foot requirement",
          "Purchase or rental, and timeline to delivery",
          "Any site constraints — crane access, road width, height limits",
        ],
      },
      {
        heading: "Visiting the factory",
        paragraphs: [
          "Both our Tamil Nadu (Krishnagiri) and Karnataka (Hosur) units are open for customer walk-ins on weekdays between 10:00 am and 5:00 pm. Saturday visits are possible by prior appointment. We have showroom units of the most common builds — Executive 20ft, Container Office, 2BHK Prefab Home, Labour Colony dorm block — set up so you can see the finish and the build quality before placing an order.",
          "If you are travelling from outside the state, send us a message a day in advance and we will keep a senior engineer available to walk you through the units.",
        ],
      },
    ],
    fieldNotes: [
      { city: "Email", note: "info@portableofficecabin.com — replies within 4 working hours on weekdays." },
      { city: "WhatsApp", note: "Faster than email for short queries and live stock photos." },
      { city: "Factory call", note: "Use the projects desk for orders above 1,000 sq ft or multi-unit deployments." },
    ],
    closing:
      "We treat every enquiry as a real one, whether it is for a single guard cabin or a 500-bed labour colony. Tell us what you actually need and we will respond with what we can actually deliver.",
  },
};

export function FreshInsightSection({ slug }: { slug: string }) {
  const data = INSIGHTS[slug];
  if (!data) return null;

  return (
    <section className="mt-16 border-t border-border/60 pt-12">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
        <MessageSquare className="h-3.5 w-3.5" />
        {data.pillTag}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{data.h2}</h2>
      <p className="text-muted-foreground leading-relaxed mb-10 max-w-3xl">{data.intro}</p>

      <div className="space-y-10">
        {data.blocks.map((block, i) => (
          <article key={i} className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground flex items-start gap-2">
              <Wrench className="h-5 w-5 text-primary mt-1 shrink-0" />
              <span>{block.heading}</span>
            </h3>
            {block.paragraphs.map((p, j) => (
              <p key={j} className="text-muted-foreground leading-relaxed">{p}</p>
            ))}
            {block.checklist && (
              <ul className="mt-3 space-y-2 bg-muted/40 rounded-lg p-4">
                {block.checklist.map((item, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      <div className="mt-12">
        <h3 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Recent field notes
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.fieldNotes.map((note, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card p-4">
              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                {note.city}
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl bg-primary/5 border border-primary/20 p-6 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-1 shrink-0" />
        <p className="text-foreground leading-relaxed">{data.closing}</p>
      </div>
    </section>
  );
}
