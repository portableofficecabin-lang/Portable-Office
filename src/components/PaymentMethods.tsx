import { CreditCard, Landmark, Smartphone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The payment methods this site genuinely accepts at checkout — i.e. the methods the
 * Razorpay gateway is configured to take. Nothing here is aspirational: if a method is
 * listed, a customer can actually pay with it.
 *
 * DELIBERATELY NO BRAND LOGOS. We do not hold the Visa / Mastercard / RuPay / UPI logo
 * assets and we do not have a licence to use them, so this component draws the methods
 * with lucide icons + the method NAME as text. A broken or unlicensed logo image is worse
 * than no logo at all.
 *
 * OWNER: if you are ever supplied with real, licensed logo files (e.g. from Razorpay's
 * brand kit), swap them in here and nowhere else — put the assets in src/assets/ and
 * replace the `icon` field of each entry in METHODS below with an <img>. Every surface
 * that shows payment marks renders this one component, so one edit updates them all.
 */

const METHODS = [
  {
    name: "UPI",
    icon: Smartphone,
    /** Shown in the "checkout" variant only. */
    detail: "GPay, PhonePe, Paytm, BHIM and any UPI app",
  },
  {
    name: "Credit & Debit Cards",
    icon: CreditCard,
    detail: "All major Indian and international cards",
  },
  {
    name: "Net Banking",
    icon: Landmark,
    detail: "All major Indian banks",
  },
] as const;

export interface PaymentMethodsProps {
  /**
   * "footer"   — compact single row of chips, sized for the dark footer bar.
   * "checkout" — fuller block with a heading and a one-line description per method.
   */
  variant?: "footer" | "checkout";
  className?: string;
}

export function PaymentMethods({ variant = "footer", className }: PaymentMethodsProps) {
  if (variant === "checkout") {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground leading-tight">
              Secure payment methods
            </h3>
            <p className="text-sm text-muted-foreground">Secured by Razorpay</p>
          </div>
        </div>

        <ul className="space-y-3">
          {METHODS.map((method) => (
            <li key={method.name} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center shrink-0">
                <method.icon className="h-4 w-4 text-accent" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm">{method.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{method.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground leading-relaxed mt-4">
          Card and bank details are entered on Razorpay's secure gateway and are never stored on
          this website. All prices include 18% GST.
        </p>
      </div>
    );
  }

  // "footer" — compact, sits on the deep-navy footer background.
  //
  // COLOUR NOTE: this used to be `text-primary-foreground`. In this theme `--primary`
  // is amber, so `--primary-foreground` is DARK NAVY — it was legible only because the
  // old footer was an amber slab. Now that the footer is navy, that same token would
  // render near-invisible. These are explicit white tints instead, so this strip stays
  // readable regardless of which dark surface it is dropped onto.
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span className="text-sm font-semibold text-white/80 mr-1">We accept</span>

      {METHODS.map((method) => (
        <span
          key={method.name}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-sm font-semibold text-white"
        >
          <method.icon className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          {method.name}
        </span>
      ))}

      <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
        <ShieldCheck className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
        Secured by Razorpay
      </span>
    </div>
  );
}

export default PaymentMethods;
