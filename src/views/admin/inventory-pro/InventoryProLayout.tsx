"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, Factory, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, Briefcase, ShoppingBag, Truck, Bell, BarChart3,
  ClipboardCheck, Recycle, FileText, QrCode, Hammer, Wrench,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin/inventory-pro", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/inventory-pro/materials", label: "Materials", icon: Package },
  { to: "/admin/inventory-pro/factories", label: "Factories", icon: Factory },
  { to: "/admin/inventory-pro/inward", label: "Stock Inward", icon: ArrowDownToLine },
  { to: "/admin/inventory-pro/outward", label: "Stock Outward", icon: ArrowUpFromLine },
  { to: "/admin/inventory-pro/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/admin/inventory-pro/projects", label: "Project BOQ", icon: Briefcase },
  { to: "/admin/inventory-pro/work-orders", label: "Work Orders", icon: FileText },
  { to: "/admin/inventory-pro/purchase-orders", label: "Purchase Orders", icon: ShoppingBag },
  { to: "/admin/inventory-pro/rentals", label: "Rental Assets", icon: Truck },
  { to: "/admin/inventory-pro/gate-pass", label: "Gate Pass", icon: ClipboardCheck },
  { to: "/admin/inventory-pro/production", label: "Production", icon: Hammer },
  { to: "/admin/inventory-pro/machinery", label: "Machinery", icon: Wrench },
  { to: "/admin/inventory-pro/scrap", label: "Scrap", icon: Recycle },
  { to: "/admin/inventory-pro/alerts", label: "Low Stock", icon: Bell },
  { to: "/admin/inventory-pro/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/inventory-pro/scanner", label: "QR Scanner", icon: QrCode },
];

export default function InventoryProLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Factory className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Inventory & Material Tracking</h2>
            <p className="text-sm text-slate-300">Multi-factory ERP for Portable Office Cabin manufacturing</p>
          </div>
        </div>
      </motion.div>

      <div className="bg-card rounded-2xl border border-border p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t) => {
            const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <NavLink
                key={t.to}
                href={t.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
