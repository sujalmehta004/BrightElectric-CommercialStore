import { create } from 'zustand';

export interface DashboardPreferences {
  showTodayStats: boolean;
  showPeriodicStats: boolean;
  showRecentInvoices: boolean;
  showInventoryWorth: boolean;
  showLogistics: boolean;
  showLowStock: boolean;
}

export interface ShopDetails {
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  VATIn: string;
  logo: string; // Base64 or URL
  headerText: string;
  footerText: string;
  uiScale?: number;
  dashboardPreferences?: DashboardPreferences;
}

interface ShopSettingsState {
  details: ShopDetails;
  isLoading: boolean;
  error: string | null;
  fetchDetails: () => Promise<void>;
  updateDetails: (details: Partial<ShopDetails>) => Promise<void>;
}

const API_URL = 'http://localhost:3000/settings';

const defaultDashboardPrefs: DashboardPreferences = {
  showTodayStats: true,
  showPeriodicStats: true,
  showRecentInvoices: true,
  showInventoryWorth: true,
  showLogistics: true,
  showLowStock: true,
};

const defaultSettings: ShopDetails = {
  storeName: 'My Electronics Shop',
  addressLine1: 'Main Market, City Center',
  addressLine2: 'Kathmandu, Nepal',
  phone: '+977-9800000000',
  email: 'contact@shop.com',
  website: '',
  VATIn: '',
  logo: '',
  headerText: 'Tax Invoice',
  footerText: 'Thank you for your business!',
  uiScale: 14,
  dashboardPreferences: defaultDashboardPrefs,
};

export const useShopSettings = create<ShopSettingsState>((set) => ({
  details: defaultSettings,
  isLoading: false,
  error: null,

  fetchDetails: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      // If db.json is fresh/empty, it might return empty object, handle merge
      set({ 
        details: { 
            ...defaultSettings, 
            ...data,
            dashboardPreferences: { ...defaultDashboardPrefs, ...(data.dashboardPreferences || {}) }
        }, 
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateDetails: async (newDetails) => {
    try {
      // We use PATCH because 'settings' is an object resource in json-server
      const response = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDetails),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      // The response contains the merged object
      const updated = await response.json();
      set((state) => ({
        details: { 
            ...state.details, 
            ...updated,
            dashboardPreferences: { ...state.details.dashboardPreferences, ...(updated.dashboardPreferences || {}) }
        },
      }));
    } catch (error) {
      console.error('Update settings error:', error);
    }
  },
}));
