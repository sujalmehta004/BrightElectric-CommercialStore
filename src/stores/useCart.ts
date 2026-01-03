import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  addToCart: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    }),
  removeFromCart: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === productId ? { ...i, quantity: Math.max(0, quantity) } : i
      ),
    })),
  clearCart: () => set({ items: [] }),
  total: () =>
    get().items.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0),
}));
