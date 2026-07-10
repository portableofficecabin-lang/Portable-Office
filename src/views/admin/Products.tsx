"use client";

import { useState, useEffect } from "react";
import { NumberInput } from "@/components/admin/NumberInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit, Trash2, Eye, Loader2, Package, Save,
  ImagePlus, Star, StarOff, X, Download, ArrowUpDown, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DBProduct, DBCategory } from "@/types/database";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard } from "@/components/admin/AdminCard";
import { products as staticProducts, categories as staticCategories } from "@/data/products";
import { getProductSEO } from "@/data/productSEO";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const newId = () => Math.random().toString(36).slice(2, 10);

interface Variant {
  id: string;
  _existingId?: string;
  sku: string;
  gtin: string;
  mpn: string;
  title: string;
  price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  in_stock: boolean;
  color: string;
  size: string;
  material: string;
  image_url: string;
}

const emptyVariant = (): Variant => ({
  id: newId(), sku: "", gtin: "", mpn: "", title: "",
  price: null, sale_price: null, stock_quantity: 0, in_stock: true,
  color: "", size: "", material: "", image_url: "",
});

interface ProductForm {
  // basic
  name: string; slug: string; category: string; category_slug: string;
  in_stock: boolean; is_featured: boolean; sort_order: number;
  // pricing
  price: number | null; sale_price: number | null;
  sale_price_effective_from: string; sale_price_effective_to: string;
  currency: string; stock_quantity: number; low_stock_threshold: number;
  // descriptions
  short_description: string; description: string;
  // images
  image_url: string; additional_image_urls: string[];
  // identifiers
  brand: string; gtin: string; mpn: string; condition: string;
  identifier_exists: boolean; sku: string;
  // attributes
  color: string; size: string; material: string; pattern: string;
  age_group: string; gender: string; item_group_id: string;
  // shipping
  shipping_weight_kg: number | null; shipping_length_cm: number | null;
  shipping_width_cm: number | null; shipping_height_cm: number | null;
  // rental
  rental_enabled: boolean; rental_monthly_rate: number | null;
  rental_min_duration_months: number | null; rental_security_deposit: number | null;
  // SEO
  meta_title: string; meta_description: string; meta_keywords: string;
  google_product_category: string; product_type: string;
  custom_label_0: string; custom_label_1: string; custom_label_2: string;
  custom_label_3: string; custom_label_4: string;
}

const emptyForm = (): ProductForm => ({
  name: "", slug: "", category: "", category_slug: "",
  in_stock: true, is_featured: false, sort_order: 0,
  price: null, sale_price: null, sale_price_effective_from: "", sale_price_effective_to: "",
  currency: "INR", stock_quantity: 0, low_stock_threshold: 5,
  short_description: "", description: "",
  image_url: "", additional_image_urls: [],
  brand: "Portable Office Cabin", gtin: "", mpn: "", condition: "new",
  identifier_exists: true, sku: "",
  color: "", size: "", material: "", pattern: "",
  age_group: "", gender: "", item_group_id: "",
  shipping_weight_kg: null, shipping_length_cm: null, shipping_width_cm: null, shipping_height_cm: null,
  rental_enabled: false, rental_monthly_rate: null, rental_min_duration_months: 6, rental_security_deposit: null,
  meta_title: "", meta_description: "", meta_keywords: "",
  google_product_category: "", product_type: "",
  custom_label_0: "", custom_label_1: "", custom_label_2: "",
  custom_label_3: "", custom_label_4: "",
});

