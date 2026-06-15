'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Product } from './catalog';

export type CartItem = { product: Product; quantity: number };

export type CartSignalEntry = {
  productId: string;
  tags: string[];
  timestamp: number;
};

export const CART_SIGNALS_KEY = 'buildright_cart_signals_v1';
const CART_KEY = 'buildright_cart_v1';

// Read the cart signal log from sessionStorage. Used by M5 SessionIntentStore on init.
export function readCartSignals(): CartSignalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CART_SIGNALS_KEY);
    return raw ? (JSON.parse(raw) as CartSignalEntry[]) : [];
  } catch {
    return [];
  }
}

function appendCartSignal(product: Product) {
  try {
    const raw = sessionStorage.getItem(CART_SIGNALS_KEY);
    const signals: CartSignalEntry[] = raw ? JSON.parse(raw) : [];
    signals.push({ productId: product.id, tags: product.tags, timestamp: Date.now() });
    sessionStorage.setItem(CART_SIGNALS_KEY, JSON.stringify(signals));
  } catch {}
}

type CartCtx = {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const didHydrate = useRef(false);

  // Declared first so it fires before the hydration effect on mount.
  // The didHydrate gate prevents it from overwriting sessionStorage with [] before
  // the hydration effect has had a chance to restore saved items.
  useEffect(() => {
    if (!didHydrate.current) return;
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Hydration effect: restores cart from sessionStorage on mount.
  // Sets didHydrate so subsequent item changes write back normally.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {}
    didHydrate.current = true;
  }, []);

  const addItem = useCallback((product: Product, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { product, quantity: qty }];
    });
    setOpen(true);
    appendCartSignal(product);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId);
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
