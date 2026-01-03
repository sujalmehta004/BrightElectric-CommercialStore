import { create } from 'zustand';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  VATIn?: string;
  address?: string;
  category?: string;
  website?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  billNumber?: string;
  billDate?: string;
  items: { 
    productId?: string;
    name: string; 
    quantity: number; 
    buyPrice: number; 
    total: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL' | 'SETTLED';
  payments: {
    id: string;
    amount: number;
    date: string;
    method: 'CASH' | 'BANK' | 'WALLET' | 'OTHER';
    description: string;
  }[];
  notes?: string;
  arrivalDate?: string;
  isReceived: boolean;
  receivedAt?: string;
  createdAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: 'BILL' | 'PAYMENT' | 'SETTLEMENT' | 'DISCOUNT_CREDIT';
  amount: number;
  method?: 'CASH' | 'BANK' | 'WALLET' | 'OTHER';
  referenceId?: string; // Bill ID
  description: string;
  date: string;
  balanceAfter: number;
}

interface SupplierState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  transactions: SupplierTransaction[];
  isLoading: boolean;
  error: string | null;
  fetchSuppliersData: () => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addPurchaseOrder: (order: PurchaseOrder) => Promise<void>;
  addTransaction: (transaction: SupplierTransaction) => Promise<void>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  receiveOrder: (id: string, receivedAt: string) => Promise<void>;
}

const API_BASE = 'http://localhost:3000';

export const useSuppliers = create<SupplierState>((set) => ({
  suppliers: [],
  purchaseOrders: [],
  transactions: [],
  isLoading: false,
  error: null,

  fetchSuppliersData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [suppliersRes, ordersRes, transactionsRes] = await Promise.all([
        fetch(`${API_BASE}/suppliers`),
        fetch(`${API_BASE}/purchaseOrders`),
        fetch(`${API_BASE}/transactions`)
      ]);

      if (!suppliersRes.ok || !ordersRes.ok || !transactionsRes.ok) 
        throw new Error('Failed to fetch supplier data');

      const suppliers = await suppliersRes.json();
      const purchaseOrders = await ordersRes.json();
      const transactions = await transactionsRes.json();

      set({ suppliers, purchaseOrders, transactions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSupplier: async (supplier) => {
    try {
      const response = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier),
      });
      if (!response.ok) throw new Error('Failed to add supplier');
      const newSupplier = await response.json();
      set((state) => ({ suppliers: [...state.suppliers, newSupplier] }));
    } catch (error) { console.error(error); }
  },

  updateSupplier: async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update supplier');
      set((state) => ({
        suppliers: state.suppliers.map((s) => s.id === id ? { ...s, ...updates } : s)
      }));
    } catch (error) { console.error(error); }
  },

  deleteSupplier: async (id) => {
    try {
      await fetch(`${API_BASE}/suppliers/${id}`, { method: 'DELETE' });
      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== id)
      }));
    } catch (error) { console.error(error); }
  },

  addPurchaseOrder: async (order) => {
    try {
      const response = await fetch(`${API_BASE}/purchaseOrders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!response.ok) throw new Error('Failed to add purchase order');
      const newOrder = await response.json();
      set((state) => ({ purchaseOrders: [newOrder, ...state.purchaseOrders] }));
    } catch (error) { console.error(error); }
  },

  addTransaction: async (transaction) => {
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!response.ok) throw new Error('Failed to add transaction');
      const newTransaction = await response.json();
      set((state) => ({ transactions: [newTransaction, ...state.transactions] }));
    } catch (error) { console.error(error); }
  },

  updatePurchaseOrder: async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/purchaseOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update purchase order');
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((po) => po.id === id ? { ...po, ...updates } : po)
      }));
    } catch (error) { console.error(error); }
  },

  receiveOrder: async (id, receivedAt) => {
    try {
      const updates = { isReceived: true, receivedAt, status: 'RECEIVED' };
      const response = await fetch(`${API_BASE}/purchaseOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to receive order');
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((po) => 
          po.id === id ? { ...po, ...updates } : po
        )
      }));
    } catch (error) { console.error(error); }
  },
}));
