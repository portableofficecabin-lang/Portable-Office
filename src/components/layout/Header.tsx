"use client";

import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, ShoppingCart, User, LogIn, ShieldCheck, Sparkles, Mail, Menu, ChevronDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.webp";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about-us" },
  { name: "Products", href: "/products", hasDropdown: true },
  { name: "Gallery", href: "/gallery" },
  { name: "Blog", href: "/blog" },
  { name: "FAQ", href: "/faq" },
  { name: "Contact", href: "/contact" },
];

const productCategories = [
  { name: "Portable Cabins", href: "/products/category/portable-cabins" },
  { name: "Container Offices", href: "/products/category/container-offices" },
  { name: "Site Office Containers", href: "/products/category/site-office-containers" },
  { name: "Cargo & Shipping Containers", href: "/products/category/cargo-storage-shipping-containers" },
  { name: "Prefab Homes", href: "/products/category/prefab-homes" },
  { name: "Security Cabins", href: "/products/category/security-cabins" },
  { name: "Portable Toilet Cabins", href: "/products/category/portable-toilet-cabins" },
  { name: "G+1 Workmen Accommodation", href: "/products/category/g1-workmen-accommodation" },
  { name: "Labour Colony", href: "/products/category/labour-colony" },
  { name: "Bunker Bed Container Cabin", href: "/products/category/bunker-bed-container-cabin" },
  { name: "PEB Buildings", href: "/products/category/peb-building" },
  { name: "Storage Sheds", href: "/products/category/storage-shed" },
  { name: "Fabrication", href: "/products/category/fabrication" },
  { name: "Modular Furniture", href: "/products/category/modular-furniture" },
  { name: "UPVC Windows & Doors", href: "/products/category/upvc-windows-doors" },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 shadow-[0_18px_50px_-28px_hsl(var(--foreground)/0.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="hidden border-b border-border/40 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground md:block">
        <div className="container-custom">
          <div className="flex min-h-9 items-center justify-between gap-2 py-1 text-xs sm:text-sm">
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-2.5 py-0.5 shadow-sm backdrop-blur-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm ring-1 ring-primary-foreground/15">
                  <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
                <div className="flex min-w-0 items-center gap-1.5 leading-none whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-semibold tracking-wide">
                    GST Verified
                    <Sparkles className="h-2.5 w-2.5 text-accent" />
                  </span>
                  <span className="hidden font-mono text-[10px] text-primary-foreground/75 sm:inline">33FVKPK6238Q1ZT</span>
                </div>
              </div>

              <a
                href="tel:+919731897976"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary-foreground/12 bg-primary-foreground/6 px-2.5 py-0.5 font-medium text-primary-foreground/90 transition-all hover:border-accent/40 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Phone className="h-3 w-3 text-accent" />
                <span>+91 9731897976</span>
              </a>

              <a
                href="mailto:sales@portableofficecabin.com"
                className="hidden items-center gap-1.5 rounded-full border border-primary-foreground/12 bg-primary-foreground/6 px-2.5 py-0.5 font-medium text-primary-foreground/90 transition-all hover:border-accent/40 hover:bg-primary-foreground/10 hover:text-primary-foreground lg:inline-flex"
              >
                <Mail className="h-3 w-3 text-accent" />
                <span>sales@portableofficecabin.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/88 text-foreground backdrop-blur-xl">
        <div className="container-custom">
          <div className="flex h-14 items-center justify-between gap-2 lg:h-16">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <img
                src={resolveImageUrl(logo)}
                alt="Portable Office Cabin"
                className="h-9 w-auto rounded-lg border border-accent/20 bg-card p-1 object-contain shadow-md lg:h-10"
              />
              <span className="truncate font-display text-sm font-extrabold tracking-tight text-foreground sm:text-base lg:text-lg">
                Portable Office <span className="text-accent">Cabin</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {navigation.map((item) =>
                item.hasDropdown ? (
                  <div key={item.name} className="group relative">
                    <Link
                      href={item.href}
                      className={cn(
                        "relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-all duration-200",
                        pathname.startsWith("/products")
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-foreground/78 hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {item.name}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                    </Link>
                    <div className="invisible absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,640px)] -translate-x-1/2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                      <div className="rounded-2xl border border-border/60 bg-popover p-3 shadow-xl">
                        <div className="grid grid-cols-2 gap-1">
                          {productCategories.map((cat) => (
                            <Link
                              key={cat.href}
                              href={cat.href}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary hover:text-accent"
                            >
                              <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                              <span className="truncate">{cat.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative rounded-full px-3 py-1 text-sm font-semibold transition-all duration-200",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground/78 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.name}
                    {pathname === item.href && (
                      <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-accent" />
                    )}
                  </Link>
                )
              )}
            </nav>

            <div className="hidden items-center gap-1.5 lg:flex">
              <a
                href="tel:+919731897976"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:border-accent/40 hover:text-accent"
              >
                <Phone className="h-3.5 w-3.5 text-accent" />
                +91 9731897976
              </a>

              {user ? (
                <Link
                  href="/my-account"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-sm font-semibold text-foreground transition-all hover:border-accent/40 hover:text-accent"
                >
                  <User className="h-3.5 w-3.5" />
                  My Account
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-sm font-semibold text-foreground transition-all hover:border-accent/40 hover:text-accent"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </Link>
              )}

              <Link href="/cart" aria-label="View cart" className="relative rounded-full border border-border/60 bg-card/70 p-2 text-foreground transition-all hover:border-accent/40 hover:text-accent">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-sm">
                    {itemCount}
                  </span>
                )}
              </Link>

              <Button variant="accent" size="sm" className="h-9 px-4" asChild>
                <Link href="/contact">Get Quote</Link>
              </Button>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/cart" aria-label="View cart" className="relative rounded-full border border-border/60 bg-card/70 p-2 text-foreground transition-all hover:border-accent/40 hover:text-accent">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-sm">
                    {itemCount}
                  </span>
                )}
              </Link>

              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/70 text-foreground transition-colors hover:border-accent/40 hover:text-accent"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[88vw] overflow-y-auto border-border/60 bg-background px-5 py-5 sm:max-w-sm">
                  <div className="flex min-h-full flex-col">
                    <div className="pr-10">
                      <SheetTitle className="text-left font-display text-xl font-extrabold tracking-tight">
                        Portable Office <span className="text-accent">Cabin</span>
                      </SheetTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Quick access to products, gallery, contact, and your account.</p>
                    </div>

                    <div className="mt-6 space-y-2">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "block rounded-xl border px-4 py-3 text-base font-semibold transition-all",
                            pathname === item.href
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-card/60 text-foreground hover:border-accent/40 hover:text-accent"
                          )}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>

                    <details className="mt-3 rounded-xl border border-border/60 bg-card/60">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">Product Categories</summary>
                      <div className="space-y-1 px-2 pb-3">
                        {productCategories.map((cat) => (
                          <Link
                            key={cat.href}
                            href={cat.href}
                            className="block rounded-lg px-3 py-2 text-sm text-foreground/85 hover:bg-secondary hover:text-accent"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </details>

                    <div className="mt-6 space-y-3 border-t border-border/60 pt-5">
                      <Link
                        href={user ? "/my-account" : "/login"}
                        className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-accent/40 hover:text-accent"
                      >
                        {user ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                        {user ? "My Account" : "Login / Register"}
                      </Link>

                      <a
                        href="tel:+919731897976"
                        className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-accent/40 hover:text-accent"
                      >
                        <Phone className="h-4 w-4 text-accent" />
                        <span>+91 9731897976</span>
                      </a>

                      <a
                        href="mailto:sales@portableofficecabin.com"
                        className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-accent/40 hover:text-accent"
                      >
                        <Mail className="h-4 w-4 text-accent" />
                        <span className="truncate">sales@portableofficecabin.com</span>
                      </a>
                    </div>

                    <div className="mt-auto pt-6">
                      <Button variant="accent" size="lg" className="w-full" asChild>
                        <Link href="/contact">Get Quote</Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
