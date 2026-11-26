import { describe, it, expect } from "vitest";
import { COMPANY } from "@/lib/company";
import {
  LOCAL_BUSINESS_ID,
  ORGANIZATION_ID,
  generatePromotionStructuredData,
  localBusinessStructuredData,
  organizationStructuredData,
  serviceAreaStructuredData,
} from "./structured-data";

/**
 * Name, address and phone must be IDENTICAL wherever the site states them (footer, Contact page,
 * policy pages, JSON-LD) and must come from src/lib/company.ts. These lock the JSON-LD side: one
 * Organization and one LocalBusiness, each with a stable @id, every value read from COMPANY, and
 * every city/promotion Service naming that same LocalBusiness as its provider.
 */
const factory = COMPANY.addresses.tamilNaduFactory;
const expectedAddress = {
  "@type": "PostalAddress",
  streetAddress: factory.street,
  addressLocality: factory.locality,
  addressRegion: factory.region,
  postalCode: factory.postalCode,
  addressCountry: "IN",
};
const companyPhones = COMPANY.phones.map((p) => p.e164);
const provider = generatePromotionStructuredData({
  h1: "Portable Cabin in Kolar",
  metaDescription: "x",
  canonicalUrl: "https://portableofficecabin.com/cities-we-serve/portable-cabin-kolar",
  imageUrl: "/images/x.webp",
  location: "Kolar",
  geoPlacename: "Kolar, Karnataka, India",
  geoPosition: "13.1367;78.1292",
  keyword: "Portable Cabin",
}).provider;

describe("business JSON-LD — one entity, values from company.ts", () => {
  it("Organization and LocalBusiness carry stable ids and are linked", () => {
    expect(organizationStructuredData["@id"]).toBe("https://portableofficecabin.com/#organization");
    expect(localBusinessStructuredData["@id"]).toBe("https://portableofficecabin.com/#localbusiness");
    expect(localBusinessStructuredData.parentOrganization).toEqual({ "@id": ORGANIZATION_ID });
    expect(serviceAreaStructuredData.provider["@id"]).toBe(ORGANIZATION_ID);
    expect(provider["@id"]).toBe(LOCAL_BUSINESS_ID);
  });

  it("name, address, phone, e-mail, GSTIN, Udyam and profiles match company.ts", () => {
    for (const node of [organizationStructuredData, localBusinessStructuredData]) {
      expect(node.name).toBe(COMPANY.legalName);
      expect(node.address).toEqual(expectedAddress);
      expect(node.telephone).toBe(COMPANY.phones[0].e164);
      expect(node.email).toBe(COMPANY.email.sales);
      expect(node.taxID).toBe(COMPANY.gstin);
      expect(node.identifier.value).toBe(COMPANY.udyam);
      expect(node.sameAs).toEqual([COMPANY.social.facebook, COMPANY.social.linkedin, COMPANY.social.instagram]);
    }
    expect(provider.name).toBe(COMPANY.legalName);
    expect(provider.address).toEqual(expectedAddress);
    expect(provider.telephone).toBe(COMPANY.phones[0].e164);
    expect(provider.email).toBe(COMPANY.email.sales);
  });

  it("opening hours are company.ts's", () => {
    const [week, sun] = localBusinessStructuredData.openingHoursSpecification;
    expect([week.opens, week.closes]).toEqual([COMPANY.businessHours.weekdays.opens, COMPANY.businessHours.weekdays.closes]);
    expect([sun.opens, sun.closes]).toEqual([COMPANY.businessHours.sunday.opens, COMPANY.businessHours.sunday.closes]);
  });

  it("every phone number in the business nodes is one of company.ts's numbers, in E.164", () => {
    const json = JSON.stringify([organizationStructuredData, localBusinessStructuredData, serviceAreaStructuredData, provider]);
    const phones = [...json.matchAll(/"telephone":"([^"]+)"/g)].map((m) => m[1]);
    expect(phones.length).toBeGreaterThan(0);
    for (const p of phones) expect(companyPhones).toContain(p);
  });

  it("states no unsupported superlatives or counts", () => {
    const json = JSON.stringify([organizationStructuredData, localBusinessStructuredData, serviceAreaStructuredData]);
    expect(/leading|500\+|best\b|no\.? ?1\b/i.test(json)).toBe(false);
  });
});
