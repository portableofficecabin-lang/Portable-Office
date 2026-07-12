// WebSite JSON-LD (server component). Names the site as an entity and ties it back to
// the Organization node, which the site had no schema for. No SearchAction /
// potentialAction: there is no /search route, and declaring one that does not exist
// would be a false capability claim.
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo/structured-data";

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Portable Office Cabin",
  url: SITE_URL,
  // `logo` points at public/logo.jpeg (real 400x400 JPEG). Keep that asset in the
  // repo: structured-data.ts and the blog Article publishers reference the same URL,
  // so deleting it would 404 the publisher logo across every schema on the site.
  publisher: {
    "@type": "Organization",
    name: "Portable Office Cabin",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.jpeg`,
  },
};

export function WebsiteJsonLd() {
  return <JsonLd data={websiteStructuredData} />;
}
