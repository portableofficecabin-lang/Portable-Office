// Product images by category and specific products
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import portableCabin from "@/assets/products/portable-cabin.jpg";
import containerOfficeWoodGlass from "@/assets/products/container-office-wood-glass.webp";
import siteOfficeContainer from "@/assets/products/site-office-container.webp";
import containerOffice from "@/assets/products/container-office.webp";
import prefabHome from "@/assets/products/prefab-home.webp";
import portableToilet from "@/assets/products/portable-toilet.jpg";
import securityCabin from "@/assets/products/security-cabin.jpg";
import executivePortableCabin20ft from "@/assets/products/executive-portable-cabin-20ft.webp";
import standardSiteOfficeContainer from "@/assets/products/standard-site-office-container.webp";
import luxuryPrefabVilla from "@/assets/products/luxury-prefab-villa.webp";
import luxuryPrefabVillaG1 from "@/assets/products/luxury-prefab-villa-g1.webp";
import portaCabin from "@/assets/products/porta-cabin.webp";
import portableCabin40ftBunkhouse from "@/assets/products/portable-cabin-40ft-bunkhouse.webp";
import familyPrefabHome2bhk from "@/assets/products/family-prefab-home-2bhk.webp";
import msPortableCabin from "@/assets/products/ms-portable-cabin.webp";
import cargoStorageContainer40ft from "@/assets/rental/cargo-storage-container-40ft.webp";
import shippingContainerMain from "@/assets/products/shipping-container-stacked.webp";
import usedShippingContainerMain from "@/assets/products/used-shipping-container-main.webp";
import usedShippingContainerDisplay from "@/assets/products/used-shipping-container-third.webp";
import cargoContainerForSaleMain from "@/assets/products/cargo-container-for-sale-main.webp";
import shippingContainerRentalMain from "@/assets/products/shipping-container-rental-yard.webp";
import constructionSitePortableOffice from "@/assets/products/construction-site-portable-office-site-office.webp";
import siteOfficeContainerManufacturersExterior from "@/assets/products/site-office-container-manufacturers-exterior.webp";
import labourHutmentsMain from "@/assets/products/labour-hutments-staff-accommodation-1.webp";
import prefabPortaCabinCrane from "@/assets/products/prefab-porta-cabin-exterior.webp";
import laborHutmentsAerial from "@/assets/products/labor-hutments-aerial.webp";
import cabinPortableSite from "@/assets/products/cabin-portable-site.webp";
import securityCabinResidential from "@/assets/products/security-cabin-residential-gate.webp";
import cabinsInOfficeModern from "@/assets/products/cabins-in-office-modern.webp";
import steelPortableOfficeContainerCrane from "@/assets/products/steel-portable-office-container-crane.webp";
import shippingContainerKormangalaCrane from "@/assets/products/shipping-container-kormangala-crane.webp";
import shippingContainerKrishnagiriStorage from "@/assets/products/shipping-container-krishnagiri-storage.webp";
import shippingContainerSipcotYard from "@/assets/products/shipping-container-sipcot-yard.webp";
import shippingContainerChennaiPort from "@/assets/products/shipping-container-chennai-port.webp";
import shippingContainerNarsapuraYard from "@/assets/products/shipping-container-narsapura-yard.webp";
import shippingContainerPeenyaIndustrial from "@/assets/products/shipping-container-peenya-industrial.webp";
import cargoStorageContainersMain from "@/assets/products/cargo-storage-containers-main.webp";
import cargoContainersMain from "@/assets/products/cargo-containers-main.webp";
import cargoStorageContainersPinkMain from "@/assets/products/cargo-storage-containers-pink-main.webp";
import cargoShippingContainerMain from "@/assets/products/cargo-shipping-container-main.webp";
import workmenAccommodationMain from "@/assets/products/workmen-accommodation-main.webp";
import labourColonyAerial from "@/assets/products/labour-colony-aerial.png";

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
  "1": executivePortableCabin20ft,
  "POC-PC-20EX": executivePortableCabin20ft,
  "executive-portable-cabin-20ft": executivePortableCabin20ft,
  "2": standardSiteOfficeContainer,
  "POC-SOC-20ST": standardSiteOfficeContainer,
  "standard-site-office-container": standardSiteOfficeContainer,
  "8": luxuryPrefabVillaG1,
  "POC-PH-3LUX": luxuryPrefabVillaG1,
  "luxury-prefab-villa": luxuryPrefabVillaG1,
  "9": "/images/products/porta-cabin-front.webp",
  "POC-PC-PORTA": "/images/products/porta-cabin-front.webp",
  "porta-cabin": "/images/products/porta-cabin-front.webp",
  "7": portableCabin40ftBunkhouse,
  "POC-PC-40BH": portableCabin40ftBunkhouse,
  "portable-cabin-40ft-bunkhouse": portableCabin40ftBunkhouse,
  "4": familyPrefabHome2bhk,
  "POC-PH-2BHK": familyPrefabHome2bhk,
  "family-prefab-home-2bhk": familyPrefabHome2bhk,
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
  "18": shippingContainerRentalMain,
  "POC-SC-RENT": shippingContainerRentalMain,
  "shipping-container-rental": shippingContainerRentalMain,
  "15": constructionSitePortableOffice,
  "POC-SOC-CSPO": constructionSitePortableOffice,
  "construction-site-portable-office": constructionSitePortableOffice,
  "19": siteOfficeContainerManufacturersExterior,
  "POC-SOC-MFR": siteOfficeContainerManufacturersExterior,
  "site-office-container-manufacturers": siteOfficeContainerManufacturersExterior,
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
  "26": securityCabinResidential,
  "POC-SC-SECAB": securityCabinResidential,
  "security-cabin": securityCabinResidential,
  "27": cabinsInOfficeModern,
  "POC-CO-CABIN": cabinsInOfficeModern,
  "cabins-in-office": cabinsInOfficeModern,
  "28": steelPortableOfficeContainerCrane,
  "POC-SOC-SPOC": steelPortableOfficeContainerCrane,
  "steel-portable-office-container": steelPortableOfficeContainerCrane,
  "29": shippingContainerKormangalaCrane,
  "POC-SC-KRMG": shippingContainerKormangalaCrane,
  "shipping-container-in-kormangala": shippingContainerKormangalaCrane,
  "30": shippingContainerKrishnagiriStorage,
  "POC-SC-KRSH": shippingContainerKrishnagiriStorage,
  "shipping-container-in-krishnagiri": shippingContainerKrishnagiriStorage,
  "31": shippingContainerSipcotYard,
  "POC-SC-SIPCOT": shippingContainerSipcotYard,
  "shipping-container-in-sipcot": shippingContainerSipcotYard,
  "32": shippingContainerChennaiPort,
  "POC-SC-CHN": shippingContainerChennaiPort,
  "shipping-container-in-chennai": shippingContainerChennaiPort,
  "33": shippingContainerNarsapuraYard,
  "POC-SC-NRSP": shippingContainerNarsapuraYard,
  "shipping-container-in-narsapura-industrial": shippingContainerNarsapuraYard,
  "34": shippingContainerPeenyaIndustrial,
  "POC-SC-PNYA": shippingContainerPeenyaIndustrial,
  "shipping-container-in-peenya-industrial": shippingContainerPeenyaIndustrial,
  "35": cargoStorageContainersMain,
  "POC-CSC-GUIDE": cargoStorageContainersMain,
  "cargo-storage-containers": cargoStorageContainersMain,
  "36": cargoContainersMain,
  "POC-CC-GUIDE": cargoContainersMain,
  "cargo-containers": cargoContainersMain,
  "37": cargoStorageContainersPinkMain,
  "POC-CSC-PINK": cargoStorageContainersPinkMain,
  "cargo-storage-containers-pink": cargoStorageContainersPinkMain,
  "38": cargoShippingContainerMain,
  "POC-SC-CARGO": cargoShippingContainerMain,
  "cargo-shipping-container": cargoShippingContainerMain,
  "39": workmenAccommodationMain,
  "POC-WA-G1": workmenAccommodationMain,
  "workmen-accommodation": workmenAccommodationMain,
  "40": labourColonyAerial,
  "POC-LC-PREFAB": labourColonyAerial,
  "labour-colony": labourColonyAerial,
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
  existingImage?: string,
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
