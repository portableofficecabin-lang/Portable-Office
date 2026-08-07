// Product images by category and specific products
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import portableCabin from "@/assets/products/portable-cabin.jpg";
import containerOfficeWoodGlass from "@/assets/products/container-office-wood-glass.webp";
import siteOfficeContainer from "@/assets/products/site-office-container.webp";
import containerOffice from "@/assets/products/container-office.webp";
import prefabHome from "@/assets/products/prefab-home.webp";
import portableToilet from "@/assets/products/portable-toilet.jpg";
import securityCabin from "@/assets/products/security-cabin.jpg";
import standardSiteOfficeContainer from "@/assets/products/standard-site-office-container.webp";
import luxuryPrefabVilla from "@/assets/products/luxury-prefab-villa.webp";
import portaCabin from "@/assets/products/porta-cabin.webp";
import msPortableCabin from "@/assets/products/ms-portable-cabin.webp";
import cargoStorageContainer40ft from "@/assets/rental/cargo-storage-container-40ft.webp";
import shippingContainerMain from "@/assets/products/shipping-container-stacked.webp";
import usedShippingContainerMain from "@/assets/products/used-shipping-container-main.webp";
import usedShippingContainerDisplay from "@/assets/products/used-shipping-container-third.webp";
import cargoContainerForSaleMain from "@/assets/products/cargo-container-for-sale-main.webp";
import labourHutmentsMain from "@/assets/products/labour-hutments-staff-accommodation-1.webp";
import prefabPortaCabinCrane from "@/assets/products/prefab-porta-cabin-exterior.webp";
import laborHutmentsAerial from "@/assets/products/labor-hutments-aerial.webp";
import cabinPortableSite from "@/assets/products/cabin-portable-site.webp";
import cabinsInOfficeModern from "@/assets/products/cabins-in-office-modern.webp";
import steelPortableOfficeContainerCrane from "@/assets/products/steel-portable-office-container-crane.webp";
import cargoStorageContainersMain from "@/assets/products/cargo-storage-containers-main.webp";
import cargoContainersMain from "@/assets/products/cargo-containers-main.webp";
import cargoStorageContainersPinkMain from "@/assets/products/cargo-storage-containers-pink-main.webp";

// Category-level images
export const categoryImages: Record<string, string> = {
  "portable-cabins": portableCabin,
  "site-office-containers": siteOfficeContainer,
  "container-offices": containerOffice,
  "prefab-homes": prefabHome,
  "portable-toilet-cabins": portableToilet,
  "security-cabins": securityCabin,
  "cargo-storage-shipping-containers": cargoStorageContainer40ft,
};

