import { create } from 'zustand';
import type { Product } from '../types';

interface InventoryState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  decreaseStock: (id: string, amount: number) => Promise<void>;
  handleStockArrival: (items: { productId?: string; name: string; quantity: number; buyPrice: number }[]) => Promise<void>;
}

const API_URL = 'http://localhost:3000/products';

export const useInventory = create<InventoryState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      set({ products: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addProduct: async (product) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!response.ok) throw new Error('Failed to add product');
      const newProduct = await response.json();
      set((state) => ({ products: [newProduct, ...state.products] }));
    } catch (error) {
      console.error('Add product error:', error);
    }
  },

  updateProduct: async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update product');
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    } catch (error) {
      console.error('Update product error:', error);
    }
  },

  deleteProduct: async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error('Delete product error:', error);
    }
  },

  decreaseStock: async (id, amount) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;

    const newStock = Math.max(0, product.stock - amount);
    await get().updateProduct(id, { stock: newStock });
  },

  handleStockArrival: async (items) => {
    // We need to process items one by one or in parallel
    // Ideally, we fetch the latest state first or rely on local state
    // Let's rely on local state to find existing products, but perform API calls
    const currentProducts = get().products;
    const promises = items.map(async (item) => {
        if (item.productId) {
            const existing = currentProducts.find(p => p.id === item.productId);
            if (existing) {
                if (existing.buyPrice === item.buyPrice) {
                    // Update stock
                    await get().updateProduct(existing.id, { stock: existing.stock + item.quantity });
                } else {
                    // Create new batch
                    const newBatch = {
                        ...existing,
                        id: crypto.randomUUID(),
                        buyPrice: item.buyPrice,
                        stock: item.quantity,
                        createdAt: new Date().toISOString()
                    };
                    await get().addProduct(newBatch);
                }
            }
        }
    });

    await Promise.all(promises);
    // Finally refresh to be sure? Or local updates in helper methods cover it.
    // get().fetchProducts(); // Optional, but safer.
  }
}));
