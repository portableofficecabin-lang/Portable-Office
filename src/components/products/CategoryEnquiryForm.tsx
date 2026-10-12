"use client";

/**
 * Custom-requirement enquiry for a product CATEGORY page.
 *
 * ── WHERE IT IS (AND IS NOT) MOUNTED ────────────────────────────────────────────────────────────
 * Category landing sections only. It is deliberately NOT on product pages: by owner decision a
 * quote CTA beside a fixed-price Buy path dilutes it and reads as price ambiguity to Merchant
 * Center (see BuyNowCTA.tsx / ProductActions.tsx). Here it is framed for what the listed models do
 * not cover — another size, a different layout, several units — which company.ts already defines
 * as quote-only work.
 *
 * ── HOW IT SUBMITS ──────────────────────────────────────────────────────────────────────────────
 * Exactly the path the homepage Cabin Calculator uses: a typed insert into `public.enquiries` with
 * the anon client (RLS allows anonymous INSERT only — never chain .select()), then a
 * fire-and-forget call to the existing `send-enquiry-notification` edge function. The table has no
 * columns for size, quantity or PIN code, so — as every other form does — those go into `message`,
 * which is NOT NULL and is what the admin Enquiries, CRM and Sales screens display. `lead_source`
 * is distinct so these leads can be told apart in the CRM.
 *
 * The Supabase client is imported on submit, not at module load, so it adds nothing to the
 * category page's first-load JavaScript. Validation is a few lines of plain code rather than zod,
 * and labels are native <label>s: together those two libraries added ~17 kB of first-load JS to
 * every category page for ten fields.
 *
 * Spam: a hidden honeypot field and a minimum fill time. A submission that trips either is
 * acknowledged on screen and silently dropped — there is no server-side rate limit on this table
 * (pre-existing; reported separately).
 */

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY } from "@/lib/company";
import type { TablesInsert } from "@/integrations/supabase/types";

const CUSTOM = "custom";
const MIN_FILL_MS = 2500;

const FIELD_NAMES = ["name", "phone", "email", "model", "size", "quantity", "location", "pincode", "specs", "message"] as const;
type FieldName = (typeof FIELD_NAMES)[number];
/** Raw form state — every control holds a string; validate() checks and normalises it on submit. */
type Fields = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field rules, in form order. Returns the trimmed values and one message per invalid field. */
function validate(raw: Fields): { data: Fields & { qty: number }; errors: Errors } {
  const data = Object.fromEntries(FIELD_NAMES.map((k) => [k, raw[k].trim()])) as Fields;
  const errors: Errors = {};
  const digits = data.phone.replace(/\D/g, "");
  const qty = Number(data.quantity);
  if (data.name.length < 2) errors.name = "Please enter your name.";
  if (digits.length < 10 || digits.length > 13) errors.phone = "Please enter a valid mobile number.";
  if (!EMAIL.test(data.email)) errors.email = "Please enter a valid email address.";
  if (data.size.length > 80) errors.size = "Please keep the size under 80 characters.";
  if (!Number.isInteger(qty) || qty < 1 || qty > 500) errors.quantity = "Quantity must be a whole number from 1 to 500.";
  if (data.location.length < 2) errors.location = "Please enter the delivery town or city.";
  if (data.pincode !== "" && !/^\d{6}$/.test(data.pincode)) errors.pincode = "PIN code must be 6 digits.";
  if (data.specs.length > 2000) errors.specs = "Please keep this under 2,000 characters.";
  if (data.message.length > 2000) errors.message = "Please keep this under 2,000 characters.";
  return { data: { ...data, qty }, errors };
}

/** Native label with the same look as the design system's Label. */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-foreground">
      {children}
    </label>
  );
}

