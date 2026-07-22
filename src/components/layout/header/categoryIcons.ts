/**
 * Maps the `icon` key carried by each entry in `categories` (src/data/products.ts)
 * to its Lucide component. Mirrors the map in src/components/home/CategoriesSection.tsx
 * so a category shows the same icon in the mega menu, the mobile drawer and the
 * home-page grid.
 *
 * `fallback` is used when a category is added upstream with an icon key that has no
 * entry here — the menu then renders a neutral icon instead of crashing.
 */
import {
  Archive,
  Armchair,
  Bath,
  BedDouble,
  Briefcase,
  Building,
  Building2,
  Container,
  DoorOpen,
  Hammer,
  Home,
  LayoutGrid,
  Package,
  Shield,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  building: Building,
  briefcase: Briefcase,
  layout: LayoutGrid,
  home: Home,
  bath: Bath,
  shield: Shield,
  container: Container,
  building2: Building2,
  users: Users,
  bedDouble: BedDouble,
  warehouse: Warehouse,
  archive: Archive,
  hammer: Hammer,
  doorOpen: DoorOpen,
  armchair: Armchair,
};

export const fallbackCategoryIcon: LucideIcon = Package;

export function resolveCategoryIcon(key: string): LucideIcon {
  return categoryIcons[key] ?? fallbackCategoryIcon;
}
