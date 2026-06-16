#!/usr/bin/env node
/**
 * Generates thin Next.js app router page.tsx wrappers from route map.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const siteRoutes = [
  { path: "app/(site)/page.tsx", importPath: "@/views/Index", name: "Index" },
  { path: "app/(site)/products/page.tsx", importPath: "@/views/Products", name: "ProductsPage" },
  { path: "app/(site)/rental-service/page.tsx", importPath: "@/views/RentalService", name: "RentalServicePage" },
  { path: "app/(site)/contact/page.tsx", importPath: "@/views/Contact", name: "ContactPage" },
  { path: "app/(site)/about-us/page.tsx", importPath: "@/views/About", name: "AboutPage" },
  { path: "app/(site)/gallery/page.tsx", importPath: "@/views/Projects", name: "ProjectsPage" },
  { path: "app/(site)/book-appointment/page.tsx", importPath: "@/views/BookAppointment", name: "BookAppointment" },
  { path: "app/(site)/shipping/page.tsx", importPath: "@/views/ShippingDelivery", name: "ShippingDeliveryPage" },
  { path: "app/(site)/warranty/page.tsx", importPath: "@/views/Warranty", name: "WarrantyPage" },
  { path: "app/(site)/careers/page.tsx", importPath: "@/views/Careers", name: "CareersPage" },
  { path: "app/(site)/faq/page.tsx", importPath: "@/views/FAQ", name: "FAQPage" },
  { path: "app/(site)/privacy-policy/page.tsx", importPath: "@/views/PrivacyPolicy", name: "PrivacyPolicyPage" },
  { path: "app/(site)/terms-and-conditions/page.tsx", importPath: "@/views/TermsConditions", name: "TermsConditionsPage" },
  { path: "app/(site)/refund-policy/page.tsx", importPath: "@/views/RefundPolicy", name: "RefundPolicyPage" },
  { path: "app/(site)/login/page.tsx", importPath: "@/views/Login", name: "LoginPage" },
  { path: "app/(site)/register/page.tsx", importPath: "@/views/Register", name: "RegisterPage" },
  { path: "app/(site)/forgot-password/page.tsx", importPath: "@/views/ForgotPassword", name: "ForgotPasswordPage" },
  { path: "app/(site)/reset-password/page.tsx", importPath: "@/views/ResetPassword", name: "ResetPasswordPage" },
  { path: "app/(site)/cart/page.tsx", importPath: "@/views/Cart", name: "CartPage" },
  { path: "app/(site)/checkout/page.tsx", importPath: "@/views/Checkout", name: "CheckoutPage" },
  { path: "app/(site)/my-account/page.tsx", importPath: "@/views/MyAccount", name: "MyAccountPage" },
  { path: "app/(site)/my-account/orders/page.tsx", importPath: "@/views/MyOrders", name: "MyOrdersPage" },
  { path: "app/(site)/blog/page.tsx", importPath: "@/views/Blog", name: "BlogPage" },
  { path: "app/(site)/blog/labour-shed-prefabricated-structures/page.tsx", importPath: "@/views/blog/LabourShedPrefabricatedStructures", name: "LabourShedBlog" },
  { path: "app/(site)/blog/porta-cabins-on-rent/page.tsx", importPath: "@/views/blog/PortaCabinsOnRent", name: "PortaCabinsOnRentBlog" },
  { path: "app/(site)/blog/ms-portable-cabin-durable-mild-steel-modular-building/page.tsx", importPath: "@/views/blog/MSPortableCabinBlog", name: "MSPortableCabinBlog" },
  { path: "app/(site)/blog/prefabricated-labor-colony-bengaluru/page.tsx", importPath: "@/views/blog/PrefabLabourColonyBengaluru", name: "PrefabLabourColonyBengaluru" },
  { path: "app/(site)/blog/portable-cabin-manufacturers-in-bangalore/page.tsx", importPath: "@/views/blog/PortableCabinManufacturersBangalore", name: "PortableCabinManufacturersBangalore" },
];

const adminRoutes = [
  { path: "app/admin/page.tsx", importPath: "@/views/admin/Overview", name: "AdminOverview" },
  { path: "app/admin/analytics/page.tsx", importPath: "@/views/admin/Analytics", name: "AdminAnalytics" },
  { path: "app/admin/crm/page.tsx", importPath: "@/views/admin/CRM", name: "AdminCRM" },
  { path: "app/admin/pipeline/page.tsx", importPath: "@/views/admin/LeadsPipeline", name: "AdminLeadsPipeline" },
  { path: "app/admin/customers/page.tsx", importPath: "@/views/admin/Customers", name: "AdminCustomers" },
  { path: "app/admin/parties/page.tsx", importPath: "@/views/admin/Parties", name: "AdminParties" },
  { path: "app/admin/rental-contracts/page.tsx", importPath: "@/views/admin/RentalContracts", name: "AdminRentalContracts" },
  { path: "app/admin/enquiries/page.tsx", importPath: "@/views/admin/Enquiries", name: "AdminEnquiries" },
  { path: "app/admin/reviews/page.tsx", importPath: "@/views/admin/Reviews", name: "AdminReviews" },
  { path: "app/admin/appointments/page.tsx", importPath: "@/views/admin/Appointments", name: "AdminAppointments" },
  { path: "app/admin/sales/page.tsx", importPath: "@/views/admin/SalesQuotation", name: "AdminSalesQuotation" },
  { path: "app/admin/quotation-pro/page.tsx", importPath: "@/views/admin/QuotationPro", name: "AdminQuotationPro" },
  { path: "app/admin/orders/page.tsx", importPath: "@/views/admin/Orders", name: "AdminOrders" },
  { path: "app/admin/products/page.tsx", importPath: "@/views/admin/Products", name: "AdminProducts" },
  { path: "app/admin/categories/page.tsx", importPath: "@/views/admin/Categories", name: "AdminCategories" },
  { path: "app/admin/inventory/page.tsx", importPath: "@/views/admin/Inventory", name: "AdminInventory" },
  { path: "app/admin/factory-invoices/page.tsx", importPath: "@/views/admin/FactoryInvoiceTracker", name: "FactoryInvoiceTracker" },
  { path: "app/admin/cabin-quotation/page.tsx", importPath: "@/views/admin/CabinQuotation", name: "CabinQuotation" },
  { path: "app/admin/suppliers/page.tsx", importPath: "@/views/admin/Suppliers", name: "AdminSuppliers" },
  { path: "app/admin/specifications/page.tsx", importPath: "@/views/admin/Specifications", name: "AdminSpecifications" },
  { path: "app/admin/settings/page.tsx", importPath: "@/views/admin/Settings", name: "AdminSettings" },
  { path: "app/admin/inventory-pro/page.tsx", importPath: "@/views/admin/inventory-pro/Dashboard", name: "InventoryProDashboard" },
  { path: "app/admin/inventory-pro/materials/page.tsx", importPath: "@/views/admin/inventory-pro/Materials", name: "IPMaterials" },
  { path: "app/admin/inventory-pro/factories/page.tsx", importPath: "@/views/admin/inventory-pro/Factories", name: "IPFactories" },
  { path: "app/admin/inventory-pro/inward/page.tsx", importPath: "@/views/admin/inventory-pro/StockInward", name: "IPInward" },
  { path: "app/admin/inventory-pro/outward/page.tsx", importPath: "@/views/admin/inventory-pro/StockOutward", name: "IPOutward" },
  { path: "app/admin/inventory-pro/transfers/page.tsx", importPath: "@/views/admin/inventory-pro/Transfers", name: "IPTransfers" },
  { path: "app/admin/inventory-pro/projects/page.tsx", importPath: "@/views/admin/inventory-pro/Projects", name: "IPProjects" },
  { path: "app/admin/inventory-pro/purchase-orders/page.tsx", importPath: "@/views/admin/inventory-pro/PurchaseOrders", name: "IPPOs" },
  { path: "app/admin/inventory-pro/rentals/page.tsx", importPath: "@/views/admin/inventory-pro/Rentals", name: "IPRentals" },
  { path: "app/admin/inventory-pro/gate-pass/page.tsx", importPath: "@/views/admin/inventory-pro/GatePass", name: "IPGatePass" },
  { path: "app/admin/inventory-pro/production/page.tsx", importPath: "@/views/admin/inventory-pro/Production", name: "IPProduction" },
  { path: "app/admin/inventory-pro/scrap/page.tsx", importPath: "@/views/admin/inventory-pro/Scrap", name: "IPScrap" },
  { path: "app/admin/inventory-pro/alerts/page.tsx", importPath: "@/views/admin/inventory-pro/LowStockAlerts", name: "IPAlerts" },
  { path: "app/admin/inventory-pro/reports/page.tsx", importPath: "@/views/admin/inventory-pro/Reports", name: "IPReports" },
  { path: "app/admin/inventory-pro/scanner/page.tsx", importPath: "@/views/admin/inventory-pro/Scanner", name: "IPScanner" },
  { path: "app/admin/inventory-pro/work-orders/page.tsx", importPath: "@/views/admin/inventory-pro/WorkOrders", name: "IPWorkOrders" },
  { path: "app/admin/inventory-pro/machinery/page.tsx", importPath: "@/views/admin/inventory-pro/Machinery", name: "IPMachinery" },
];

const authAdminRoutes = [
  { path: "app/admin/login/page.tsx", importPath: "@/views/AdminLogin", name: "AdminLogin" },
  { path: "app/admin/setup/page.tsx", importPath: "@/views/AdminSetup", name: "AdminSetup" },
];

function writePage(filePath, importPath, name) {
  const full = join(ROOT, filePath);
  mkdirSync(dirname(full), { recursive: true });
  const content = `import ${name} from "${importPath}";\n\nexport default function Page() {\n  return <${name} />;\n}\n`;
  writeFileSync(full, content);
  console.log("wrote", filePath);
}

[...siteRoutes, ...adminRoutes, ...authAdminRoutes].forEach((r) =>
  writePage(r.path, r.importPath, r.name),
);

// Product detail dynamic route
const productPage = join(ROOT, "app/(site)/products/[slug]/page.tsx");
mkdirSync(dirname(productPage), { recursive: true });
writeFileSync(
  productPage,
  `import ProductDetailPage from "@/views/ProductDetail";
import { products, getProductSlug } from "@/data/products";
import { getProductSEO } from "@/data/productSEO";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\\.html$/i, "");
  const product = products.find((p) => getProductSlug(p) === normalized);
  if (!product) return {};
  const seo = getProductSEO(product.id);
  return buildPageMetadata({
    title: seo?.title || product.name,
    description: seo?.description || product.shortDescription,
    keywords: seo?.keywords,
    path: \`/products/\${normalized}\`,
    ogType: "product",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalized = slug.replace(/\\.html$/i, "");
  const exists = products.some((p) => getProductSlug(p) === normalized);
  if (!exists) notFound();
  return <ProductDetailPage slug={normalized} />;
}
`,
);

// Not found
writePage("app/not-found.tsx", "@/views/NotFound", "NotFound");

// Inventory pro layout
const ipLayout = join(ROOT, "app/admin/inventory-pro/layout.tsx");
writeFileSync(
  ipLayout,
  `import InventoryProLayout from "@/views/admin/inventory-pro/InventoryProLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InventoryProLayout>{children}</InventoryProLayout>;
}
`,
);

console.log("Done generating routes.");
