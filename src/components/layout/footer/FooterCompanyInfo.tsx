import Link from "next/link";
import { BadgeCheck, Facebook, Instagram, Linkedin, type LucideIcon } from "lucide-react";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { companyBlurb, footerTrustItems, socialLinks } from "@/lib/site-navigation";
import logo from "@/assets/logo.webp";

const socialIcons: Record<string, LucideIcon> = {
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
};

/**
 * Footer brand block: logo, what the company actually does, trust markers, socials.
 *
 * The blurb comes from src/lib/site-navigation.ts, which keeps it in step with the
 * Organization/LocalBusiness JSON-LD descriptions — the visible footer and the
 * structured data should not tell two different stories about the same business.
 *
 * The trust markers are claims the site already substantiates elsewhere (ISO
 * certificate number, GSTIN and Udyam number are all in the verified-facts file).
 * No years-in-business or project-count figures appear here: those strings are
 * inconsistent across the site and are not owner-verified.
 *
 * Social links keep target/rel and carry a real accessible name, since the icons are
 * decorative.
 */
export function FooterCompanyInfo() {
  return (
    <div className="min-w-0">
      <Link
        href="/"
        className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
      >
        {/* Explicit intrinsic size (the asset is a 400x400 square) so the lazy load
            cannot shift the footer as it arrives. */}
        <img
          src={resolveImageUrl(logo)}
          alt="Portable Office Cabin"
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="h-12 w-12 shrink-0 rounded-xl border border-accent/30 bg-white object-contain p-1.5"
        />
        <span className="font-display text-lg font-extrabold leading-tight tracking-tight text-white">
          Portable Office <span className="text-accent">Cabin</span>
        </span>
      </Link>

      <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">{companyBlurb}</p>

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {footerTrustItems.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-white/80">
            <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
          Follow Us
        </h3>
        <ul className="mt-3 flex items-center gap-3">
          {socialLinks.map((social) => {
            const Icon = socialIcons[social.icon];
            return (
              <li key={social.name}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Portable Office Cabin on ${social.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors duration-200 hover:border-accent/50 hover:bg-accent/15 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep motion-reduce:transition-none"
                >
                  {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
