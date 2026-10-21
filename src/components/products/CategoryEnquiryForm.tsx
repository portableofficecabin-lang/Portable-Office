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
 * POST /api/enquiries (app/api/enquiries/route.ts). The browser never talks to Supabase. The route
 * re-runs the SAME rules as this form (src/lib/enquiries/categoryEnquiry.ts), rate-limits per IP,
 * email, phone and site-wide, drops honeypot / too-fast submissions, resolves the product name
 * from the catalogue, inserts under Row Level Security and sends the notification with
 * markup-inert fields. The table has no columns for size, quantity or PIN code, so — as every other
 * form does — those go into `message`, which is what the admin Enquiries, CRM and Sales screens
 * show; `lead_source` is "Category Page Enquiry".
 *
 * Plain validation (no zod) and native <label>s keep the island small: those two libraries added
 * ~17 kB of first-load JS to every category page for ten fields.
 */

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY } from "@/lib/company";
import {
  CUSTOM_MODEL as CUSTOM,
  ENQUIRY_FIELDS as FIELD_NAMES,
  validateCategoryEnquiry,
  type EnquiryErrors as Errors,
  type EnquiryField as FieldName,
  type EnquiryFields as Fields,
} from "@/lib/enquiries/categoryEnquiry";

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
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed" | "limited">("idle");
  const [serverMessage, setServerMessage] = useState("");
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

  const focusFirst = (next: Errors) => {
    const first = FIELD_NAMES.find((k) => next[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fid(first))}`)?.focus();
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Instant feedback with the same rules the server enforces.
    const { errors: next } = validateCategoryEnquiry(values);
    if (Object.keys(next).length > 0) {
      setErrors(next);
      focusFirst(next);
      return;
    }

    setStatus("sending");
    setServerMessage("");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          fields: values,
          website: honeypot,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: Errors };
      if (res.ok) {
        setStatus("sent");
      } else if (res.status === 400 && body.errors && Object.keys(body.errors).length > 0) {
        setErrors(body.errors);
        setStatus("idle");
        focusFirst(body.errors);
      } else if (res.status === 429) {
        setServerMessage(body.error || "Too many enquiries. Please wait a few minutes.");
        setStatus("limited");
      } else {
        setServerMessage(body.error || "");
        setStatus("failed");
      }
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
        {`The models above are sold online at their listed prices. For another size, a different layout or a multi-unit order, send your requirement and our sales team will reply to confirm the details before preparing a written quotation.`}
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
              {`For anything urgent, call `}
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

          {status === "limited" && (
            <p role="alert" className="sm:col-span-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground">
              {`${serverMessage} `}
              <a href={`tel:${COMPANY.phones[0].e164}`} className="font-semibold text-accent underline">
                {COMPANY.phones[0].display}
              </a>
            </p>
          )}

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
