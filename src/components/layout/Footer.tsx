import Link from "next/link";
import { Phone, Mail, MapPin, Facebook, Twitter, Linkedin, Instagram, BadgeCheck } from "lucide-react";
import logo from "@/assets/logo.webp";
import { resolveImageUrl } from "@/utils/resolveImageUrl";

const footerLinks = {
  products: [
    { name: "Portable Cabins", href: "/products/category/portable-cabins" },
    { name: "Site Office Containers", href: "/products/category/site-office-containers" },
    { name: "Container Offices", href: "/products/category/container-offices" },
    { name: "Prefab Homes", href: "/products/category/prefab-homes" },
    { name: "Portable Toilets", href: "/products/category/portable-toilet-cabins" },
    { name: "Security Cabins", href: "/products/category/security-cabins" },
  ],
  company: [
    { name: "About Us", href: "/about-us" },
    { name: "Gallery", href: "/gallery" },
    { name: "Careers", href: "/careers" },
    { name: "Blog", href: "/blog" },
    { name: "Marketplace", href: "/marketplace" },
  ],
  support: [
    { name: "Contact Us", href: "/contact" },
    { name: "FAQs", href: "/faq" },
    { name: "Warranty", href: "/warranty" },
    { name: "Shipping & Delivery", href: "/shipping" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms & Conditions", href: "/terms-and-conditions" },
    { name: "Refund Policy", href: "/refund-policy" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
      
      <div className="container-custom section-padding relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-4 mb-6 group">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-amber-light rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                <img src={resolveImageUrl(logo)} alt="Portable Office Cabin" loading="lazy" decoding="async" className="relative h-14 w-auto object-contain bg-white rounded-xl p-2 border-2 border-accent/50 shadow-xl" />
              </div>
              <span className="font-display font-extrabold text-lg sm:text-xl md:text-2xl tracking-tight text-primary-foreground">
                Portable Office <span className="text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Cabin</span>
              </span>
            </Link>
            <p className="text-primary-foreground mb-6 max-w-sm font-bold leading-relaxed">
              Leading manufacturer of portable cabins, container offices, and prefab homes. 
              Quality structures delivered to your site, ready for use.
            </p>
            <div className="space-y-4">
              <a href="tel:+919731897976" className="flex items-center gap-3 text-primary-foreground hover:text-black transition-colors font-bold group">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center group-hover:bg-black/20 transition-colors border border-accent/50">
                  <Phone className="h-5 w-5 text-accent group-hover:text-black transition-colors" />
                </div>
                <span className="font-bold relative">
                  +91 9731897976 / +91 9019910931
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                </span>
              </a>
              <a href="mailto:sales@portableofficecabin.com" className="flex items-center gap-3 text-primary-foreground hover:text-black transition-colors font-bold group">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center group-hover:bg-black/20 transition-colors border border-accent/50">
                  <Mail className="h-5 w-5 text-accent group-hover:text-black transition-colors" />
                </div>
                <span className="font-bold relative">
                  sales@portableofficecabin.com
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                </span>
              </a>
              <a href="mailto:portableofficecabin@gmail.com" className="flex items-center gap-3 text-primary-foreground hover:text-black transition-colors font-bold group">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center group-hover:bg-black/20 transition-colors border border-accent/50">
                  <Mail className="h-5 w-5 text-accent group-hover:text-black transition-colors" />
                </div>
                <span className="font-bold relative">
                  portableofficecabin@gmail.com
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                </span>
              </a>
              <div className="flex items-start gap-3 text-primary-foreground font-bold">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center shrink-0 border border-accent/50">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-3 leading-relaxed">
                  <div>
                    <div className="text-accent text-sm uppercase tracking-wide">Tamil Nadu Factory</div>
                    <span className="font-bold">Survey No. 222, Door No. 2/149-6, Road 1C, Post Addakurukki, Kamandoddi, Tamil Nadu 635117</span>
                  </div>
                  <div>
                    <div className="text-accent text-sm uppercase tracking-wide">Karnataka Factory (Bangalore)</div>
                    <span className="font-bold">Sy. No. 51, Mylapur Post, Mugabala, Hoskote, Karnataka 562114</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-display font-extrabold text-xl mb-5 text-black">Products</h4>
            <ul className="space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-primary-foreground hover:text-black transition-colors font-bold flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-4 h-0.5 bg-black transition-all duration-300 ease-out" />
                    <span className="relative">
                      {link.name}
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-extrabold text-xl mb-5 text-black">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-primary-foreground hover:text-black transition-colors font-bold flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-4 h-0.5 bg-black transition-all duration-300 ease-out" />
                    <span className="relative">
                      {link.name}
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          {/* Support */}
          <div>
            <h4 className="font-display font-extrabold text-xl mb-5 text-black">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-primary-foreground hover:text-black transition-colors font-bold flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-4 h-0.5 bg-black transition-all duration-300 ease-out" />
                    <span className="relative">
                      {link.name}
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300 ease-out" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-accent/30">
          {/* Registration / trust identifiers */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex items-center gap-2 text-primary-foreground font-bold">
              <BadgeCheck className="h-5 w-5 text-accent shrink-0" />
              ISO 9001:2015 Certified Company
              <span className="font-normal text-primary-foreground/80">· QMS · Cert. No.: QT-99968/0726</span>
            </span>
            <span className="inline-flex items-center gap-2 text-primary-foreground font-bold">
              <BadgeCheck className="h-5 w-5 text-accent shrink-0" />
              GST No: <span className="font-mono tracking-wide">33FVKPK6238Q1ZT</span>
            </span>
            <span className="inline-flex items-center gap-2 text-primary-foreground font-bold">
              <BadgeCheck className="h-5 w-5 text-accent shrink-0" />
              MSME / Udyam Reg. No: <span className="font-mono tracking-wide">UDYAM-TN-11-0068545</span>
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-primary-foreground font-bold text-lg">
            © {new Date().getFullYear()} Portable Office Cabin. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a href="https://www.facebook.com/share/1ZMvxG4MGy/" target="_blank" rel="noopener noreferrer" aria-label="Portable Office Cabin on Facebook" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent/30 hover:text-accent transition-all duration-300">
              <Facebook className="h-5 w-5" aria-hidden="true" />
            </a>
            <a href="#" aria-label="Portable Office Cabin on Twitter" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent/30 hover:text-accent transition-all duration-300">
              <Twitter className="h-5 w-5" aria-hidden="true" />
            </a>
            <a href="https://www.linkedin.com/in/portable-office-cabin-9b939a168?utm_source=share&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" aria-label="Portable Office Cabin on LinkedIn" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent/30 hover:text-accent transition-all duration-300">
              <Linkedin className="h-5 w-5" aria-hidden="true" />
            </a>
            <a href="https://www.instagram.com/portableofficecabin?igsh=d3Z5azNvM3o0ZDI3" target="_blank" rel="noopener noreferrer" aria-label="Portable Office Cabin on Instagram" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent/30 hover:text-accent transition-all duration-300">
              <Instagram className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
