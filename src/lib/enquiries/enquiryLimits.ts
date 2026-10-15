/**
 * Column limits for public.enquiries — identical to the `enquiries_field_lengths_check` constraint in
 * supabase/migrations/20261012120000_enquiries_insert_hardening.sql.
 *
 * Every public form that inserts into the table (Contact, the product EnquiryModal, the homepage
 * cabin calculator) checks the FINAL row against these before submitting, so a form the browser
 * accepts can never be refused by the database once the migration is applied. The category form
 * (/api/enquiries) validates tighter limits of its own (ENQUIRY_LIMITS in categoryEnquiry.ts).
 *
 * src/lib/enquiries/enquiryLimits.test.ts reads the migration and fails if the two ever drift apart.
 */
export const ENQUIRY_DB_LIMITS = {
  name: { min: 1, max: 200 },
  email: { min: 3, max: 254 },
  phone: { min: 0, max: 40 },
  company: { min: 0, max: 200 },
  subject: { min: 0, max: 300 },
  message: { min: 1, max: 8000 },
  product_id: { min: 0, max: 100 },
  product_name: { min: 0, max: 300 },
} as const;

export type EnquiryLimitedField = keyof typeof ENQUIRY_DB_LIMITS;
export type EnquiryLengthRow = Partial<Record<EnquiryLimitedField, string | null>>;

const LABELS: Record<EnquiryLimitedField, string> = {
  name: "Name",
  email: "Email address",
  phone: "Phone number",
  company: "Company name",
  subject: "Subject",
  message: "Message",
  product_id: "Product reference",
  product_name: "Product name",
};

/**
 * The first length problem in a row that is about to be inserted, as a sentence the visitor can act
 * on, or null when the database will accept it. Null / absent optional fields are fine.
 */
export function enquiryLengthError(row: EnquiryLengthRow): string | null {
  for (const field of Object.keys(ENQUIRY_DB_LIMITS) as EnquiryLimitedField[]) {
    const { min, max } = ENQUIRY_DB_LIMITS[field];
    const value = row[field];
    const length = value == null ? 0 : value.length;
    if (value == null && min === 0) continue;
    if (length < min) return `Please enter your ${LABELS[field].toLowerCase()}.`;
    if (length > max) return `${LABELS[field]} is too long — please keep it under ${max.toLocaleString("en-IN")} characters.`;
  }
  return null;
}
