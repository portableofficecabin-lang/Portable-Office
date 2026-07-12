"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Load Supabase lazily so its (~heavy) bundle stays off the initial JS-execution
// path. Every cart operation is async and gated behind a logged-in user, so the
// client is only fetched when a signed-in user actually touches their cart.
const getSupabase = () =>
  import("@/integrations/supabase/client").then((m) => m.supabase);

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  customization_notes: string | null;
  product?: {
    name: string;
    price: number | null;
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
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const enrichWithProductData = async (cartRows: { id: string; product_id: string; quantity: number; customization_notes: string | null }[]): Promise<CartItem[]> => {
    // Lazy-load the product catalog + image map only when a logged-in user
    // actually has cart rows, so the large @/data/products module is not parsed
    // during hydration of every (anonymous) public page that mounts CartProvider.
    const [{ getProductById }, { getBestProductImage }] = await Promise.all([
      import("@/data/products"),
      import("@/data/productImages"),
    ]);
    return cartRows.map(row => {
      const localProduct = getProductById(row.product_id);
      return {
        ...row,
        product: localProduct ? {
          name: localProduct.name,
          price: localProduct.price || null,
          image_url: getBestProductImage(localProduct.id, localProduct.categorySlug, localProduct.images?.[0], localProduct.sku),
          category: localProduct.category,
        } : undefined,
      };
    });
  };

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return; }
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

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need an account to add items to your quote list.", variant: "destructive" });
      return;
    }
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("cart_items")
        .upsert({ user_id: user.id, product_id: productId, quantity }, { onConflict: "user_id,product_id" });
      if (error) throw error;
      toast({ title: "Added to your quote list", description: "Submit your quote list and our team will send you final pricing." });
      fetchCart();
    } catch {
      toast({ title: "Error", description: "Could not add to your quote list.", variant: "destructive" });
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const supabase = await getSupabase();
      await supabase.from("cart_items").delete().eq("id", itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch { /* silent */ }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(itemId);
    try {
      const supabase = await getSupabase();
      await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    } catch { /* silent */ }
  };

  const clearCart = async () => {
    if (!user) return;
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
