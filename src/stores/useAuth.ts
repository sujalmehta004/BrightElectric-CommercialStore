import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'TECHNICIAN' | 'STAFF';
  permissions: string[]; // List of allowed paths (e.g. ['/inventory', '/billing'])
  createdAt: string;
}

interface AuthState {
  user: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  deleteUser: (id: string) => void;
  updateUserPermissions: (id: string, permissions: string[]) => void;
}

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  username: 'ADMIN',
  password: 'RAJU@12345#',
  name: 'System Admin',
  role: 'ADMIN',
  permissions: ['*', '/dashboard', '/billing', '/inventory', '/repairs', '/customers', '/suppliers', '/invoices', '/accounting', '/reports', '/settings', '/users'],
  createdAt: new Date().toISOString(),
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [DEFAULT_ADMIN],
      login: (username, password) => {
        const user = get().users.find((u) => u.username === username && u.password === password);
        if (user) {
          set({ user });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      deleteUser: (id) => set((state) => ({ users: state.users.filter(u => u.id !== id) })),
      updateUserPermissions: (id, permissions) => 
        set((state) => ({
          users: state.users.map(u => u.id === id ? { ...u, permissions } : u),
          // Also update current session if it's the same user
          user: state.user?.id === id ? { ...state.user, permissions } : state.user
        })),
    }),
    {
      name: 'auth-v2-storage',
    }
  )
);
