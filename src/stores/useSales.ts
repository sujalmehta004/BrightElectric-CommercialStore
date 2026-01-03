import { create } from 'zustand';
import type { Sale } from '../types';

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  fetchSales: () => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  addPayment: (saleId: string, payment: any) => Promise<void>;
}

const API_URL = 'http://localhost:3000/sales';

export const useSales = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,
  error: null,

  fetchSales: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      set({ sales: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSale: async (sale) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sale, payments: sale.payments || [] }),
      });
      if (!response.ok) throw new Error('Failed to add sale');
      const newSale = await response.json();
      set((state) => ({ sales: [newSale, ...state.sales] }));
    } catch (error) {
      console.error('Add sale error:', error);
    }
  },

  updateSale: async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update sale');
      set((state) => ({
        sales: state.sales.map((s) => s.id === id ? { ...s, ...updates } : s)
      }));
    } catch (error) {
      console.error('Update sale error:', error);
    }
  },

  addPayment: async (saleId, payment) => {
    const sale = get().sales.find((s) => s.id === saleId);
    if (!sale) return;

    const updatedPayments = [...(sale.payments || []), payment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = Math.max(0, sale.totalAmount - totalPaid);
    
    const updates = {
      payments: updatedPayments,
      paidAmount: totalPaid,
      dueAmount: dueAmount,
      paymentStatus: dueAmount <= 0 ? 'PAID' : 'PARTIAL'
    };

    // Cast string to PaymentStatus for TS matching if needed, though simpler here
    await get().updateSale(saleId, updates as any);
  }
}));
