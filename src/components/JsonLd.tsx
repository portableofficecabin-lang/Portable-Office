// Server component that renders JSON-LD structured data into the initial HTML.
// Replaces client-side document.head injection (SEOHead) so structured data is
// crawlable in the page source.
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
