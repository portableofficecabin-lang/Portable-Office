export const MATERIAL_CATEGORIES = [
  "MS Tube",
  "ISMC Channel",
  "CR Sheet",
  "GI Sheet",
  "PUF Panel",
  "Glass Wool",
  "MDF",
  "Cement Board",
  "Vinyl Flooring",
  "Paint",
  "Electrical",
  "Plumbing",
  "Hardware",
] as const;

export const UNITS = ["Nos", "Kg", "Mtr", "Sqft", "Sqm", "Ltr", "Bag", "Box", "Roll", "Sheet"] as const;

export interface Factory {
  id: string;
  name: string;
  code: string;
  location: string;
  state: string | null;
  is_active: boolean;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  size: string | null;
  thickness: string | null;
  brand: string | null;
  unit: string;
  opening_stock: number;
  min_stock_alert: number;
  purchase_rate: number;
  supplier_id: string | null;
  hsn_code: string | null;
  gst_percent: number;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  is_active: boolean;
}

export interface MaterialStock {
  material_id: string;
  factory_id: string;
  current_stock: number;
  reserved_stock: number;
}
