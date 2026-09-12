'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { CartItem } from '@/types';
import { cartLineKey } from '@/lib/catalog/variants';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'la-merced-cart';

function sameLine(a: CartItem, b: Pick<CartItem, 'productId' | 'variantId'>) {
  return cartLineKey(a) === cartLineKey(b);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored) as CartItem[]);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    let added = 0;
    setItems((prev) => {
      const existing = prev.find((row) => sameLine(row, item));
      const max = item.maxQuantity ?? existing?.maxQuantity;
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (max != null && nextQty > max) {
          added = 0;
          return prev;
        }
        added = qty;
        return prev.map((row) =>
          sameLine(row, item) ? { ...row, quantity: nextQty, maxQuantity: max ?? row.maxQuantity } : row,
        );
      }
      if (max != null && qty > max) {
        added = 0;
        return prev;
      }
      added = qty;
      return [...prev, { ...item, quantity: qty }];
    });
    if (added > 0) {
      toast.success('Agregado al carrito', {
        description: [item.name, item.size ? `Talla ${item.size}` : null, item.color]
          .filter(Boolean)
          .join(' · '),
      });
    } else {
      toast.error('No hay más stock de esa talla/color');
    }
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((row) => cartLineKey(row) !== lineKey));
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((row) => cartLineKey(row) !== lineKey));
      return;
    }
    setItems((prev) =>
      prev.map((row) => {
        if (cartLineKey(row) !== lineKey) return row;
        const max = row.maxQuantity;
        return { ...row, quantity: max != null ? Math.min(quantity, max) : quantity };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }),
    [items, addItem, removeItem, updateQuantity, clearCart, total, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
