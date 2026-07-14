"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  TrendingUp,
  Receipt,
  Kanban,
  Boxes,
  Truck,
  FileText,
  ShoppingCart,
  Target,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Calculator,
  Ruler,
  Star,
  BookOpen,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const sidebarNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard, group: "Dashboard" },
  { name: "Analytics", href: "/admin/analytics", icon: TrendingUp, group: "Dashboard" },
  { name: "CRM", href: "/admin/crm", icon: Target, group: "CRM" },
  { name: "Leads Pipeline", href: "/admin/pipeline", icon: Kanban, group: "CRM" },
  { name: "Customers", href: "/admin/customers", icon: Users, group: "CRM" },
  { name: "Parties / Clients", href: "/admin/parties", icon: Building2, group: "CRM", highlight: true },
  { name: "Enquiries", href: "/admin/enquiries", icon: MessageSquare, group: "CRM" },
  { name: "Reviews", href: "/admin/reviews", icon: Star, group: "CRM", highlight: true },
  { name: "Blog Posts", href: "/admin/blog", icon: BookOpen, group: "CRM" },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar, group: "CRM" },
  { name: "Sales & Quotation", href: "/admin/sales", icon: ShoppingCart, group: "ERP" },
  { name: "Quotation Pro", href: "/admin/quotation-pro", icon: FileText, group: "ERP" },
  { name: "Labour Colony Calculator", href: "/admin/labour-colony-quotation", icon: Building2, group: "ERP", highlight: true },
  { name: "Orders & Invoices", href: "/admin/orders", icon: Receipt, group: "ERP" },
  { name: "Products", href: "/admin/products", icon: Package, group: "ERP" },
  { name: "Categories", href: "/admin/categories", icon: FolderOpen, group: "ERP" },
  { name: "Inventory", href: "/admin/inventory", icon: Boxes, group: "ERP" },
  { name: "Inventory & Material Tracking", href: "/admin/inventory-pro", icon: Boxes, group: "ERP", highlight: true },
  { name: "Work Orders", href: "/admin/inventory-pro/work-orders", icon: FileText, group: "ERP" },
  { name: "Factory Invoice Tracker", href: "/admin/factory-invoices", icon: ShieldAlert, group: "ERP", highlight: true },
  { name: "Cabin Quotation Calculator", href: "/admin/cabin-quotation", icon: Calculator, group: "ERP", highlight: true },
  { name: "Cabin Design Calculator", href: "/admin/cabin-calculator", icon: Ruler, group: "ERP", highlight: true },
  { name: "Material Master", href: "/admin/material-master", icon: Boxes, group: "ERP", highlight: true },
  { name: "Table Config", href: "/admin/table-config", icon: Table2, group: "ERP", highlight: true },
  { name: "Rental Contracts", href: "/admin/rental-contracts", icon: Truck, group: "ERP", highlight: true },
  { name: "Suppliers", href: "/admin/suppliers", icon: Truck, group: "ERP" },
  { name: "Specifications", href: "/admin/specifications", icon: FileText, group: "Documents" },
  { name: "Warranty Certificate", href: "/admin/warranty-certificate", icon: ShieldCheck, group: "Documents", highlight: true },
  { name: "Settings", href: "/admin/settings", icon: Settings, group: "System" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-muted/30 via-background to-muted/50">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gradient-to-b from-primary via-primary to-primary/95 text-primary-foreground transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber to-amber-light flex items-center justify-center shadow-lg">
              <span className="text-white font-display font-bold text-xl">P</span>
            </div>
            <div>
              <span className="font-display font-bold text-lg">Admin Panel</span>
              <p className="text-xs text-primary-foreground/60">CRM Dashboard</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {(["Dashboard", "CRM", "ERP", "Documents", "System"] as const).map((group) => (
            <div key={group} className="mb-3">
              <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider font-bold text-primary-foreground/40">
                {group}
              </div>
              {sidebarNav.filter((i) => i.group === group).map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-gradient-to-r from-accent to-amber-light text-white shadow-lg"
                        : (item as { highlight?: boolean }).highlight
                          ? "bg-gradient-to-r from-emerald-500/90 to-emerald-600 text-white shadow-md hover:from-emerald-500 hover:to-emerald-700 ring-2 ring-emerald-300/50"
                          : "text-primary-foreground/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.icon className={cn("h-4.5 w-4.5 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                    {item.name}
                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-light flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Admin User</div>
              <div className="text-xs text-primary-foreground/60 truncate">
                {user?.email || "admin@example.com"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-primary-foreground/70 hover:text-white hover:bg-white/10 rounded-xl"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen lg:min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-muted transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="font-display font-bold text-lg text-foreground">
              {sidebarNav.find(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href)),
              )?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-xl hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-accent to-amber-light rounded-full ring-2 ring-card" />
            </button>

            <Link href="/">
              <Button variant="outline" size="sm" className="hidden sm:flex rounded-xl">
                View Website
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
