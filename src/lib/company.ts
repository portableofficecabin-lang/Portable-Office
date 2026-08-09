/**
 * SINGLE SOURCE OF TRUTH for Portable Office Cabin's business identity.
 *
 * Every surface that states who we are — the site footer, JSON-LD / schema.org
 * markup, contact pages, sales quotations, proforma invoices, PDF footers,
 * transactional emails — MUST import from here rather than hardcoding its own
 * copy. Hardcoded duplicates are how the site ends up contradicting itself
 * (e.g. a GSTIN printed on a customer quotation that did not match the GSTIN in
 * the footer, or business hours that claimed 24/7 support on one page and
 * Mon-Sat hours on another).
 *
 * RULES:
 * - Only VERIFIED facts belong in this file. If a fact is not confirmed by the
 *   business owner, it does not go here — and it does not go on the site.
 * - Change a fact HERE, once. Never patch it at the call site.
 *
 * NOTE: Portable Office Cabin sells in TWO ways. Standard, fixed-configuration
 * products are bought and paid for online (Razorpay checkout) at a fixed,
 * GST-INCLUSIVE price — see src/data/productCommerce.ts (isPurchasable) and
 * app/api/razorpay. Customised / bespoke / project builds are quote-only: their
 * displayed figures are indicative "starting from" prices before GST, transport
 * beyond 50 km, and installation, with the binding price set in a written quotation.
 */

/** A structured postal address, shaped to map directly onto schema.org PostalAddress. */
export interface CompanyAddress {
  /** Human-readable label for the location. */
  label: string;
  /** schema.org streetAddress */
  street: string;
  /** schema.org addressLocality */
  locality: string;
  /** schema.org addressRegion */
  region: string;
  /** schema.org postalCode */
  postalCode: string;
  /** schema.org addressCountry */
  country: string;
  /**
   * Phone numbers that reach THIS location specifically, when they differ from the
   * company-wide numbers in COMPANY.phones. Optional: most locations are reached on the
   * main numbers. `e164` is for tel: links, `display` is what a human reads.
   */
  phones?: readonly { e164: string; display: string }[];
}

/** Formats a CompanyAddress as a single-line string for footers, PDFs and emails. */
export function formatAddress(address: CompanyAddress): string {
  return `${address.street}, ${address.locality}, ${address.region} ${address.postalCode}, ${address.country}`;
}

export const COMPANY = Object.freeze({
  /** Legal and trading name — they are the same. */
  legalName: "Portable Office Cabin",
  tradingName: "Portable Office Cabin",
  businessType: "Proprietorship",
  country: "India",

  domain: "portableofficecabin.com",
  url: "https://portableofficecabin.com",

  email: {
    /** Customer-service address. Use this everywhere customers are asked to write in. */
    sales: "sales@portableofficecabin.com",
    /** Secondary / legacy address. */
    secondary: "portableofficecabin@gmail.com",
  },

  phones: [
    { e164: "+919731897976", display: "+91 97318 97976" },
    { e164: "+919019910931", display: "+91 90199 10931" },
  ],

  /** WhatsApp is genuinely monitored on this number. */
  whatsapp: {
    e164: "+919731897976",
    display: "+91 97318 97976",
    url: "https://wa.me/919731897976",
  },

  addresses: {
    tamilNaduFactory: {
      label: "Tamil Nadu Factory",
      street: "Survey No. 222, Door No. 2/149-6, Road 1C",
      locality: "Post Addakurukki, Kamandoddi",
      region: "Tamil Nadu",
      postalCode: "635117",
      country: "India",
    } as CompanyAddress,
    /**
     * @deprecated RETIRED FROM PUBLIC DISPLAY — 2026-08-09, on the owner's instruction.
     *
     * The Hoskote works address is no longer shown as a company location: the Karnataka
     * presence is now stated as `bangaloreOffice` (Electronic City) below. The record is
     * KEPT, not deleted, because it is still a verified historical fact and this file is
     * the only place it is written down — deleting it would lose it outright.
     *
     * Do NOT add this back to a customer-facing surface (footer, contact page, schema,
     * quotations, PDFs) without the owner confirming the location is current again.
     */
    karnatakaFactory: {
      label: "Karnataka Factory (Bangalore)",
      street: "Sy. No. 51",
      locality: "Mylapur Post, Mugabala, Hoskote",
      region: "Karnataka",
      postalCode: "562114",
      country: "India",
    } as CompanyAddress,
    /**
     * Current Karnataka location — replaced the Hoskote works on all public surfaces.
     * Reached on its own two numbers, NOT the company-wide numbers above.
     */
    bangaloreOffice: {
      label: "Bangalore Office (Electronic City)",
      street: "Flat No. 280, Building No. 6, 7",
      locality: "Electronic City Phase 1, Bommasadra, Chandapura, Jigani, Bengaluru",
      region: "Karnataka",
      postalCode: "560105",
      country: "India",
      phones: [
        { e164: "+918310372601", display: "+91 83103 72601" },
        { e164: "+918073102817", display: "+91 80731 02817" },
      ],
    } as CompanyAddress,
  },

  /** Statutory registrations. The GSTIN below is the ONLY correct one — do not print any other. */
  gstin: "33FVKPK6238Q1ZT",
  udyam: "UDYAM-TN-11-0068545",
  isoCertificate: "QT-99968/0726",

  /**
   * Real business hours. There is NO 24/7 support — never claim it.
   * Times are 24-hour, IST.
   */
  businessHours: {
    weekdays: {
      days: "Monday - Saturday",
      opens: "07:00",
      closes: "22:00",
      display: "Mon - Sat: 7:00 AM - 10:00 PM",
    },
    sunday: {
      days: "Sunday",
      opens: "10:00",
      closes: "19:00",
      display: "Sunday: 10:00 AM - 7:00 PM",
    },
  },

  /** How quickly enquiries are answered. */
  responseTime: "Within 24 hours",

  /** Verified, live social profiles. There is NO Twitter/X profile and NO IndiaMart page — do not link them. */
  social: {
    facebook: "https://www.facebook.com/portableofficecabin",
    linkedin: "https://www.linkedin.com/in/portable-office-cabin-9b939a168",
    instagram: "https://www.instagram.com/portableofficecabin",
  },
} as const);

export type Company = typeof COMPANY;
