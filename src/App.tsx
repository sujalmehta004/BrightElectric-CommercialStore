import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CompactLayout } from './layouts/CompactLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Repairs from './pages/Repairs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Accounting from './pages/Accounting';
import Suppliers from './pages/Suppliers';
import Invoices from './pages/Invoices';
import UsersPage from './pages/Users';
import { useAuth } from './stores/useAuth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

import { useEffect } from 'react';
import { useInventory } from './stores/useInventory';
import { useSales } from './stores/useSales';
import { useCustomers } from './stores/useCustomers';
import { useSuppliers } from './stores/useSuppliers';
import { useRepairs } from './stores/useRepairs';
import { useExpenses } from './stores/useExpenses';
import { useShopSettings } from './stores/useShopSettings';
import { GlobalModalProvider } from './components/GlobalModal';

function App() {
  const { fetchProducts } = useInventory();
  const { fetchSales } = useSales();
  const { fetchCustomers } = useCustomers();
  const { fetchSuppliersData } = useSuppliers();
  const { fetchJobs } = useRepairs();
  const { fetchExpenses } = useExpenses();
  const { fetchDetails } = useShopSettings();

  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchCustomers();
    fetchSuppliersData();
    fetchJobs();
    fetchExpenses();
    fetchDetails();
  }, []);

  return (
    <GlobalModalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><CompactLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="billing" element={<Billing />} />
            <Route path="customers" element={<Customers />} />
            <Route path="repairs" element={<Repairs />} />
            <Route path="accounting" element={<Accounting />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GlobalModalProvider>
  );
}

export default App;
