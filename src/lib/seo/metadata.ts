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
  ogImage,
  ogType = "website",
  geo,
}: {
  title?: string;
  absoluteTitle?: string;
  description: string;
  keywords?: string;
  path: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  geo?: GeoMeta;
}) {
  const canonical = buildCanonical(path);
  const image = ogImage ?? siteConfig.defaultOgImage;
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
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      images: [{ url: image }],
      type: ogType,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: resolvedTitle,
      description,
      images: [image],
    },
    other: {
      "geo.region": geoMeta.region,
      "geo.placename": geoMeta.placename,
      "geo.position": geoMeta.position,
      ICBM: geoMeta.icbm,
    },
  };
}
