"use client";

import * as React from "react";

export interface CartSelectedOption {
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaCents: number;
}

export interface CartItem {
  key: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  selectedOptions: CartSelectedOption[];
  prepNotes: string;
  imageUrl: string | null;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = React.createContext<CartContextValue | null>(null);
const STORAGE_KEY = "toffee-cart-v1";

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // localStorage is a browser-only external system: reading it during the
    // initial render would desync server/client markup (hydration
    // mismatch), so the cart intentionally starts empty and is populated
    // right after mount instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be unavailable (private browsing); the cart still works for this tab session.
    }
  }, [items, hydrated]);

  const addItem = React.useCallback((item: Omit<CartItem, "key">) => {
    setItems((prev) => [...prev, { ...item, key: crypto.randomUUID() }]);
  }, []);

  const updateQuantity = React.useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }, []);

  const removeItem = React.useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = React.useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
