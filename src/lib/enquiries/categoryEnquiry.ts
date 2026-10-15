/**
 * Category-page enquiry: the ONE set of field rules, shared by the browser form
 * (CategoryEnquiryForm) and the server route (app/api/enquiries/route.ts).
 *
 * The browser runs these rules for instant feedback; the server runs the SAME rules again and is
 * the only authority — nothing the browser says is trusted. Plain TypeScript, no dependencies, so
 * it adds almost nothing to the category page's JavaScript.
 */

export const ENQUIRY_FIELDS = [
  "name",
  "phone",
  "email",
  "model",
  "size",
  "quantity",
  "location",
  "pincode",
  "specs",
  "message",
] as const;

export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];
/** Raw form state — every control holds a string. */
export type EnquiryFields = Record<EnquiryField, string>;
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

/** The "Custom size or layout" option of the model select. */
export const CUSTOM_MODEL = "custom";

/** Upper bounds, in characters. The server rejects anything longer instead of truncating it. */
export const ENQUIRY_LIMITS = {
  name: 120,
  email: 254,
  phone: 20,
  model: 64,
  size: 80,
  location: 120,
  specs: 2000,
  message: 2000,
  quantityMax: 500,
} as const;

/** Whole request body cap for the API route (bytes). Ten fields plus a little envelope. */
export const ENQUIRY_MAX_BODY_BYTES = 16 * 1024;

/** A person cannot read the form and fill it in faster than this. */
export const ENQUIRY_MIN_FILL_MS = 2500;

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
/** C0 control characters other than tab and line feed, plus DEL. */
const isControlChar = (code: number) => (code < 32 && code !== 9 && code !== 10) || code === 127;

/** Trim, normalise line endings and strip control characters. Never changes visible text. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value.replace(/\r\n?/g, "\n")) if (!isControlChar(ch.charCodeAt(0))) out += ch;
  return out.trim();
}

/**
 * Validate and normalise the form. Returns cleaned strings, the parsed quantity, the phone in
 * digits-and-plus form, and one message per invalid field. An empty `errors` means valid.
 */
export function validateCategoryEnquiry(raw: Partial<Record<EnquiryField, unknown>>): {
  data: EnquiryFields & { qty: number };
  errors: EnquiryErrors;
} {
  const data = Object.fromEntries(ENQUIRY_FIELDS.map((k) => [k, cleanText(raw[k])])) as EnquiryFields;
  const errors: EnquiryErrors = {};

  // Single-line fields: collapse any newline a script might have smuggled in.
  for (const k of ["name", "phone", "email", "model", "size", "quantity", "location", "pincode"] as const) {
    data[k] = data[k].replace(/\s*\n\s*/g, " ");
  }
  data.phone = data.phone.replace(/[^\d+\s-]/g, "").replace(/\s+/g, " ").trim();
  data.email = data.email.toLowerCase();

  const digits = data.phone.replace(/\D/g, "");
  const qty = Number(data.quantity);

  if (data.name.length < 2) errors.name = "Please enter your name.";
  else if (data.name.length > ENQUIRY_LIMITS.name) errors.name = `Please keep your name under ${ENQUIRY_LIMITS.name} characters.`;
  if (digits.length < 10 || digits.length > 13 || data.phone.length > ENQUIRY_LIMITS.phone)
    errors.phone = "Please enter a valid mobile number.";
  if (!EMAIL.test(data.email) || data.email.length > ENQUIRY_LIMITS.email)
    errors.email = "Please enter a valid email address.";
  if (data.model.length > ENQUIRY_LIMITS.model || !/^[A-Za-z0-9_-]*$/.test(data.model)) data.model = CUSTOM_MODEL;
  if (data.size.length > ENQUIRY_LIMITS.size) errors.size = `Please keep the size under ${ENQUIRY_LIMITS.size} characters.`;
  if (!Number.isInteger(qty) || qty < 1 || qty > ENQUIRY_LIMITS.quantityMax)
    errors.quantity = `Quantity must be a whole number from 1 to ${ENQUIRY_LIMITS.quantityMax}.`;
  if (data.location.length < 2) errors.location = "Please enter the delivery town or city.";
  else if (data.location.length > ENQUIRY_LIMITS.location)
    errors.location = `Please keep the location under ${ENQUIRY_LIMITS.location} characters.`;
  if (data.pincode !== "" && !/^\d{6}$/.test(data.pincode)) errors.pincode = "PIN code must be 6 digits.";
  if (data.specs.length > ENQUIRY_LIMITS.specs) errors.specs = "Please keep this under 2,000 characters.";
  if (data.message.length > ENQUIRY_LIMITS.message) errors.message = "Please keep this under 2,000 characters.";

  return { data: { ...data, qty }, errors };
}

/**
 * Make a string inert inside an HTML email WITHOUT changing how it reads.
 *
 * The notification edge function interpolates fields straight into its HTML. It is hardened in
 * this repo, but until that version is deployed it does not escape, so anything sent to it must
 * already be inert. Angle brackets become the visually similar single guillemets, which can never
 * open a tag. The result is also safe AFTER the function starts escaping: there is nothing left
 * for it to double-escape except "&", which it renders back as "&".
 */
export function neutraliseMarkup(value: string): string {
  return value.replace(/</g, "‹").replace(/>/g, "›");
}
