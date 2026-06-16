"use client";

import { useEffect } from "react";

const SITE_URL = "https://portableofficecabin.com";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  structuredData?: object | object[];
  geoRegion?: string;
  geoPlacename?: string;
  geoPosition?: string;
  icbm?: string;
}

export function SEOHead({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = "https://portableofficecabin.com/og-image.jpg",
  ogType = "website",
  structuredData,
  geoRegion = "IN-KA",
  geoPlacename = "Bangalore, Karnataka, India",
  geoPosition = "12.9716;77.5946",
  icbm = "12.9716, 77.5946",
}: SEOHeadProps) {
  useEffect(() => {
    const resolvedCanonicalUrl =
      canonicalUrl || `${SITE_URL}${window.location.pathname}`;

    document.title = title;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("geo.region", geoRegion);
    setMeta("geo.placename", geoPlacename);
    setMeta("geo.position", geoPosition);
    setMeta("ICBM", icbm);

    if (keywords) {
      setMeta("keywords", keywords);
    }

    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", ogType, true);
    setMeta("og:image", ogImage, true);
    setMeta("og:url", resolvedCanonicalUrl, true);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", resolvedCanonicalUrl);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"][data-seo-head="true"]');
      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo-head", "true");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    return () => {
      const script = document.querySelector('script[type="application/ld+json"][data-seo-head="true"]');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, structuredData, geoRegion, geoPlacename, geoPosition, icbm]);

  return null;
}
