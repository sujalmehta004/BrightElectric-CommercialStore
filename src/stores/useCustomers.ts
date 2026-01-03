import { create } from 'zustand';
import type { Customer } from '../types';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateCustomerPurchase: (id: string, amount: number) => Promise<void>;
}

const API_URL = 'http://localhost:3000/customers';

export const useCustomers = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      set({ customers: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addCustomer: async (customer) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      if (!response.ok) throw new Error('Failed to add customer');
      // Re-fetch or manually update state (optimistic or pessimistic)
      // Here we just append to state for speed
      const newCustomer = await response.json();
      set((state) => ({ customers: [...state.customers, newCustomer] }));
    } catch (error) {
      console.error('Add customer error:', error);
    }
  },

  updateCustomer: async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update customer');
      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    } catch (error) {
      console.error('Update customer error:', error);
    }
  },

  deleteCustomer: async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Delete customer error:', error);
    }
  },

  updateCustomerPurchase: async (id, amount) => {
    const customer = get().customers.find((c) => c.id === id);
    if (!customer) return;

    const updates = {
      totalPurchases: customer.totalPurchases + amount,
      visitCount: (customer.visitCount || 0) + 1,
      loyaltyPoints: (customer.loyaltyPoints || 0) + Math.floor(amount / 100),
      lastVisit: new Date().toISOString(),
    };

    await get().updateCustomer(id, updates);
  },
}));
