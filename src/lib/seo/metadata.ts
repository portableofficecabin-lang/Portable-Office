const SITE_URL = "https://portableofficecabin.com";

export const siteConfig = {
  url: SITE_URL,
  name: "Portable Office Cabin",
  defaultOgImage: `${SITE_URL}/og-image.jpg`,
  geoRegion: "IN-KA",
  geoPlacename: "Bangalore, Karnataka, India",
  geoPosition: "12.9716;77.5946",
  icbm: "12.9716, 77.5946",
};

export function buildCanonical(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Force any image reference to a fully-qualified https URL.
 *
 * A RELATIVE og:image does not render — Facebook/WhatsApp/X and Google's rich-result
 * preview all require an absolute URL. Several callers hand us a Next static-import path
 * ("/_next/static/media/…"), so absolutising here (rather than at each call site) means no
 * page can ship a broken social image.
 */
function toAbsoluteImage(url: string): string {
  if (!url) return siteConfig.defaultOgImage;
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

type GeoMeta = {
  region: string;
  placename: string;
  position: string;
  icbm: string;
};

export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  keywords,
  path,
  image,
  ogImage,
  imageAlt,
  ogType = "website",
  geo,
}: {
  title?: string;
  absoluteTitle?: string;
  description: string;
  keywords?: string;
  path: string;
  /**
   * The page's own primary image — for a product page, the SAME photo the gallery shows
   * (and the same one <g:image_link> sends to Merchant Center). Absolute or root-relative;
   * it is absolutised for you. OPTIONAL — omit it and the site-wide og-image.jpg is used,
   * exactly as before.
   */
  image?: string;
  /** @deprecated Older alias for `image`. Kept so existing callers keep working. */
  ogImage?: string;
  /** Alt text for the social image. Optional. */
  imageAlt?: string;
  ogType?: "website" | "article" | "product";
  geo?: GeoMeta;
}) {
  const canonical = buildCanonical(path);
  const resolvedImage = toAbsoluteImage(image ?? ogImage ?? siteConfig.defaultOgImage);
  const resolvedTitle = absoluteTitle ?? title ?? siteConfig.name;
  const titleField = absoluteTitle ? { absolute: absoluteTitle } : resolvedTitle;
  const geoMeta = geo ?? {
    region: siteConfig.geoRegion,
    placename: siteConfig.geoPlacename,
    position: siteConfig.geoPosition,
    icbm: siteConfig.icbm,
  };

  return {
    title: titleField,
    description,
    keywords,
    alternates: { canonical },
    // Public SEO pages are explicitly indexable. This lives here (not on the root
    // layout) so it applies ONLY to real content pages built via this helper — NOT
    // to the not-found boundary or private routes. That prevents the layout's
    // index,follow from colliding with Next's auto noindex on 404 renders (which
    // produced the contradictory "index, follow" + "noindex" Ahrefs flagged).
    robots: { index: true, follow: true },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      images: [imageAlt ? { url: resolvedImage, alt: imageAlt } : { url: resolvedImage }],
      type: ogType,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: resolvedTitle,
      description,
      images: [resolvedImage],
    },
    other: {
      "geo.region": geoMeta.region,
      "geo.placename": geoMeta.placename,
      "geo.position": geoMeta.position,
      ICBM: geoMeta.icbm,
    },
  };
}