const EMPTY: Fields = {
  name: "",
  phone: "",
  email: "",
  model: CUSTOM,
  size: "",
  quantity: "1",
  location: "",
  pincode: "",
  specs: "",
  message: "",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

export function CategoryEnquiryForm({
  categorySlug,
  categoryName,
  noun,
  models,
}: {
  categorySlug: string;
  categoryName: string;
  /** e.g. "security cabin" — used in the heading and the custom option. */
  noun: string;
  models: { id: string; name: string }[];
}) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef<number>(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // A freshly inserted status region is not announced reliably by every screen reader, so the
  // confirmation also takes focus.
  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const set = (name: FieldName) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const fieldProps = (name: FieldName) => ({
    id: fid(name),
    name,
    value: values[name],
    onChange: set(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? fid(`${name}-error`) : undefined,
  });

  const errorText = (name: FieldName) =>
    errors[name] ? (
      <p id={fid(`${name}-error`)} className="mt-1 text-sm text-destructive">
        {errors[name]}
      </p>
    ) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { data: d, errors: next } = validate(values);
    if (Object.keys(next).length > 0) {
      setErrors(next);
      const first = FIELD_NAMES.find((k) => next[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fid(first))}`)?.focus();
      return;
    }

    // Bot heuristics: acknowledge, never store.
    if (honeypot || Date.now() - startedAt.current < MIN_FILL_MS) {
      setStatus("sent");
      return;
    }

    const model = models.find((m) => m.id === d.model);
    const modelLabel = model ? model.name : `Custom ${noun} (size or layout not listed)`;
    const page = typeof window !== "undefined" ? window.location.pathname : `/products/category/${categorySlug}`;
    const message = [
      `Category: ${categoryName}`,
      `Model: ${modelLabel}`,
      `Size required: ${d.size || "—"}`,
      `Quantity: ${d.qty}`,
      `Delivery location: ${d.location}`,
      `PIN code: ${d.pincode || "—"}`,
      "",
      "Additional specifications:",
      d.specs || "—",
      "",
      "Message:",
      d.message || "—",
      "",
      `Submitted from: ${page}`,
    ].join("\n");

    const enquiry: TablesInsert<"enquiries"> = {
      name: d.name,
      email: d.email,
      phone: d.phone,
      company: null,
      subject: `Category enquiry — ${categoryName}: ${modelLabel} × ${d.qty}`,
      message,
      enquiry_type: "quote",
      product_id: model?.id ?? null,
      product_name: model ? model.name : `${categoryName} — custom requirement`,
      lead_source: "Category Page Enquiry",
    };

    setStatus("sending");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("enquiries").insert(enquiry);
      if (error) throw error;
      supabase.functions.invoke("send-enquiry-notification", { body: enquiry }).catch(() => {});
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  }

  const heading = `Need a different ${noun}, or several units?`;

  return (
    <section
      id="category-enquiry"
      aria-labelledby={fid("heading")}
      className="scroll-mt-28 rounded-2xl border border-border bg-muted/40 p-5 sm:p-8"
    >
      <h2 id={fid("heading")} className="font-display text-2xl font-bold text-foreground">
        {heading}
      </h2>
      <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">
        {`The models above are sold online at their listed prices. For another size, a different layout or a multi-unit order, send your requirement and our sales team will reply ${COMPANY.responseTime.toLowerCase()} to confirm the details before preparing a written quotation.`}
      </p>

      {status === "sent" ? (
        <div
          ref={doneRef}
          role="status"
          tabIndex={-1}
          className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Thank you — your requirement has been sent.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {`Our sales team replies ${COMPANY.responseTime.toLowerCase()}. For anything urgent, call `}
              <a href={`tel:${COMPANY.phones[0].e164}`} className="font-medium text-accent hover:underline">
                {COMPANY.phones[0].display}
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* Honeypot — invisible to people and assistive tech, filled by naive bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={fid("website")}>Website</label>
            <input
              id={fid("website")}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor={fid("name")}>Name *</FieldLabel>
            <Input {...fieldProps("name")} autoComplete="name" required className="mt-1.5" />
            {errorText("name")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("phone")}>Mobile number *</FieldLabel>
            <Input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" required className="mt-1.5" />
            {errorText("phone")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("email")}>Email address *</FieldLabel>
            <Input {...fieldProps("email")} type="email" autoComplete="email" required className="mt-1.5" />
            {errorText("email")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("model")}>Product</FieldLabel>
            <select {...fieldProps("model")} className={`${selectClass} mt-1.5`}>
              <option value={CUSTOM}>{`Custom ${noun} (size or layout not listed)`}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={fid("size")}>Size required</FieldLabel>
            <Input {...fieldProps("size")} placeholder="e.g. 20 ft × 10 ft" className="mt-1.5" />
            {errorText("size")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("quantity")}>Quantity *</FieldLabel>
            <Input {...fieldProps("quantity")} type="number" min={1} max={500} inputMode="numeric" required className="mt-1.5" />
            {errorText("quantity")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("location")}>Delivery town or city *</FieldLabel>
            <Input {...fieldProps("location")} autoComplete="address-level2" required className="mt-1.5" />
            {errorText("location")}
          </div>
          <div>
            <FieldLabel htmlFor={fid("pincode")}>Delivery PIN code</FieldLabel>
            <Input
              {...fieldProps("pincode")}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              className="mt-1.5"
            />
            {errorText("pincode")}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor={fid("specs")}>Additional specifications</FieldLabel>
            <Textarea
              {...fieldProps("specs")}
              rows={3}
              placeholder="Insulation, partitions, toilet, AC points, finishes…"
              className="mt-1.5"
            />
            {errorText("specs")}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor={fid("message")}>Message</FieldLabel>
            <Textarea {...fieldProps("message")} rows={3} className="mt-1.5" />
            {errorText("message")}
          </div>

          {status === "failed" && (
            <p role="alert" className="sm:col-span-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {"Your enquiry could not be sent. Please try again, or call "}
              <a href={`tel:${COMPANY.phones[0].e164}`} className="font-semibold underline">
                {COMPANY.phones[0].display}
              </a>
              .
            </p>
          )}

          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">* Required. We use these details only to reply to this enquiry.</p>
            <Button type="submit" variant="accent" size="lg" disabled={status === "sending"} className="w-full sm:w-auto">
              {status === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Send requirement"
              )}
            </Button>
          </div>
          <p className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>
              {"Prefer to talk? Call "}
              <a href={`tel:${COMPANY.phones[0].e164}`} className="font-medium text-accent hover:underline">
                {COMPANY.phones[0].display}
              </a>
              {" or message us on "}
              <a
                href={`${COMPANY.whatsapp.url}?text=${encodeURIComponent(`Hi, I have a ${noun} requirement.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline"
              >
                WhatsApp
              </a>
              .
            </span>
          </p>
        </form>
      )}
    </section>
  );
}