// Product-specific images by product ID or SKU
export const productImages: Record<string, string> = {
  // Owner-supplied FRONT photo (Aug 2026) — must match products.ts images[0] so the
  // card, page, OG and feed all show the same primary image.
  "1": "/images/products/executive-portable-cabin-20ft-front-view.webp",
  "POC-PC-20EX": "/images/products/executive-portable-cabin-20ft-front-view.webp",
  "executive-portable-cabin-20ft": "/images/products/executive-portable-cabin-20ft-front-view.webp",
  "2": standardSiteOfficeContainer,
  "POC-SOC-20ST": standardSiteOfficeContainer,
  "standard-site-office-container": standardSiteOfficeContainer,
  "8": "/images/products/luxury-prefab-villa-g1-main.webp",
  "POC-PH-3LUX": "/images/products/luxury-prefab-villa-g1-main.webp",
  "luxury-prefab-villa": "/images/products/luxury-prefab-villa-g1-main.webp",
  "9": "/images/products/porta-cabin-front.webp",
  "POC-PC-PORTA": "/images/products/porta-cabin-front.webp",
  "porta-cabin": "/images/products/porta-cabin-front.webp",
  "7": "/images/products/portable-cabin-40ft-bunkhouse-front.webp",
  "POC-PC-40BH": "/images/products/portable-cabin-40ft-bunkhouse-front.webp",
  "portable-cabin-40ft-bunkhouse": "/images/products/portable-cabin-40ft-bunkhouse-front.webp",
  "4": "/images/products/family-prefab-home-2bhk-main.webp",
  "POC-PH-2BHK": "/images/products/family-prefab-home-2bhk-main.webp",
  "family-prefab-home-2bhk": "/images/products/family-prefab-home-2bhk-main.webp",
  "10": "/images/products/container-office-front.webp",
  "POC-CO-GEN": "/images/products/container-office-front.webp",
  "container-office": "/images/products/container-office-front.webp",
  "11": "/images/products/ms-portable-cabin-front.webp",
  "POC-PC-MSPC": "/images/products/ms-portable-cabin-front.webp",
  "ms-portable-cabin": "/images/products/ms-portable-cabin-front.webp",
  "12": cargoStorageContainer40ft,
  "POC-CSC-2040": cargoStorageContainer40ft,
  "cargo-storage-container-shipping-container": cargoStorageContainer40ft,
  "14": shippingContainerMain,
  "POC-SC-40HC": shippingContainerMain,
  "shipping-container": shippingContainerMain,
  "shipping-container-for-sale": shippingContainerMain,
  "16": usedShippingContainerDisplay,
  "POC-SC-USED": usedShippingContainerDisplay,
  "used-shipping-container-for-sale": usedShippingContainerDisplay,
  "17": cargoContainerForSaleMain,
  "POC-CC-FS": cargoContainerForSaleMain,
  "cargo-container-for-sale": cargoContainerForSaleMain,
  "18": "/images/products/shipping-container-rental-yard.webp",
  "POC-SC-RENT": "/images/products/shipping-container-rental-yard.webp",
  "shipping-container-rental": "/images/products/shipping-container-rental-yard.webp",
  "15": "/images/products/construction-site-portable-office-site-office.webp",
  "POC-SOC-CSPO": "/images/products/construction-site-portable-office-site-office.webp",
  "construction-site-portable-office": "/images/products/construction-site-portable-office-site-office.webp",
  "19": "/images/products/site-office-container-manufacturers-exterior.webp",
  "POC-SOC-MFR": "/images/products/site-office-container-manufacturers-exterior.webp",
  "site-office-container-manufacturers": "/images/products/site-office-container-manufacturers-exterior.webp",
  "22": labourHutmentsMain,
  "POC-LH-STAFF": labourHutmentsMain,
  "prefabricated-labour-hutments-&-staff-accommodation": labourHutmentsMain,
  "23": prefabPortaCabinCrane,
  "POC-PC-PREFAB": prefabPortaCabinCrane,
  "prefab-porta-cabin": prefabPortaCabinCrane,
  "24": laborHutmentsAerial,
  "POC-LH-WORKER": laborHutmentsAerial,
  "labor-hutments": laborHutmentsAerial,
  "25": cabinPortableSite,
  "POC-PC-CABPORT": cabinPortableSite,
  "cabin-portable": cabinPortableSite,
  "26": "/images/products/security-cabin-residential-gate.webp",
  "POC-SC-SECAB": "/images/products/security-cabin-residential-gate.webp",
  "security-cabin": "/images/products/security-cabin-residential-gate.webp",
  "27": cabinsInOfficeModern,
  "POC-CO-CABIN": cabinsInOfficeModern,
  "cabins-in-office": cabinsInOfficeModern,
  "28": steelPortableOfficeContainerCrane,
  "POC-SOC-SPOC": steelPortableOfficeContainerCrane,
  "steel-portable-office-container": steelPortableOfficeContainerCrane,
  "29": "/images/products/shipping-container-kormangala-crane.webp",
  "POC-SC-KRMG": "/images/products/shipping-container-kormangala-crane.webp",
  "shipping-container-in-kormangala": "/images/products/shipping-container-kormangala-crane.webp",
  "30": "/images/products/shipping-container-krishnagiri-storage.webp",
  "POC-SC-KRSH": "/images/products/shipping-container-krishnagiri-storage.webp",
  "shipping-container-in-krishnagiri": "/images/products/shipping-container-krishnagiri-storage.webp",
  "31": "/images/products/shipping-container-sipcot-yard.webp",
  "POC-SC-SIPCOT": "/images/products/shipping-container-sipcot-yard.webp",
  "shipping-container-in-sipcot": "/images/products/shipping-container-sipcot-yard.webp",
  "32": "/images/products/shipping-container-chennai-port.webp",
  "POC-SC-CHN": "/images/products/shipping-container-chennai-port.webp",
  "shipping-container-in-chennai": "/images/products/shipping-container-chennai-port.webp",
  "33": "/images/products/shipping-container-narsapura-yard.webp",
  "POC-SC-NRSP": "/images/products/shipping-container-narsapura-yard.webp",
  "shipping-container-in-narsapura-industrial": "/images/products/shipping-container-narsapura-yard.webp",
  "34": "/images/products/shipping-container-peenya-industrial.webp",
  "POC-SC-PNYA": "/images/products/shipping-container-peenya-industrial.webp",
  "shipping-container-in-peenya-industrial": "/images/products/shipping-container-peenya-industrial.webp",
  "35": cargoStorageContainersMain,
  "POC-CSC-GUIDE": cargoStorageContainersMain,
  "cargo-storage-containers": cargoStorageContainersMain,
  "36": cargoContainersMain,
  "POC-CC-GUIDE": cargoContainersMain,
  "cargo-containers": cargoContainersMain,
  "37": cargoStorageContainersPinkMain,
  "POC-CSC-PINK": cargoStorageContainersPinkMain,
  "cargo-storage-containers-pink": cargoStorageContainersPinkMain,
  "38": "/images/products/cargo-shipping-container-main.webp",
  "POC-SC-CARGO": "/images/products/cargo-shipping-container-main.webp",
  "cargo-shipping-container": "/images/products/cargo-shipping-container-main.webp",
  "39": "/images/products/workmen-accommodation-g1-main.webp",
  "POC-WA-G1": "/images/products/workmen-accommodation-g1-main.webp",
  "workmen-accommodation": "/images/products/workmen-accommodation-g1-main.webp",
  "40": "/images/products/labour-colony-aerial-main.png",
  "POC-LC-PREFAB": "/images/products/labour-colony-aerial-main.png",
  "labour-colony": "/images/products/labour-colony-aerial-main.png",
  // Public-path strings (not bundled imports) — the map is Record<string, string>, and this is the
  // type-clean pattern products 7/9/10/11 already use.
  "42": "/images/products/container-site-office-main.webp",
  "POC-CSO-4010": "/images/products/container-site-office-main.webp",
  "container-site-office": "/images/products/container-site-office-main.webp",
};

