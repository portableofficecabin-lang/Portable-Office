// FAQ content — server-safe (no "use client"). Shared between the FAQ view
// (rendering) and the FAQ route (server-side FAQPage JSON-LD), so the schema
// always matches the visible Q&A content.

export type FaqItem = { q: string; a: string };
export type FaqCategory = {
  id: string;
  title: string;
  /** lucide-react icon name, resolved in the view */
  icon: string;
  faqs: FaqItem[];
};

export const faqCategories: FaqCategory[] = [
  {
    id: "general",
    title: "General Questions",
    icon: "HelpCircle",
    faqs: [
      {
        q: "What does Portable Office Cabin manufacture?",
        a: "We design and manufacture a wide range of portable structures — from site office cabins, container offices, and security guard cabins to prefab homes, portable toilets, and luxury villas. Whether you need a compact guard room or a full-scale modular office, we've got you covered.",
      },
      {
        q: "Where are your manufacturing facilities located?",
        a: "Our production units are based in Hosur (Tamil Nadu) and Bangalore (Karnataka). This central location allows us to serve clients across South India quickly, and we regularly ship structures to other parts of the country as well.",
      },
      {
        q: "Which areas do you serve?",
        a: "We primarily serve clients across India, with a strong presence in Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, and Kerala. For large orders, we also deliver to other states. Just get in touch and we'll work out the logistics.",
      },
    ],
  },
  {
    id: "products",
    title: "Products & Customization",
    icon: "Package",
    faqs: [
      {
        q: "Can I customize the size and layout of my cabin?",
        a: "Absolutely. Every project is different, and we understand that. You can choose the dimensions, room layout, number of doors and windows, electrical points, and even the exterior finish. Our design team will work with you to make sure the final product fits your exact requirements.",
      },
      {
        q: "What materials do you use for construction?",
        a: "We use high-quality materials including Mild Steel (MS), Galvanized Iron (GI), Aluminium Composite Panels (ACP), and PUF (Polyurethane Foam) insulated panels. The choice of material depends on your budget, climate conditions, and how long you need the structure to last.",
      },
      {
        q: "Are your cabins suitable for permanent use?",
        a: "Yes, many of our structures — especially prefab homes and luxury villas — are built to last for decades. With proper maintenance, they perform just as well as conventional buildings, often at a fraction of the cost and construction time.",
      },
    ],
  },
  {
    id: "design",
    title: "Design & Specifications",
    icon: "Paintbrush",
    faqs: [
      {
        q: "Do you provide design consultation before manufacturing?",
        a: "Yes, we offer free design consultations. Our team will visit your site (or discuss remotely), understand your needs, and share detailed layout drawings and 3D visuals before we begin production. No surprises — you'll know exactly what you're getting.",
      },
      {
        q: "Can I add features like AC, plumbing, or insulation?",
        a: "Of course. We can integrate air conditioning provisions, full plumbing for toilets and kitchens, thermal insulation, fire-resistant panels, and even solar panel mounts. Just let us know during the design phase, and we'll build it in.",
      },
    ],
  },
  {
    id: "manufacturing",
    title: "Manufacturing & Delivery",
    icon: "Factory",
    faqs: [
      {
        q: "How long does it take to manufacture a cabin?",
        a: "For standard models, production typically takes 7 to 15 working days. Custom or larger projects — like multi-room offices or prefab homes — may take 15 to 30 days depending on the complexity. We'll give you a clear timeline before you confirm your order.",
      },
      {
        q: "Can I visit your factory before placing an order?",
        a: "You're welcome to visit our manufacturing units in Hosur or Bangalore anytime. Seeing our production process firsthand gives you a better sense of the quality and craftsmanship we put into every unit. Just book an appointment and we'll arrange everything.",
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping & Installation",
    icon: "Truck",
    faqs: [
      {
        q: "Do you handle delivery and installation?",
        a: "Yes, we take care of everything — from loading and transport to on-site placement and installation. Our experienced crew will set up the structure, connect basic utilities, and make sure everything is in order before handing it over.",
      },
      {
        q: "Is delivery free?",
        a: "We offer free delivery within a 50 km radius of our facility. For locations beyond that, a nominal transport charge applies based on distance and the size of the structure. We'll always share the delivery cost upfront — no hidden charges.",
      },
      {
        q: "Can the cabin be relocated later?",
        a: "That's one of the biggest advantages of portable cabins. Most of our structures are designed to be dismantled and reassembled at a new location. Whether you're moving a site office or shifting a guard cabin, we can help with the relocation.",
      },
    ],
  },
  {
    id: "warranty",
    title: "Warranty & Support",
    icon: "ShieldCheck",
    faqs: [
      {
        q: "What kind of warranty do you offer?",
        a: "Our structural warranty depends on the material used — 5 years for MS, 15 years for GI, 20 years for ACP, and 25 years for PUF panel structures. Electrical fittings are covered for 1 year, and paint/finish work for 6 months. Full details are shared with every order.",
      },
      {
        q: "What does the warranty cover?",
        a: "The structural warranty covers defects in materials and workmanship — things like panel warping, welding failures, or leaks caused by manufacturing issues. Normal wear and tear, misuse, or damage from natural disasters aren't covered, but we're always here to help with repairs.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Payment",
    icon: "CreditCard",
    faqs: [
      {
        q: "How is pricing determined?",
        a: "Pricing depends on the type of structure, size, materials, and any custom features you need. We provide detailed, transparent quotes — no vague estimates. Once you share your requirements, we'll send a clear breakdown so you know exactly what you're paying for.",
      },
      {
        q: "What are your payment terms?",
        a: "We typically require a 50% advance to begin production, with the remaining 50% due before delivery. For larger projects, we can discuss milestone-based payment plans. We accept bank transfers, UPI, and cheque payments.",
      },
    ],
  },
  {
    id: "after-sales",
    title: "After-Sales Service",
    icon: "Headphones",
    faqs: [
      {
        q: "Do you offer maintenance or repair services after delivery?",
        a: "Yes. We provide ongoing maintenance support for all our structures. Whether it's a minor repair, a fresh coat of paint, or replacement of fittings, our service team is just a call away. We also offer annual maintenance contracts for businesses with multiple units.",
      },
      {
        q: "How do I reach your support team?",
        a: "You can call us, send a WhatsApp message, or email us at admin@portableofficecabin.com. Our team typically responds within a few hours on working days. For urgent issues, calling is always the fastest option.",
      },
    ],
  },
];
