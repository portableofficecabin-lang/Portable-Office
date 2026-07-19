"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { sellPrice } from "@/lib/pricing/gst";
import {
  readGuestCart,
  addGuestCartItem,
  setGuestCartQuantity,
  removeGuestCartItem,
  clearGuestCart,
  GUEST_CART_EVENT,
  GUEST_CART_KEY,
} from "@/lib/cart/guestCart";

// Load Supabase lazily so its (~heavy) bundle stays off the initial JS-execution path.
// A LOGGED-IN cart operation is async and touches the database, so the client is only
// fetched when a signed-in user actually touches their cart. A GUEST cart lives entirely
// in localStorage (see @/lib/cart/guestCart) and never loads Supabase at all — so the
// anonymous visitor who makes up ~all public/SEO traffic still pays no Supabase bundle cost.
//
// NOTE: @/data/productCommerce and @/lib/pricing/gst are imported EAGERLY above — they are
// tiny (a flat array + four pure functions) and addToCart must be able to refuse a quote-only
// product synchronously, before it ever reaches the cart, for a guest and a user alike.
const getSupabase = () =>
  import("@/integrations/supabase/client").then((m) => m.supabase);

interface CartItem {
  /** DB row uuid for a logged-in cart; the product_id itself for a guest cart. */
  id: string;
  product_id: string;
  quantity: number;
  customization_notes: string | null;
  product?: {
    name: string;
    /**
     * The GST-INCLUSIVE price the customer actually pays, i.e. sellPrice(basePrice)
     * from src/data/productCommerce.ts. Deliberately NOT Product.price from
     * src/data/products.ts — that field is a stale ex-GST display figure and using it
     * here is exactly the price mismatch that got the Merchant account suspended.
     */
    price: number | null;
    sku: string | null;
    image_url: string | null;
    category: string;
  };
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** GST-inclusive items subtotal. Freight and installation are added at checkout. */
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Shared enrichment: turn { product_id, quantity } rows into display-ready cart items.
 *  Price/name/image are re-derived from the static catalog, so a guest cart and a DB cart
 *  render from the identical source and can never disagree on price. */
async function enrichWithProductData(
  rows: { id: string; product_id: string; quantity: number; customization_notes: string | null }[],
): Promise<CartItem[]> {
  // Lazy-load the product catalog + image map only when there are rows to enrich, so the
  // large @/data/products module is not parsed during hydration of every public page.
  const [{ getProductById }, { getBestProductImage }] = await Promise.all([
    import("@/data/products"),
    import("@/data/productImages"),
  ]);
  return rows.map((row) => {
    const localProduct = getProductById(row.product_id);
    // Price comes from the commerce catalog, never from Product.price.
    const commerce = getCommerce(row.product_id);
    return {
      ...row,
      product: localProduct
        ? {
            name: localProduct.name,
            price: commerce && isPurchasable(row.product_id) ? sellPrice(commerce.basePrice) : null,
            sku: commerce?.sku ?? null,
            image_url: getBestProductImage(localProduct.id, localProduct.categorySlug, localProduct.images?.[0], localProduct.sku),
            category: localProduct.category,
          }
        : undefined,
    };
  });
}

/** Reject a quote-only product before it can ever reach a cart that leads to payment.
 *  The SINGLE door both the guest and the logged-in add paths pass through. */
function refuseIfNotPurchasable(productId: string): boolean {
  if (isPurchasable(productId)) return false;
  toast({
    title: "Not available for online purchase",
    description: "This product is made to order — please request a quote.",
    variant: "destructive",
  });
  return true;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Tracks the previous user id so a null→user transition can merge the guest cart exactly once.
  const prevUserIdRef = useRef<string | null>(null);

  // ── GUEST CART (localStorage) ─────────────────────────────────────────────────────────
  const loadGuestCart = useCallback(async () => {
    const guestLines = readGuestCart();
    if (guestLines.length === 0) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    const enriched = await enrichWithProductData(
      // id === product_id for a guest row, so Cart.tsx's remove/update-by-id works with no DB.
      guestLines.map((l) => ({ id: l.product_id, product_id: l.product_id, quantity: l.quantity, customization_notes: null })),
    );
    setItems(enriched);
    setIsLoading(false);
  }, []);

  // ── LOGGED-IN CART (Supabase) ─────────────────────────────────────────────────────────
  const fetchDbCart = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, customization_notes")
        .eq("user_id", user.id);
      if (error) throw error;
      setItems(await enrichWithProductData(data || []));
    } catch { /* silent */ }
    setIsLoading(false);
  }, [user]);

  /** Merge the logged-out localStorage cart into the freshly-signed-in user's DB cart.
   *  Quantities are SUMMED (the user may already have the SKU on another device), the
   *  guest cart is cleared, and only purchasable products are carried over. */
  const mergeGuestCartIntoDb = useCallback(async (userId: string) => {
    const guestLines = readGuestCart();
    const sellable = guestLines.filter((l) => isPurchasable(l.product_id));
    if (sellable.length === 0) {
      clearGuestCart();
      return;
    }
    try {
      const supabase = await getSupabase();
      const { data: existing } = await supabase
        .from("cart_items")
        .select("product_id, quantity")
        .eq("user_id", userId);
      const currentQty = new Map<string, number>((existing || []).map((r) => [r.product_id as string, r.quantity as number]));
      const rows = sellable.map((l) => ({
        user_id: userId,
        product_id: l.product_id,
        quantity: Math.min(999, (currentQty.get(l.product_id) ?? 0) + l.quantity),
      }));
      await supabase.from("cart_items").upsert(rows, { onConflict: "user_id,product_id" });
    } catch { /* if the merge fails the guest cart is left intact for a retry */ return; }
    clearGuestCart();
  }, []);

  // Drive the cart from the auth state. On a genuine null→user login, merge first.
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    const currUserId = user?.id ?? null;
    prevUserIdRef.current = currUserId;

    if (currUserId) {
      // Signed in. If we just transitioned from logged-out, fold the guest cart in first.
      if (prevUserId !== currUserId) {
        (async () => {
          await mergeGuestCartIntoDb(currUserId);
          await fetchDbCart();
        })();
      } else {
        fetchDbCart();
      }
    } else {
      loadGuestCart();
    }
  }, [user, fetchDbCart, loadGuestCart, mergeGuestCartIntoDb]);

  // Keep a guest cart in sync when it changes in this tab (our own mutations) or another tab.
  useEffect(() => {
    if (user) return; // logged-in cart is authoritative in the DB; ignore guest-cart events
    const onChange = () => { loadGuestCart(); };
    const onStorage = (e: StorageEvent) => { if (e.key === GUEST_CART_KEY) loadGuestCart(); };
    window.addEventListener(GUEST_CART_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(GUEST_CART_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, loadGuestCart]);

  // ── MUTATIONS — branch on auth, identical validation for both ─────────────────────────
  const addToCart = async (productId: string, quantity = 1) => {
    // A quote-only product (made-to-order, rental, service, guide, location page, or a price
    // the owner has not confirmed) must never enter a cart that leads to a real payment.
    if (refuseIfNotPurchasable(productId)) return;

    if (!user) {
      addGuestCartItem(productId, quantity); // GUEST_CART_EVENT triggers loadGuestCart()
      toast({ title: "Added to cart", description: "Prices include 18% GST. Transport and installation are calculated at checkout." });
      return;
    }

    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("cart_items")
        .upsert({ user_id: user.id, product_id: productId, quantity }, { onConflict: "user_id,product_id" });
      if (error) throw error;
      toast({ title: "Added to cart", description: "Prices include 18% GST. Transport and installation are calculated at checkout." });
      fetchDbCart();
    } catch {
      toast({ title: "Error", description: "Could not add this item to your cart.", variant: "destructive" });
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) {
      // For a guest, itemId IS the product_id (see loadGuestCart).
      removeGuestCartItem(itemId);
      return;
    }
    try {
      const supabase = await getSupabase();
      await supabase.from("cart_items").delete().eq("id", itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch { /* silent */ }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(itemId);
    if (!user) {
      setGuestCartQuantity(itemId, quantity); // itemId === product_id for a guest
      return;
    }
    try {
      const supabase = await getSupabase();
      await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    } catch { /* silent */ }
  };

  const clearCart = async () => {
    if (!user) {
      clearGuestCart();
      setItems([]);
      return;
    }
    const supabase = await getSupabase();
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const getCartTotal = () => items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount: items.reduce((s, i) => s + i.quantity, 0), isLoading, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

const defaultCart: CartContextType = {
  items: [],
  itemCount: 0,
  isLoading: false,
  addToCart: async () => {},
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  clearCart: async () => {},
  getCartTotal: () => 0,
};

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  return ctx ?? defaultCart;
}
