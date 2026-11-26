import { Fragment } from "react";
import { Mail, Phone } from "lucide-react";
import { COMPANY, formatAddress } from "@/lib/company";

/**
 * "Contact us" block of the policy pages (Privacy Policy, Terms & Conditions), rendered from
 * src/lib/company.ts so it always states the same name, factory address, phones and e-mails as the
 * footer, the Contact page and the Organization / LocalBusiness JSON-LD. Before 2026-11-25 each page
 * typed its own copy, and both had dropped "Post Addakurukki" from the factory address.
 */
export function CompanyContactBlock() {
  const emails = [COMPANY.email.sales, COMPANY.email.secondary];
  return (
    <div className="mt-4 space-y-3">
      <p className="font-semibold text-foreground">{COMPANY.legalName}</p>
      <p>{formatAddress(COMPANY.addresses.tamilNaduFactory)}</p>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-accent" />
        {COMPANY.phones.map((p, i) => (
          <Fragment key={p.e164}>
            {i > 0 && <span className="text-border">|</span>}
            <a href={`tel:${p.e164}`} className="hover:text-accent">
              {p.display}
            </a>
          </Fragment>
        ))}
      </div>
      {emails.map((e) => (
        <div key={e} className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" />
          <a href={`mailto:${e}`} className="hover:text-accent">
            {e}
          </a>
        </div>
      ))}
    </div>
  );
}
