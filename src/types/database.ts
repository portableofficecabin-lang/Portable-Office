// Database types for appointments, enquiries, products, and categories
export interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company: string | null;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "postponed" | "declined";
  created_at: string;
  updated_at: string;
}

export interface AppointmentInsert {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  company?: string | null;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  notes?: string | null;
  status?: "pending" | "confirmed" | "cancelled" | "completed" | "postponed" | "declined";
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  enquiry_type: "general" | "quote" | "product" | "support";
  product_id: string | null;
  product_name: string | null;
  status: "new" | "read" | "responded" | "closed";
  created_at: string;
  updated_at: string;
}

export interface EnquiryInsert {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message: string;
  enquiry_type?: "general" | "quote" | "product" | "support";
  product_id?: string | null;
  product_name?: string | null;
  status?: "new" | "read" | "responded" | "closed";
}

// Database Product type (from Supabase)
export interface DBProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  category: string;
  category_slug: string;
  price: number | null;
  image_url: string | null;
  features: string[];
  specifications: Record<string, string>;
  in_stock: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBProductInsert {
  name: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  category: string;
  category_slug: string;
  price?: number | null;
  image_url?: string | null;
  features?: string[];
  specifications?: Record<string, string>;
  in_stock?: boolean;
  is_featured?: boolean;
  sort_order?: number;
}

// Database Category type (from Supabase)
export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBCategoryInsert {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export interface DBBlogPost {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  author: string;
  category: string;
  status: string;
  featured: boolean;
  published_at: string | null;
  sort_order: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
