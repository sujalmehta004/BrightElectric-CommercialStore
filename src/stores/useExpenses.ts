import { create } from 'zustand';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'RENT' | 'SALARY' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
  date: string;
  notes?: string;
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getTotalsByCategory: () => Record<string, number>;
}

const API_URL = 'http://localhost:3000/expenses';

export const useExpenses = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  error: null,

  fetchExpenses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      set({ expenses: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addExpense: async (expense) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
      if (!response.ok) throw new Error('Failed to add expense');
      const newExpense = await response.json();
      set((state) => ({ expenses: [newExpense, ...state.expenses] }));
    } catch (error) { console.error(error); }
  },

  deleteExpense: async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) }));
    } catch (error) { console.error(error); }
  },

  getTotalsByCategory: () => {
    return get().expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
  }
}));
