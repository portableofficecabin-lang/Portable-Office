"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { generateGeoAlt, generateImageTitle } from "@/utils/imageGeoTagging";

const DEFAULT_TITLE = "Portable Office Cabin image";
const DEFAULT_CANONICAL_BASE = "https://portableofficecabin.com";
const DEFAULT_SITE_NAME = "Portable Office Cabin";
const DEFAULT_OG_IMAGE = "https://portableofficecabin.com/og-image.jpg";

const setMetaTag = (name: string, content: string, isProperty = false) => {
  const attr = isProperty ? "property" : "name";
  let element = document.head.querySelector(`meta[${attr}="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const setCanonicalLink = (href: string) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", href);
};

const formatImageName = (src: string) => {
  const filename = src.split("/").pop()?.split("?")[0]?.split("#")[0] || "";
  const withoutExtension = filename.replace(/\.[a-z0-9]+$/i, "");
  const normalized = withoutExtension.replace(/[-_]+/g, " ").trim();

  if (!normalized) return DEFAULT_TITLE;

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatRouteLabel = (pathname: string) => {
  if (pathname === "/") return "Home";

  const cleanedPath = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[-_]+/g, " ").trim())
    .filter(Boolean);

  const rawLabel = cleanedPath[cleanedPath.length - 1] || "Home";

  return rawLabel
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildFallbackMetadata = (pathname: string) => {
  const pageLabel = formatRouteLabel(pathname);
  const title =
    pathname === "/"
      ? "Portable Office Cabin – India's Leading Portable Cabin & Container Office Manufacturer"
      : `${pageLabel} | ${DEFAULT_SITE_NAME}`;

  const description =
    pathname === "/"
      ? "Explore portable cabins, container offices, prefab structures, shipping containers, and modular building solutions from Portable Office Cabin across India."
      : `Explore ${pageLabel.toLowerCase()} solutions, specifications, and project-ready modular building support from ${DEFAULT_SITE_NAME}.`;

  return { title, description };
};

const enhanceImages = (root: ParentNode = document) => {
  const images = root.querySelectorAll("img");

  images.forEach((img) => {
    const existingAlt = img.getAttribute("alt")?.trim();
    const baseAlt = existingAlt || formatImageName(img.getAttribute("src") || "");

    img.setAttribute("alt", generateGeoAlt(baseAlt));

    const existingTitle = img.getAttribute("title")?.trim();
    img.setAttribute("title", existingTitle || generateImageTitle(baseAlt));
  });
};

export function GlobalGeoSignals() {
  const pathname = usePathname();
  const skipPageOverrides =
    pathname.startsWith("/promotions") || pathname === "/marketplace";

  useEffect(() => {
    if (!skipPageOverrides) {
      setMetaTag("geo.region", "IN-KA");
      setMetaTag("geo.placename", "Bangalore, Karnataka, India");
      setMetaTag("geo.position", "12.9716;77.5946");
      setMetaTag("ICBM", "12.9716, 77.5946");
    }

    const canonicalUrl = `${DEFAULT_CANONICAL_BASE}${pathname}`;
    if (!skipPageOverrides) {
      setCanonicalLink(canonicalUrl);
    }
    setMetaTag("og:url", canonicalUrl, true);

    const syncMetadata = () => {
      const fallback = buildFallbackMetadata(pathname);
      const currentTitle = document.title?.trim();
      const resolvedTitle = currentTitle && currentTitle !== "Lovable" ? currentTitle : fallback.title;

      if (!currentTitle || currentTitle === "Lovable") {
        document.title = resolvedTitle;
      }

      const existingDescription = document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim();
      const resolvedDescription = existingDescription || fallback.description;

      if (!existingDescription) {
        setMetaTag("description", resolvedDescription);
      }

      setMetaTag("og:title", resolvedTitle, true);
      setMetaTag("og:description", resolvedDescription, true);
      setMetaTag("og:type", "website", true);
      if (!skipPageOverrides) {
        setMetaTag("og:image", DEFAULT_OG_IMAGE, true);
        setMetaTag("twitter:image", DEFAULT_OG_IMAGE);
      }
      setMetaTag("twitter:card", "summary_large_image");
      setMetaTag("twitter:title", resolvedTitle);
      setMetaTag("twitter:description", resolvedDescription);
    };

    const timer = window.setTimeout(syncMetadata, 0);

    const applyEnhancements = () => {
      if (skipPageOverrides) return;
      enhanceImages(document);
    };
    applyEnhancements();

    if (skipPageOverrides) {
      return () => window.clearTimeout(timer);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.tagName === "IMG") {
            enhanceImages(node.parentElement || document);
            return;
          }

          enhanceImages(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname, skipPageOverrides]);

  return null;
}

