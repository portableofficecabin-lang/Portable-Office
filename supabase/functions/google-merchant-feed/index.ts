import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://portableofficecabin.com";

// Static product data for the feed
const products = [
  {
    id: "1", sku: "POC-PC-20EX", name: "Executive Portable Cabin 20ft",
    description: "Solid 20ft cabin that works as a real office — insulated, wired, ready to use. Built with 50mm PUF panels for heat resistance.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 285000, image: "/images/products/executive-portable-cabin-20ft.jpg",
    slug: "executive-portable-cabin-20ft", inStock: true, condition: "new",
  },
  {
    id: "2", sku: "POC-SOC-20ST", name: "Standard Site Office Container",
    description: "Tough container office built for real site conditions with Corten Steel frame and Rockwool 50mm insulation.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 245000, image: "/images/products/standard-site-office-container.jpg",
    slug: "standard-site-office-container", inStock: true, condition: "new",
  },
  {
    id: "3", sku: "POC-CO-20PR", name: "Container Office",
    description: "Premium container office with modern interiors, split AC, and full electrical fit-out for corporate and industrial use.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 320000, image: "/images/products/container-office.jpg",
    slug: "container-office", inStock: true, condition: "new",
  },
  {
    id: "4", sku: "POC-PH-2BHK", name: "Family Prefab Home 2BHK",
    description: "Complete 2BHK prefab home with bedrooms, kitchen, bathroom — perfect for farm houses and weekend homes.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 450000, image: "/images/products/family-prefab-home-2bhk.png",
    slug: "family-prefab-home-2bhk", inStock: true, condition: "new",
  },
  {
    id: "5", sku: "POC-PT-WEST", name: "Portable Toilet Cabin",
    description: "Ready-to-use portable toilet cabin with Western WC, wash basin, and plumbing — ideal for construction sites and events.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 85000, image: "/images/products/portable-toilet.jpg",
    slug: "portable-toilet-cabin", inStock: true, condition: "new",
  },
  {
    id: "6", sku: "POC-SC-8X8", name: "Security Guard Cabin",
    description: "Compact security cabin with 360-degree visibility windows, built-in counter, and weather-resistant construction.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 95000, image: "/images/products/security-cabin.jpg",
    slug: "security-guard-cabin", inStock: true, condition: "new",
  },
  {
    id: "7", sku: "POC-PC-40BH", name: "Portable Cabin 40ft Bunkhouse",
    description: "40ft bunkhouse portable cabin for labour accommodation — fits 8-12 workers with bunk beds, ventilation, and electrical fittings.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 425000, image: "/images/products/portable-cabin-40ft-bunkhouse.png",
    slug: "portable-cabin-40ft-bunkhouse", inStock: true, condition: "new",
  },
  {
    id: "8", sku: "POC-PH-3LUX", name: "Luxury Prefab Villa G+1",
    description: "Premium G+1 prefab villa with modern architecture, spacious interiors, and complete MEP fit-out for luxury living.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 1850000, image: "/images/products/luxury-prefab-villa-g1.png",
    slug: "luxury-prefab-villa", inStock: true, condition: "new",
  },
  {
    id: "9", sku: "POC-PC-PORTA", name: "Porta Cabin",
    description: "Versatile porta cabin for offices, stores, and site use — quick to install, easy to relocate.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 195000, image: "/images/products/porta-cabin.jpg",
    slug: "porta-cabin", inStock: true, condition: "new",
  },
  {
    id: "10", sku: "POC-CO-GENR", name: "Office Portable Cabin",
    description: "Multi-purpose office portable cabin with insulated walls, electrical wiring, and customizable layouts.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 265000, image: "/images/products/office-portable-cabin-main.png",
    slug: "office-portable-cabin", inStock: true, condition: "new",
  },
  {
    id: "11", sku: "POC-PC-MSPC", name: "MS Portable Cabin",
    description: "Heavy-duty mild steel portable cabin with superior structural strength for demanding site conditions.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 225000, image: "/images/products/ms-portable-cabin.png",
    slug: "ms-portable-cabin", inStock: true, condition: "new",
  },
  {
    id: "12", sku: "POC-CSC-2040", name: "20ft & 40ft Storage Container – Corten Steel",
    description: "ISO-grade Corten steel storage containers in 20ft and 40ft sizes for secure, weather-resistant storage.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 120000, image: "/images/products/cargo-storage-container-40ft.jpg",
    slug: "cargo-storage-container-shipping-container", inStock: true, condition: "new",
  },
  {
    id: "13", sku: "POC-SOC-MSCO", name: "MS Container Office Cabin",
    description: "Mild steel container office cabin with complete interior fit-out — ready for immediate use on industrial sites.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 275000, image: "/images/products/ms-container-office-cabin-main.png",
    slug: "ms-container-office-cabin", inStock: true, condition: "new",
  },
  {
    id: "14", sku: "POC-SC-40HC", name: "New & Used Shipping Container for Sale in India",
    description: "Buy new and used shipping containers across India — 20ft, 40ft GP and HC sizes with CSC certification.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 95000, image: "/images/products/shipping-container-stacked.png",
    slug: "shipping-container-for-sale", inStock: true, condition: "new",
  },
  {
    id: "15", sku: "POC-SOC-CSPO", name: "Construction Site Portable Office",
    description: "Purpose-built portable office for construction sites with heavy-duty frame, insulation, and full electrical setup.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 285000, image: "/images/products/construction-site-portable-office-site-office.png",
    slug: "construction-site-portable-office", inStock: true, condition: "new",
  },
  {
    id: "16", sku: "POC-SC-USED", name: "Used Shipping Container for Sale",
    description: "Quality-inspected used shipping containers for sale — rust-treated, repainted, and ready for storage or conversion.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 80000, image: "/images/products/used-shipping-container-third.png",
    slug: "used-shipping-container-for-sale", inStock: true, condition: "used",
  },
  {
    id: "17", sku: "POC-CC-FS", name: "Cargo Container – Buy, Rent or Convert",
    description: "Versatile cargo containers available for purchase, rental, or custom conversion into offices and storage.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 110000, image: "/images/products/cargo-container-for-sale-main.png",
    slug: "cargo-container-for-sale", inStock: true, condition: "new",
  },
  {
    id: "18", sku: "POC-SC-RENT", name: "Shipping Container Rental",
    description: "Flexible shipping container rental options — short-term and long-term leases for storage, offices, and events.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 8000, image: "/images/products/shipping-container-rental-yard.png",
    slug: "shipping-container-rental", inStock: true, condition: "new",
  },
  {
    id: "19", sku: "POC-SOC-MFR", name: "Site Office Container Manufacturers",
    description: "Custom-built site office containers by leading manufacturers — designed for durability and rapid deployment.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 295000, image: "/images/products/site-office-container-manufacturers-exterior.png",
    slug: "site-office-container-manufacturers", inStock: true, condition: "new",
  },
  {
    id: "20", sku: "POC-PC-PREFAB", name: "Prefabricated Portable Cabin",
    description: "Factory-built prefabricated portable cabin with precision engineering and quick on-site assembly.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 245000, image: "/images/products/portable-cabin.jpg",
    slug: "prefabricated-portable-cabin", inStock: true, condition: "new",
  },
  {
    id: "22", sku: "POC-LH-STAFF", name: "Prefabricated Labour Hutments & Staff Accommodation",
    description: "Modular labour hutments and staff accommodation with bunk beds, sanitary facilities, and dining areas.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 385000, image: "/images/products/labour-hutments-staff-accommodation-1.png",
    slug: "prefabricated-labour-hutments-&-staff-accommodation", inStock: true, condition: "new",
  },
  {
    id: "23", sku: "POC-PC-PREFAB", name: "Prefab Porta Cabin",
    description: "Quick-install prefab porta cabin for offices, stores, and accommodation — available in multiple sizes.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 215000, image: "/images/products/prefab-porta-cabin-exterior.png",
    slug: "prefab-porta-cabin", inStock: true, condition: "new",
  },
  {
    id: "24", sku: "POC-LH-WORKER", name: "Labor Hutments",
    description: "Durable labor hutments for construction and industrial sites — designed for worker comfort and safety.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 345000, image: "/images/products/labor-hutments-aerial.png",
    slug: "labor-hutments", inStock: true, condition: "new",
  },
  {
    id: "25", sku: "POC-PC-CABPORT", name: "Cabin Portable",
    description: "Versatile portable cabin for multiple applications — offices, stores, guard rooms, and site accommodation.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 195000, image: "/images/products/cabin-portable-site.png",
    slug: "cabin-portable", inStock: true, condition: "new",
  },
  {
    id: "26", sku: "POC-SC-SECAB", name: "Security Cabin",
    description: "Professional security cabin with panoramic windows, built-in desk, and weather-resistant construction.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 110000, image: "/images/products/security-cabin-residential-gate.png",
    slug: "security-cabin", inStock: true, condition: "new",
  },
  {
    id: "27", sku: "POC-CO-CABIN", name: "Cabins in Office",
    description: "Modular office cabins for corporate spaces — private workstations, meeting pods, and phone booths.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 185000, image: "/images/products/cabins-in-office-modern.jpg",
    slug: "cabins-in-office", inStock: true, condition: "new",
  },
  {
    id: "28", sku: "POC-SOC-SPOC", name: "Steel Portable Office Container",
    description: "Heavy-duty steel portable office container with full insulation, electrical fit-out, and split AC provisions.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 310000, image: "/images/products/steel-portable-office-container-crane.png",
    slug: "steel-portable-office-container", inStock: true, condition: "new",
  },
  {
    id: "29", sku: "POC-SC-KRMG", name: "Shipping Container in Kormangala",
    description: "Shipping containers for sale and rent in Kormangala, Bangalore — storage, offices, and custom conversions.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 95000, image: "/images/products/shipping-container-kormangala-crane.png",
    slug: "shipping-container-in-kormangala", inStock: true, condition: "new",
  },
  {
    id: "30", sku: "POC-SC-KRSH", name: "Shipping Container in Krishnagiri",
    description: "Shipping containers for industrial storage and offices in Krishnagiri — SIPCOT and KIADB zone coverage.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 90000, image: "/images/products/shipping-container-krishnagiri-storage.png",
    slug: "shipping-container-in-krishnagiri", inStock: true, condition: "new",
  },
  {
    id: "31", sku: "POC-SC-SIPCOT", name: "Shipping Container in SIPCOT",
    description: "Shipping containers for SIPCOT industrial areas — storage, offices, and modular buildings for manufacturing units.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 90000, image: "/images/products/shipping-container-sipcot-yard.png",
    slug: "shipping-container-in-sipcot", inStock: true, condition: "new",
  },
  {
    id: "32", sku: "POC-SC-CHN", name: "Shipping Container in Chennai",
    description: "Shipping containers for sale, rent, and conversion in Chennai — serving Chennai Port, Ennore, Kattupalli, OMR, and ECR.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 80000, image: "/images/products/shipping-container-chennai-port.png",
    slug: "shipping-container-in-chennai", inStock: true, condition: "new",
  },
  {
    id: "33", sku: "POC-SC-NRSP", name: "Shipping Container in Narsapura Industrial",
    description: "Shipping containers for Narsapura Industrial Area — storage, offices, and labour colonies for KIADB zone factories.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 95000, image: "/images/products/shipping-container-narsapura-yard.png",
    slug: "shipping-container-in-narsapura-industrial", inStock: true, condition: "new",
  },
  {
    id: "34", sku: "POC-SC-PNYA", name: "Shipping Container in Peenya Industrial",
    description: "Buy or rent shipping containers in Peenya Industrial Area, Bengaluru — storage, offices, security cabins, and modular solutions for 3,500+ MSME industries.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 85000, image: "/images/products/shipping-container-peenya-industrial.png",
    slug: "shipping-container-in-peenya-industrial", inStock: true, condition: "new",
  },
  {
    id: "35", sku: "POC-CSC-GUIDE", name: "Cargo Storage Containers",
    description: "Complete guide to cargo storage containers in India — 20 ft, 40 ft, and high cube ISO-certified steel units for storage, offices, homes, and modular buildings. New, used, and converted options with PAN-India delivery.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 280000, image: "/images/products/cargo-storage-containers-main.png",
    slug: "cargo-storage-containers", inStock: true, condition: "new",
  },
  {
    id: "36", sku: "POC-CC-GUIDE", name: "Cargo Containers",
    description: "Cargo containers — GP, High Cube, flat rack, open top, reefer and tank types. Buy, convert or rent for modular offices, homes, cafés and site infrastructure across India.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 280000, image: "/images/products/cargo-containers-main.png",
    slug: "cargo-containers", inStock: true, condition: "new",
  },
  {
    id: "37", sku: "POC-CSC-PINK", name: "Cargo Storage Containers Pink",
    description: "Pink cargo storage containers for branding, retail pop-ups, cafés, offices and modular buildings. 20ft and 40ft ISO containers in vibrant pink with full customisation options.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 250000, image: "/images/products/cargo-storage-containers-pink-main.png",
    slug: "cargo-storage-containers-pink", inStock: true, condition: "new",
  },
  {
    id: "38", sku: "POC-SC-CARGO", name: "Cargo Shipping Container",
    description: "Cargo shipping container — ISO standardized steel boxes for intermodal freight transport and modular building conversions. 20ft, 40ft, and High Cube units for offices, homes, labour colonies across India.",
    category: "Business & Industrial > Material Handling > Shipping Containers",
    price: 125000, image: "/images/products/cargo-shipping-container-main.png",
    slug: "cargo-shipping-container", inStock: true, condition: "new",
  },
  {
    id: "39", sku: "POC-WA-G1", name: "Workmen Accommodation",
    description: "Prefabricated workmen accommodation — labour colonies, portable camps, and G+1 modular dormitory blocks for 50–500 workers with turnkey delivery across India.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 2000000, image: "/images/products/workmen-accommodation-main.png",
    slug: "workmen-accommodation", inStock: true, condition: "new",
  },
  {
    id: "40", sku: "POC-LC-PREFAB", name: "Labour Colony",
    description: "Prefabricated labour colony for construction sites, metro rail, refineries, and industrial plants. G+1/G+2 modular camps for 50–500 workers with turnkey delivery across India.",
    category: "Business & Industrial > Construction > Portable & Prefabricated Structures",
    price: 2200000, image: "/images/products/labour-colony-aerial.png",
    slug: "labour-colony", inStock: true, condition: "new",
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateFeed(): string {
  const now = new Date().toISOString().split("T")[0];
  
  const items = products.map((p) => {
    const productUrl = `${SITE_URL}/products/${p.slug}`;
    const imageUrl = `${SITE_URL}${p.image}`;
    const priceStr = `${p.price} INR`;
    const condition = p.condition === "used" ? "used" : "new";
    // Use valid Google taxonomy numeric IDs
    const googleCategoryId = p.category.includes("Shipping Containers") ? "5831" : "114";

    return `  <item>
    <g:id>${escapeXml(p.sku)}</g:id>
    <g:title>${escapeXml(p.name)}</g:title>
    <g:description>${escapeXml(p.description)}</g:description>
    <g:link>${escapeXml(productUrl)}</g:link>
    <g:image_link>${escapeXml(imageUrl)}</g:image_link>
    <g:condition>${condition}</g:condition>
    <g:availability>${p.inStock ? "in_stock" : "out_of_stock"}</g:availability>
    <g:price>${priceStr}</g:price>
    <g:brand>Portable Office Cabin</g:brand>
    <g:mpn>${escapeXml(p.sku)}</g:mpn>
    <g:google_product_category>${googleCategoryId}</g:google_product_category>
    <g:product_type>${escapeXml(p.category)}</g:product_type>
    <g:shipping>
      <g:country>IN</g:country>
      <g:service>Standard</g:service>
      <g:price>0 INR</g:price>
    </g:shipping>
    <g:identifier_exists>true</g:identifier_exists>
  </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Portable Office Cabin - Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Portable cabins, shipping containers, prefab homes, and modular buildings by Portable Office Cabin</description>
${items}
  </channel>
</rss>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feed = generateFeed();
    return new Response(feed, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error generating merchant feed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
