// WebSite JSON-LD (server component). Names the site as an entity and ties it back to
// the Organization node, which the site had no schema for. No SearchAction /
// potentialAction: there is no /search route, and declaring one that does not exist
// would be a false capability claim.
import { JsonLd } from "@/components/JsonLd";
import { ORGANIZATION_ID, SITE_URL } from "@/lib/seo/structured-data";
import { COMPANY } from "@/lib/company";

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: COMPANY.tradingName,
  url: SITE_URL,
  // `logo` points at public/logo.jpeg (real 400x400 JPEG). Keep that asset in the
  // repo: structured-data.ts and the blog Article publishers reference the same URL,
  // so deleting it would 404 the publisher logo across every schema on the site.
  // Same @id as the Organization node, so the publisher IS that organization.
  publisher: {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: COMPANY.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.jpeg`,
  },
};

export function WebsiteJsonLd() {
  return <JsonLd data={websiteStructuredData} />;
}
