/**
 * GUEST CART STORAGE — the logged-out visitor's cart, in localStorage.
 *
 * WHY localStorage and not the database: cart_items is protected by the RLS policy
 * "Users can manage own cart" USING (auth.uid() = user_id). An anonymous request has
 * auth.uid() = NULL, so the database itself forbids a guest from ever reading or writing
 * cart_items. A logged-out cart therefore cannot live in Supabase — localStorage is the
 * correct store, and it also keeps the anonymous-visitor "no Supabase bundle" optimisation
 * (see AuthContext) intact, since a guest touching their cart never loads the client.
 *
 * The stored shape is deliberately minimal — only { product_id, quantity }. Everything a
 * cart row displays (name, GST-inclusive price, image, category) is re-derived from the
 * product_id against the static catalog, exactly as the logged-in cart does, so a guest
 * cart can never carry a stale or tampered price into checkout. The server re-prices every
 * line from the catalog before charging regardless (see app/api/razorpay/order/route.ts).
 */

export interface GuestCartLine {
  product_id: string;
  quantity: number;
}

/** localStorage key. Versioned so a future shape change can be migrated, not silently misread. */
export const GUEST_CART_KEY = "poc_guest_cart_v1";

/** Fired on the window after any guest-cart mutation so a same-tab CartProvider can re-read. */
export const GUEST_CART_EVENT = "poc-guest-cart-changed";

const MAX_QTY = 999;

/** Coerce an unknown value into a valid line, or null. Quantity is clamped to [1, MAX_QTY]. */
function toLine(value: unknown): GuestCartLine | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const productId = typeof v.product_id === "string" ? v.product_id.trim() : "";
  if (!productId) return null;
  const rawQty = Number(v.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.min(MAX_QTY, Math.max(1, Math.floor(rawQty))) : 1;
  return { product_id: productId, quantity };
}

/** Read the guest cart. Always returns a clean array — a corrupt/absent value reads as empty. */
export function readGuestCart(): GuestCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // De-duplicate by product_id (last write wins), dropping any invalid entry.
    const byId = new Map<string, GuestCartLine>();
    for (const entry of parsed) {
      const line = toLine(entry);
      if (line) byId.set(line.product_id, line);
    }
    return Array.from(byId.values());
  } catch {
    return [];
  }
}

/** Persist the guest cart and notify same-tab listeners. Empty arrays clear the key. */
export function writeGuestCart(lines: GuestCartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    if (lines.length === 0) window.localStorage.removeItem(GUEST_CART_KEY);
    else window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    /* storage full / disabled (private mode) — the cart is best-effort, never throw */
  }
  try {
    window.dispatchEvent(new Event(GUEST_CART_EVENT));
  } catch {
    /* no window event support — same-tab sync degrades to next mount */
  }
}

/**
 * Add (or set) a product in the guest cart. Mirrors the logged-in upsert's SET semantics:
 * re-adding a product sets it to `quantity`, it does not accumulate — so the two carts behave
 * identically. Returns the new cart.
 */
export function addGuestCartItem(productId: string, quantity = 1): GuestCartLine[] {
  const line = toLine({ product_id: productId, quantity });
  if (!line) return readGuestCart();
  const lines = readGuestCart();
  const existing = lines.find((l) => l.product_id === line.product_id);
  if (existing) existing.quantity = line.quantity;
  else lines.push(line);
  writeGuestCart(lines);
  return lines;
}

/** Set an exact quantity for a product (removes it when quantity < 1). Returns the new cart. */
export function setGuestCartQuantity(productId: string, quantity: number): GuestCartLine[] {
  if (quantity < 1) return removeGuestCartItem(productId);
  const lines = readGuestCart();
  const existing = lines.find((l) => l.product_id === productId);
  if (existing) existing.quantity = Math.min(MAX_QTY, Math.floor(quantity));
  else {
    const line = toLine({ product_id: productId, quantity });
    if (line) lines.push(line);
  }
  writeGuestCart(lines);
  return lines;
}

/** Remove a product from the guest cart. Returns the new cart. */
export function removeGuestCartItem(productId: string): GuestCartLine[] {
  const lines = readGuestCart().filter((l) => l.product_id !== productId);
  writeGuestCart(lines);
  return lines;
}

/** Empty the guest cart entirely. */
export function clearGuestCart(): void {
  writeGuestCart([]);
}