// Get image for a specific product
export const getProductImageById = (productId: string, sku?: string): string | null => {
  const image = productImages[productId] ?? (sku ? productImages[sku] : undefined);
  if (!image) return null;
  return resolveImageUrl(image);
};

// Get image for a category (fallback)
export const getProductImage = (categorySlug: string): string => {
  return resolveImageUrl(categoryImages[categorySlug]) || resolveImageUrl(portableCabin);
};

// Get the best available image for a product
export const getBestProductImage = (
  productId: string,
  categorySlug: string,
  // Accepts a path string OR a static image import ({ src }). The body already
  // normalises via resolveImageUrl(), so this only widens the type to match what
  // callers pass (product.images[0] is Array<string | { src }>). Fixing it here fixes
  // every call site — ProductCard, FeaturedProducts and the [slug] page — at once.
  existingImage?: string | { src: string },
  sku?: string
): string => {
  // First, check for product-specific image
  const productSpecificImage = getProductImageById(productId, sku);
  if (productSpecificImage) return productSpecificImage;
  
  // Then, check if there's an existing valid image (not placeholder)
  const resolvedExisting = resolveImageUrl(existingImage);
  if (resolvedExisting && !resolvedExisting.includes("placeholder")) {
    return resolvedExisting;
  }
  
  // Finally, fall back to category image
  return getProductImage(categorySlug);
};