export default function AdminProducts() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [filterFeatured, setFilterFeatured] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<DBProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ProductForm>(emptyForm());
  const [featuresText, setFeaturesText] = useState("");
  const [specsText, setSpecsText] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const uploadProductImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      // Bucket is private, so generate a long-lived signed URL (10 years)
      const { data: signed, error: signErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      return signed?.signedUrl ?? null;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload image", variant: "destructive" });
      return null;
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage("main");
    const url = await uploadProductImage(file);
    setUploadingImage(null);
    if (url) setFormData((prev) => ({ ...prev, image_url: url }));
  };

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(`add-${index}`);
    const url = await uploadProductImage(file);
    setUploadingImage(null);
    if (url) {
      setFormData((prev) => {
        const arr = [...prev.additional_image_urls];
        arr[index] = url;
        return { ...prev, additional_image_urls: arr };
      });
    }
  };

  const handleAddNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage("new");
    const url = await uploadProductImage(file);
    setUploadingImage(null);
    if (url) setFormData((prev) => ({ ...prev, additional_image_urls: [...prev.additional_image_urls, url] }));
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        if (payload.eventType === "INSERT") setProducts((p) => [...p, payload.new as DBProduct]);
        else if (payload.eventType === "UPDATE")
          setProducts((p) => p.map((x) => (x.id === payload.new.id ? (payload.new as DBProduct) : x)));
        else if (payload.eventType === "DELETE")
          setProducts((p) => p.filter((x) => x.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProducts = async () => {
    try {
      // Preferred: ordered query.
      let { data, error } = await supabase.from("products").select("*")
        .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      // The live table may be missing a column used in ORDER BY (migration drift) —
      // that rejects the whole query. Retry unordered so real products still load,
      // then sort client-side.
      if (error) {
        console.warn("Products ordered query failed, retrying unordered:", (error as any)?.code, error.message);
        const retry = await supabase.from("products").select("*");
        if (retry.error) throw retry.error;
        data = retry.data as any;
      }
      const rows = ((data as DBProduct[]) || []).slice();
      rows.sort((a: any, b: any) => ((a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setProducts(rows);
    } catch (err: any) {
      // The catalog still renders from the bundled static products, so surface the real
      // reason in the console (for diagnosis) with a clear, non-cryptic toast.
      console.error("Products DB load failed — showing built-in catalog. Reason:", err?.code, err?.message || err);
      toast({
        title: "Live products unavailable",
        description: "Showing the built-in catalog. Open the browser console for the exact reason.",
        variant: "destructive",
      });
    } finally { setIsLoading(false); }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
    setCategories((data as DBCategory[]) || []);
  };

  const handleOpenModal = async (product?: any) => {
    if (product) {
      const p: any = product;
      const isStatic = !!p.__static;
      // For static (code-defined) products keep editingProduct null so save INSERTs a new DB row
      setEditingProduct(isStatic ? null : (product as DBProduct));
      const specs = (p.specifications || {}) as Record<string, any>;
      setFormData({
        name: p.name, slug: p.slug, category: p.category, category_slug: p.category_slug,
        in_stock: p.in_stock, is_featured: p.is_featured, sort_order: p.sort_order ?? 0,
        price: p.price, sale_price: p.sale_price ?? null,
        sale_price_effective_from: p.sale_price_effective_from?.slice(0, 10) ?? "",
        sale_price_effective_to: p.sale_price_effective_to?.slice(0, 10) ?? "",
        currency: p.currency ?? "INR",
        stock_quantity: p.stock_quantity ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 5,
        short_description: p.short_description ?? "", description: p.description ?? "",
        image_url: p.image_url ?? "", additional_image_urls: p.additional_image_urls ?? [],
        brand: p.brand ?? "Portable Office Cabin", gtin: p.gtin ?? "", mpn: p.mpn ?? "",
        condition: p.condition ?? "new", identifier_exists: p.identifier_exists ?? true,
        sku: p.sku ?? "",
        color: p.color ?? "", size: p.size ?? "", material: p.material ?? "", pattern: p.pattern ?? "",
        age_group: p.age_group ?? "", gender: p.gender ?? "", item_group_id: p.item_group_id ?? "",
        shipping_weight_kg: p.shipping_weight_kg ?? null,
        shipping_length_cm: p.shipping_length_cm ?? null,
        shipping_width_cm: p.shipping_width_cm ?? null,
        shipping_height_cm: p.shipping_height_cm ?? null,
        rental_enabled: !!specs.rental_enabled,
        rental_monthly_rate: specs.rental_monthly_rate ? Number(specs.rental_monthly_rate) : null,
        rental_min_duration_months: specs.rental_min_duration_months ? Number(specs.rental_min_duration_months) : 6,
        rental_security_deposit: specs.rental_security_deposit ? Number(specs.rental_security_deposit) : null,
        meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "", meta_keywords: p.meta_keywords ?? "",
        google_product_category: p.google_product_category ?? "", product_type: p.product_type ?? "",
        custom_label_0: p.custom_label_0 ?? "", custom_label_1: p.custom_label_1 ?? "",
        custom_label_2: p.custom_label_2 ?? "", custom_label_3: p.custom_label_3 ?? "",
        custom_label_4: p.custom_label_4 ?? "",
      });
      setFeaturesText((p.features || []).join("\n"));
      const reservedSpecKeys = new Set(["rental_enabled", "rental_monthly_rate", "rental_min_duration_months", "rental_security_deposit"]);
      setSpecsText(
        Object.entries(specs)
          .filter(([k]) => !reservedSpecKeys.has(k))
          .map(([k, v]) => `${k}: ${v}`).join("\n")
      );

      // Load variants (only for real DB products)
      if (!isStatic) {
        const { data: vData } = await supabase
          .from("product_variants").select("*").eq("product_id", product.id)
          .order("sort_order", { ascending: true });
        setVariants(
          (vData || []).map((v: any) => ({
            id: newId(), _existingId: v.id, sku: v.sku ?? "", gtin: v.gtin ?? "", mpn: v.mpn ?? "",
            title: v.title ?? "", price: v.price, sale_price: v.sale_price,
            stock_quantity: v.stock_quantity ?? 0, in_stock: v.in_stock ?? true,
            color: v.color ?? "", size: v.size ?? "", material: v.material ?? "", image_url: v.image_url ?? "",
          }))
        );
      } else {
        setVariants([]);
      }
    } else {
      setEditingProduct(null);
      setFormData(emptyForm());
      setFeaturesText("");
      setSpecsText("");
      setVariants([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: editingProduct ? prev.slug : generateSlug(name) }));
  };

  const handleCategoryChange = (categorySlug: string) => {
    const cat = displayCategories.find((c: any) => c.slug === categorySlug);
    if (cat) setFormData((prev) => ({ ...prev, category: cat.name, category_slug: cat.slug }));
  };

  const updateVariant = (id: string, patch: Partial<Variant>) =>
    setVariants((arr) => arr.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeVariant = (id: string) => setVariants((arr) => arr.filter((v) => v.id !== id));

  const handleSave = async () => {
    if (!formData.name || !formData.category_slug) {
      toast({ title: "Validation Error", description: "Name and Category are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
    const specifications: Record<string, any> = {};
    specsText.split("\n").forEach((line) => {
      const [k, ...v] = line.split(":");
      if (k && v.length) specifications[k.trim()] = v.join(":").trim();
    });
    if (formData.rental_enabled) {
      specifications.rental_enabled = true;
      if (formData.rental_monthly_rate != null) specifications.rental_monthly_rate = formData.rental_monthly_rate;
      if (formData.rental_min_duration_months != null) specifications.rental_min_duration_months = formData.rental_min_duration_months;
      if (formData.rental_security_deposit != null) specifications.rental_security_deposit = formData.rental_security_deposit;
    }

    const productData: any = {
      name: formData.name, slug: formData.slug || generateSlug(formData.name),
      category: formData.category, category_slug: formData.category_slug,
      short_description: formData.short_description || null,
      description: formData.description || null,
      price: formData.price, image_url: formData.image_url || null,
      features, specifications,
      in_stock: formData.in_stock, is_featured: formData.is_featured,
      sort_order: formData.sort_order,
      sku: formData.sku || null, stock_quantity: formData.stock_quantity,
      low_stock_threshold: formData.low_stock_threshold,
      sale_price: formData.sale_price,
      sale_price_effective_from: formData.sale_price_effective_from || null,
      sale_price_effective_to: formData.sale_price_effective_to || null,
      currency: formData.currency || "INR",
      additional_image_urls: formData.additional_image_urls,
      brand: formData.brand || null, gtin: formData.gtin || null, mpn: formData.mpn || null,
      condition: formData.condition || "new", identifier_exists: formData.identifier_exists,
      color: formData.color || null, size: formData.size || null,
      material: formData.material || null, pattern: formData.pattern || null,
      age_group: formData.age_group || null, gender: formData.gender || null,
      item_group_id: formData.item_group_id || null,
      shipping_weight_kg: formData.shipping_weight_kg, shipping_length_cm: formData.shipping_length_cm,
      shipping_width_cm: formData.shipping_width_cm, shipping_height_cm: formData.shipping_height_cm,
      meta_title: formData.meta_title || null, meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      google_product_category: formData.google_product_category || null,
      product_type: formData.product_type || null,
      custom_label_0: formData.custom_label_0 || null, custom_label_1: formData.custom_label_1 || null,
      custom_label_2: formData.custom_label_2 || null, custom_label_3: formData.custom_label_3 || null,
      custom_label_4: formData.custom_label_4 || null,
    };

    try {
      let productId: string;
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        productId = editingProduct.id;
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Sync variants
      const existingIds = variants.filter((v) => v._existingId).map((v) => v._existingId!);
      if (editingProduct) {
        if (existingIds.length === 0) {
          await supabase.from("product_variants").delete().eq("product_id", productId);
        } else {
          await supabase.from("product_variants").delete().eq("product_id", productId).not("id", "in", `(${existingIds.join(",")})`);
        }
      }
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const row: any = {
          product_id: productId, sku: v.sku || null, gtin: v.gtin || null, mpn: v.mpn || null,
          title: v.title || null, price: v.price, sale_price: v.sale_price,
          stock_quantity: v.stock_quantity, in_stock: v.in_stock,
          color: v.color || null, size: v.size || null, material: v.material || null,
          image_url: v.image_url || null, sort_order: i,
        };
        if (v._existingId) await supabase.from("product_variants").update(row).eq("id", v._existingId);
        else await supabase.from("product_variants").insert(row);
      }

      toast({ title: editingProduct ? "Product Updated" : "Product Created", description: formData.name });
      handleCloseModal();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save product", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", productToDelete.id);
      if (error) throw error;
      toast({ title: "Product Deleted", description: productToDelete.name });
      setIsDeleteDialogOpen(false); setProductToDelete(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    }
  };

  const toggleFeatured = async (product: DBProduct) => {
    await supabase.from("products").update({ is_featured: !product.is_featured }).eq("id", product.id);
  };

  // Merge DB products with static (code-defined) products so admin shows everything.
  // Static-only rows are marked __static = true. Editing one prefills the form from
  // static data (incl. image + SEO); saving inserts a new DB row that overrides it.
  const displayProducts = (() => {
    const dbBySlug = new Map<string, any>();
    products.forEach((p: any) => dbBySlug.set(p.slug, p));
    const staticAsDB: any[] = staticProducts
      .filter((sp) => {
        const slug = sp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return !dbBySlug.has(slug) && !dbBySlug.has((sp as any).slug);
      })
      .map((sp) => {
        const slug = sp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const seo = getProductSEO(sp.id, sp.name);
        // sp.images[0] may be a StaticImageData object (imported asset), not a string —
        // resolve to a URL string first, otherwise `.includes` throws and crashes the section.
        const firstImg = resolveImageUrl(sp.images?.[0]);
        const img = firstImg && !firstImg.includes("placeholder") ? firstImg : null;
        const specsObj: Record<string, string> = {};
        (sp.specifications || []).forEach((s) => { specsObj[s.label] = s.value; });
        return {
          __static: true,
          id: `static-${sp.id}`,
          name: sp.name,
          slug,
          short_description: sp.shortDescription,
          description: sp.description,
          category: sp.category,
          category_slug: sp.categorySlug,
          price: sp.price ?? null,
          image_url: img,
          features: sp.features || [],
          specifications: specsObj,
          in_stock: sp.inStock !== false,
          is_featured: !!sp.featured,
          sort_order: Number(sp.id) || 0,
          sku: sp.sku || "",
          stock_quantity: 0,
          low_stock_threshold: 5,
          meta_title: seo.title,
          meta_description: seo.description,
          meta_keywords: seo.keywords,
          created_at: new Date(0).toISOString(),
        };
      });
    return [...products, ...staticAsDB];
  })();

  const displayCategories = (() => {
    const bySlug = new Map<string, any>();
    categories.forEach((c) => bySlug.set(c.slug, c));
    staticCategories.forEach((c) => {
      if (!bySlug.has(c.slug)) {
        bySlug.set(c.slug, { id: `static-cat-${c.id}`, name: c.name, slug: c.slug, description: c.description, sort_order: Number(c.id) || 0 });
      }
    });
    return Array.from(bySlug.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  })();

  const filteredProducts = (() => {
    let arr = displayProducts.filter((p: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || p.category_slug === selectedCategory;
      const matchesAvail =
        filterAvailability === "all" ||
        (filterAvailability === "in" && p.in_stock) ||
        (filterAvailability === "out" && !p.in_stock);
      const matchesCondition = filterCondition === "all" || ((p as any).condition || "new") === filterCondition;
      const matchesFeatured =
        filterFeatured === "all" ||
        (filterFeatured === "yes" && p.is_featured) ||
        (filterFeatured === "no" && !p.is_featured);
      const isActive = p.in_stock !== false;
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "yes" && isActive) ||
        (filterActive === "no" && !isActive);
      return matchesSearch && matchesCategory && matchesAvail && matchesCondition && matchesFeatured && matchesActive;
    });
    arr = [...arr].sort((a: any, b: any) => {
      switch (sortBy) {
        case "price_asc": return (a.price ?? 0) - (b.price ?? 0);
        case "price_desc": return (b.price ?? 0) - (a.price ?? 0);
        case "stock_asc": return (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
        case "stock_desc": return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
        case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return arr;
  })();

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pageProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allOnPageSelected = pageProducts.length > 0 && pageProducts.every((p) => selectedIds.has(p.id));
  const togglePageSelect = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) pageProducts.forEach((p) => next.delete(p.id));
    else pageProducts.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const bulkSetActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("products").update({ in_stock: active }).in("id", ids);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: active ? "Activated" : "Deactivated", description: `${ids.length} products` });
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted", description: `${ids.length} products` });
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
  };

  const exportCSV = () => {
    const headers = ["ID", "Name", "SKU", "Brand", "Category", "Price", "Sale Price", "Stock", "Low Stock Alert", "In Stock", "Featured", "Condition", "GTIN", "MPN", "Slug"];
    const rows = filteredProducts.map((p: any) => [
      p.id, p.name, p.sku ?? "", p.brand ?? "", p.category, p.price ?? "", p.sale_price ?? "",
      p.stock_quantity ?? 0, p.low_stock_threshold ?? 0, p.in_stock ? "Yes" : "No",
      p.is_featured ? "Yes" : "No", p.condition ?? "new", p.gtin ?? "", p.mpn ?? "", p.slug,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-accent animate-spin" />
      </div>
    );
  }

  const set = (patch: Partial<ProductForm>) => setFormData((p) => ({ ...p, ...patch }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog - changes appear instantly on the website"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add New Product
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-muted-foreground text-sm">Total Products</p>
          <p className="text-2xl font-bold">{displayProducts.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-muted-foreground text-sm">Featured</p>
          <p className="text-2xl font-bold text-amber-500">{displayProducts.filter((p: any) => p.is_featured).length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-muted-foreground text-sm">In Stock</p>
          <p className="text-2xl font-bold text-emerald-500">{displayProducts.filter((p: any) => p.in_stock).length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <p className="text-muted-foreground text-sm">Low Stock</p>
          <p className="text-2xl font-bold text-orange-500">
            {displayProducts.filter((p: any) => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5)).length}
          </p>
        </div>
      </div>

      <AdminCard delay={0.1}>
        <div className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by title, SKU, brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {displayCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest First</SelectItem>
                <SelectItem value="created_asc">Oldest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="stock_desc">Stock: High to Low</SelectItem>
                <SelectItem value="stock_asc">Stock: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={filterAvailability} onValueChange={setFilterAvailability}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Availability</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCondition} onValueChange={setFilterCondition}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="refurbished">Refurbished</SelectItem>
                <SelectItem value="used">Used</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFeatured} onValueChange={setFilterFeatured}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Featured" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Featured</SelectItem>
                <SelectItem value="no">Not Featured</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yes">Active</SelectItem>
                <SelectItem value="no">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)}>Activate</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)}>Deactivate</Button>
              <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}
        </div>
      </AdminCard>

      {filteredProducts.length === 0 ? (
        <AdminCard><div className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-2">No products found</h3>
          <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
        </div></AdminCard>
      ) : (
        <AdminCard>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allOnPageSelected} onCheckedChange={togglePageSelect} />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageProducts.map((product: any) => {
                  const isLow = (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 5);
                  const checked = selectedIds.has(product.id);
                  return (
                    <TableRow key={product.id} className={cn(isLow && "bg-orange-50 dark:bg-orange-950/20")}>
                      <TableCell><Checkbox checked={checked} onCheckedChange={() => toggleSelect(product.id)} /></TableCell>
                      <TableCell>
                        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : <Package className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium line-clamp-1 max-w-xs">{product.name}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {product.__static && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-500 text-blue-600" title="From code — click Edit to customize and override">Static</Badge>
                          )}
                          {product.is_featured && <Badge variant="secondary" className="text-[10px] py-0 h-4">Featured</Badge>}
                          {isLow && !product.__static && <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-500 text-orange-600"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Low Stock</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{product.sku || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                      <TableCell className="font-medium">{product.price ? `₹${product.price.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className={cn("font-medium", isLow && "text-orange-600")}>{product.stock_quantity ?? 0}</TableCell>
                      <TableCell>
                        <Badge className={product.in_stock ? "bg-emerald-500" : "bg-red-500"}>
                          {product.in_stock ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!product.__static && (
                            <Button variant="ghost" size="icon" onClick={() => toggleFeatured(product)} className={cn("h-8 w-8", product.is_featured && "text-amber-500")} title="Featured">
                              {product.is_featured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/products/${product.slug}`, "_blank")} className="h-8 w-8" title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(product)} className="h-8 w-8" title={product.__static ? "Customize (creates editable copy)" : "Edit"}><Edit className="h-4 w-4" /></Button>
                          {!product.__static && (
                            <Button variant="ghost" size="icon" onClick={() => { setProductToDelete(product); setIsDeleteDialogOpen(true); }} className="h-8 w-8 text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AdminCard>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>All sections below — fill in what's relevant. Required: Name & Category.</DialogDescription>
          </DialogHeader>

          <Accordion type="multiple" defaultValue={["basic", "pricing"]} className="w-full">
            {/* 1. BASIC INFO */}
            <AccordionItem value="basic">
              <AccordionTrigger>1. Basic Information</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Executive Portable Cabin" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Slug</Label>
                    <Input value={formData.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="executive-portable-cabin" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category_slug} onValueChange={handleCategoryChange}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {displayCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <NumberInput value={formData.sort_order} onChange={(e) => set({ sort_order: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.in_stock} onCheckedChange={(v) => set({ in_stock: v })} />
                    <Label>In Stock</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_featured} onCheckedChange={(v) => set({ is_featured: v })} />
                    <Label>Featured Product</Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. PRICING */}
            <AccordionItem value="pricing">
              <AccordionTrigger>2. Pricing & Stock</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <NumberInput value={formData.price ?? 0} onChange={(e) => set({ price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="285000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Price (₹)</Label>
                    <NumberInput value={formData.sale_price ?? 0} onChange={(e) => set({ sale_price: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={formData.currency} onChange={(e) => set({ currency: e.target.value })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sale From</Label>
                    <Input type="date" value={formData.sale_price_effective_from} onChange={(e) => set({ sale_price_effective_from: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale To</Label>
                    <Input type="date" value={formData.sale_price_effective_to} onChange={(e) => set({ sale_price_effective_to: e.target.value })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input value={formData.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="POC-PC-20EX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <NumberInput value={formData.stock_quantity} onChange={(e) => set({ stock_quantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Alert</Label>
                    <NumberInput value={formData.low_stock_threshold} onChange={(e) => set({ low_stock_threshold: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. DESCRIPTION */}
            <AccordionItem value="desc">
              <AccordionTrigger>3. Description, Features & Specs</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Input value={formData.short_description} onChange={(e) => set({ short_description: e.target.value })} placeholder="Brief one-line description" />
                </div>
                <div className="space-y-2">
                  <Label>Full Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(html) => set({ description: html })}
                    placeholder="Write the full product description. Use the toolbar for headings, lists, links, images…"
                    minHeight={260}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Features (one per line)</Label>
                  <Textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="Feature 1&#10;Feature 2" />
                </div>
                <div className="space-y-2">
                  <Label>Specifications (key: value, one per line)</Label>
                  <Textarea rows={4} value={specsText} onChange={(e) => setSpecsText(e.target.value)} placeholder="Dimensions: 20ft x 10ft&#10;Weight: 2000 kg" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. IMAGES */}
            <AccordionItem value="images">
              <AccordionTrigger>4. Images</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Main Image</Label>
                  <div className="flex gap-2">
                    <Input value={formData.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="Paste image URL or upload →" />
                    <label className="inline-flex">
                      <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                      <span className={cn("inline-flex h-10 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer", uploadingImage === "main" && "opacity-60 pointer-events-none")}>
                        {uploadingImage === "main" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        <span className="hidden sm:inline">Upload</span>
                      </span>
                    </label>
                  </div>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Main preview" className="mt-2 h-24 w-24 object-cover rounded border" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Additional Images</Label>
                  {formData.additional_image_urls.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={url} onChange={(e) => {
                        const arr = [...formData.additional_image_urls]; arr[i] = e.target.value;
                        set({ additional_image_urls: arr });
                      }} placeholder="https://..." />
                      <label className="inline-flex">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAdditionalImageUpload(e, i)} />
                        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer", uploadingImage === `add-${i}` && "opacity-60 pointer-events-none")}>
                          {uploadingImage === `add-${i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        </span>
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => set({ additional_image_urls: formData.additional_image_urls.filter((_, j) => j !== i) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => set({ additional_image_urls: [...formData.additional_image_urls, ""] })}>
                      <Plus className="h-4 w-4 mr-1" /> Add URL
                    </Button>
                    <label className="inline-flex">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddNewImageUpload} />
                      <span className={cn("inline-flex h-9 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer", uploadingImage === "new" && "opacity-60 pointer-events-none")}>
                        {uploadingImage === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        Upload Image
                      </span>
                    </label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. IDENTIFIERS */}
            <AccordionItem value="ids">
              <AccordionTrigger>5. Brand & Identifiers (Google Merchant)</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input value={formData.brand} onChange={(e) => set({ brand: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={formData.condition} onValueChange={(v) => set({ condition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GTIN</Label>
                    <Input value={formData.gtin} onChange={(e) => set({ gtin: e.target.value })} placeholder="EAN/UPC/ISBN" />
                  </div>
                  <div className="space-y-2">
                    <Label>MPN</Label>
                    <Input value={formData.mpn} onChange={(e) => set({ mpn: e.target.value })} placeholder="Manufacturer Part Number" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.identifier_exists} onCheckedChange={(v) => set({ identifier_exists: v })} />
                  <Label>Identifier Exists (GTIN/MPN/Brand)</Label>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. ATTRIBUTES */}
            <AccordionItem value="attrs">
              <AccordionTrigger>6. Product Attributes</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Color</Label><Input value={formData.color} onChange={(e) => set({ color: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Size</Label><Input value={formData.size} onChange={(e) => set({ size: e.target.value })} placeholder="20ft, 40ft" /></div>
                  <div className="space-y-2"><Label>Material</Label><Input value={formData.material} onChange={(e) => set({ material: e.target.value })} placeholder="Corten Steel" /></div>
                  <div className="space-y-2"><Label>Pattern</Label><Input value={formData.pattern} onChange={(e) => set({ pattern: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Age Group</Label><Input value={formData.age_group} onChange={(e) => set({ age_group: e.target.value })} placeholder="adult" /></div>
                  <div className="space-y-2"><Label>Gender</Label><Input value={formData.gender} onChange={(e) => set({ gender: e.target.value })} placeholder="unisex" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Item Group ID (for variants)</Label><Input value={formData.item_group_id} onChange={(e) => set({ item_group_id: e.target.value })} /></div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 7. SHIPPING + VARIANTS */}
            <AccordionItem value="shipvar">
              <AccordionTrigger>7. Shipping Dimensions & Variants</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="space-y-2"><Label>Weight (kg)</Label><NumberInput value={formData.shipping_weight_kg ?? 0} onChange={(e) => set({ shipping_weight_kg: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                  <div className="space-y-2"><Label>Length (cm)</Label><NumberInput value={formData.shipping_length_cm ?? 0} onChange={(e) => set({ shipping_length_cm: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                  <div className="space-y-2"><Label>Width (cm)</Label><NumberInput value={formData.shipping_width_cm ?? 0} onChange={(e) => set({ shipping_width_cm: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                  <div className="space-y-2"><Label>Height (cm)</Label><NumberInput value={formData.shipping_height_cm ?? 0} onChange={(e) => set({ shipping_height_cm: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Variants ({variants.length})</Label>
                    <Button variant="outline" size="sm" onClick={() => setVariants((a) => [...a, emptyVariant()])}>
                      <Plus className="h-4 w-4 mr-1" /> Add Variant
                    </Button>
                  </div>
                  {variants.length === 0 && <p className="text-sm text-muted-foreground">No variants. Add one for sizes/colors/options.</p>}
                  <div className="space-y-3">
                    {variants.map((v, idx) => (
                      <div key={v.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Variant {idx + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeVariant(v.id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-2">
                          <Input placeholder="Title" value={v.title} onChange={(e) => updateVariant(v.id, { title: e.target.value })} />
                          <Input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(v.id, { sku: e.target.value })} />
                          <Input placeholder="GTIN" value={v.gtin} onChange={(e) => updateVariant(v.id, { gtin: e.target.value })} />
                          <Input placeholder="MPN" value={v.mpn} onChange={(e) => updateVariant(v.id, { mpn: e.target.value })} />
                          <NumberInput placeholder="Price" value={v.price ?? 0} onChange={(e) => updateVariant(v.id, { price: e.target.value ? parseFloat(e.target.value) : null })} />
                          <NumberInput placeholder="Sale Price" value={v.sale_price ?? 0} onChange={(e) => updateVariant(v.id, { sale_price: e.target.value ? parseFloat(e.target.value) : null })} />
                          <Input placeholder="Color" value={v.color} onChange={(e) => updateVariant(v.id, { color: e.target.value })} />
                          <Input placeholder="Size" value={v.size} onChange={(e) => updateVariant(v.id, { size: e.target.value })} />
                          <Input placeholder="Material" value={v.material} onChange={(e) => updateVariant(v.id, { material: e.target.value })} />
                          <NumberInput placeholder="Stock Qty" value={v.stock_quantity} onChange={(e) => updateVariant(v.id, { stock_quantity: parseInt(e.target.value) || 0 })} />
                          <Input placeholder="Image URL" className="sm:col-span-2" value={v.image_url} onChange={(e) => updateVariant(v.id, { image_url: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={v.in_stock} onCheckedChange={(checked) => updateVariant(v.id, { in_stock: checked })} />
                          <Label className="text-xs">In Stock</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 8. RENTAL */}
            <AccordionItem value="rental">
              <AccordionTrigger>8. Rental Options</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.rental_enabled} onCheckedChange={(v) => set({ rental_enabled: v })} />
                  <Label>Available for Rental</Label>
                </div>
                {formData.rental_enabled && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly Rate (₹)</Label>
                      <NumberInput value={formData.rental_monthly_rate ?? 0} onChange={(e) => set({ rental_monthly_rate: e.target.value ? parseFloat(e.target.value) : null })} placeholder="8000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Duration (months)</Label>
                      <NumberInput value={formData.rental_min_duration_months ?? 0} onChange={(e) => set({ rental_min_duration_months: e.target.value ? parseInt(e.target.value) : null })} placeholder="6" />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Deposit (₹)</Label>
                      <NumberInput value={formData.rental_security_deposit ?? 0} onChange={(e) => set({ rental_security_deposit: e.target.value ? parseFloat(e.target.value) : null })} />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 9. SEO */}
            <AccordionItem value="seo">
              <AccordionTrigger>9. SEO & Google Merchant</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input value={formData.meta_title} onChange={(e) => set({ meta_title: e.target.value })} placeholder="Recommended <60 chars" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea rows={2} value={formData.meta_description} onChange={(e) => set({ meta_description: e.target.value })} placeholder="Recommended <160 chars" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Keywords</Label>
                  <Input value={formData.meta_keywords} onChange={(e) => set({ meta_keywords: e.target.value })} placeholder="comma, separated, keywords" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Google Product Category</Label>
                    <Input value={formData.google_product_category} onChange={(e) => set({ google_product_category: e.target.value })} placeholder="ID or full path" />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Type</Label>
                    <Input value={formData.product_type} onChange={(e) => set({ product_type: e.target.value })} placeholder="Business > Construction > ..." />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Label>Custom Label {i}</Label>
                      <Input value={(formData as any)[`custom_label_${i}`]} onChange={(e) => set({ [`custom_label_${i}`]: e.target.value } as any)} />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />{editingProduct ? "Update" : "Create"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Products</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedIds.size} selected products. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-red-500 hover:bg-red-600">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
