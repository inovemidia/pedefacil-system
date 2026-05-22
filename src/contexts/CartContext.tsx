import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { CartItem, CartExtra, Product, Coupon } from '../types';

const STORAGE_KEY = 'japanara_cart';

interface PersistedCart {
  items: CartItem[];
  coupon: Coupon | null;
}

function loadFromStorage(): PersistedCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], coupon: null };
    return JSON.parse(raw) as PersistedCart;
  } catch {
    return { items: [], coupon: null };
  }
}

function saveToStorage(items: CartItem[], coupon: Coupon | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon }));
  } catch { /* ignore */ }
}

interface CartContextType {
  items: CartItem[];
  coupon: Coupon | null;
  addItem: (product: Product, extras: CartExtra[], notes: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  total: (deliveryFee: number) => number;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const persisted = loadFromStorage();
  const [items, setItems] = useState<CartItem[]>(persisted.items);
  const [coupon, setCoupon] = useState<Coupon | null>(persisted.coupon);
  const [isOpen, setIsOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(items, coupon);
  }, [items, coupon]);

  const addItem = useCallback((product: Product, extras: CartExtra[], notes: string) => {
    const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
    const itemTotal = (product.price + extrasTotal) * 1;

    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id &&
        JSON.stringify(item.extras) === JSON.stringify(extras) &&
        item.notes === notes
      );

      if (existingIndex >= 0) {
        return prev.map((item, i) =>
          i === existingIndex
            ? { ...item, quantity: item.quantity + 1, itemTotal: (item.quantity + 1) * (product.price + extrasTotal) }
            : item
        );
      }

      return [...prev, {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity: 1,
        extras,
        notes,
        itemTotal,
      }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const extrasTotal = item.extras.reduce((sum, e) => sum + e.price, 0);
      return { ...item, quantity, itemTotal: quantity * (item.product.price + extrasTotal) };
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  const applyCoupon = useCallback((c: Coupon) => setCoupon(c), []);
  const removeCoupon = useCallback(() => setCoupon(null), []);

  const subtotal = items.reduce((sum, item) => {
    const v = item && isFinite(item.itemTotal) ? item.itemTotal : 0;
    return sum + v;
  }, 0);

  const discount = coupon
    ? coupon.type === 'percentage'
      ? subtotal * (isFinite(coupon.value) ? coupon.value / 100 : 0)
      : coupon.type === 'fixed'
      ? Math.min(isFinite(coupon.value) ? coupon.value : 0, subtotal)
      : 0
    : 0;

  const total = (deliveryFee: number) => {
    const freeDelivery = coupon?.type === 'free_delivery';
    const fee = isFinite(deliveryFee) ? deliveryFee : 0;
    const result = subtotal - discount + (freeDelivery ? 0 : fee);
    return isFinite(result) ? result : 0;
  };

  const itemCount = items.reduce((sum, item) => {
    const q = item && typeof item.quantity === 'number' && isFinite(item.quantity) ? item.quantity : 0;
    return sum + q;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, coupon, addItem, removeItem, updateQuantity, clearCart,
      applyCoupon, removeCoupon, subtotal, discount, total, itemCount,
      isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
