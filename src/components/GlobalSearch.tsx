import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, User, FileText, ArrowRight, Settings, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../stores/useInventory';
import { useCustomers } from '../stores/useCustomers';
import { useSales } from '../stores/useSales';
import { formatCurrency } from '../utils';

export const GlobalSearch = ({ onClose }: { onClose?: () => void }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { products } = useInventory();
  const { customers } = useCustomers();
  const { sales } = useSales();

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const results = React.useMemo(() => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    
    const matchedProducts = (products || [])
      .filter(p => (p.name || '').toLowerCase().includes(lowerQuery) || (p.serialNo || '').toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(p => ({ type: 'PRODUCT', label: p.name, sub: `${formatCurrency(p.sellPrice || 0)} | Stock: ${p.stock}`, id: p.id, icon: Package }));

    const matchedCustomers = (customers || [])
      .filter(c => (c.name || '').toLowerCase().includes(lowerQuery) || (c.phone || '').includes(lowerQuery))
      .slice(0, 3)
      .map(c => ({ type: 'CUSTOMER', label: c.name, sub: c.phone, id: c.id, icon: User }));

    const matchedSales = (sales || [])
      .filter(s => (s.invoiceNo || '').toLowerCase().includes(lowerQuery) || (s.customerName && s.customerName.toLowerCase().includes(lowerQuery)))
      .slice(0, 3)
      .map(s => ({ type: 'SALE', label: `Invoice #${s.invoiceNo || 'N/A'}`, sub: `${formatCurrency(s.totalAmount || 0)} - ${s.customerName || 'Walk-in'}`, id: s.id, icon: FileText }));

    const nav = [
      { label: 'Go to Inventory', path: '/inventory', type: 'NAV', icon: ArrowRight },
      { label: 'Go to Billing', path: '/billing', type: 'NAV', icon: ArrowRight },
      { label: 'Go to Invoices', path: '/invoices', type: 'NAV', icon: ArrowRight },
      { label: 'Go to Suppliers', path: '/suppliers', type: 'NAV', icon: ArrowRight },
      { label: 'Go to Accounting', path: '/accounting', type: 'NAV', icon: ArrowRight },
      { label: 'Go to Reports', path: '/reports', type: 'NAV', icon: ArrowRight },
      { label: 'Settings', path: '/settings', type: 'NAV', icon: Settings },
    ].filter(n => n.label.toLowerCase().includes(lowerQuery));

    return [...matchedProducts, ...matchedCustomers, ...matchedSales, ...nav];
  }, [query, products, customers, sales]);

  const handleSelect = (item: any) => {
    if (item.type === 'NAV') {
      navigate(item.path);
    } else if (item.type === 'PRODUCT') {
      // For now, go to inventory and filter (could be enhanced to open detail modal)
      navigate('/inventory');
    } else if (item.type === 'CUSTOMER') {
      navigate('/customers');
    }
    if (onClose) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setActiveIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (results[activeIndex]) handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      if (onClose) onClose();
    }
  };

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col max-h-[500px]">
      <div className="flex items-center p-4 border-b border-slate-100">
        <Search className="w-5 h-5 text-slate-400 mr-3" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Products, Customers, Bills..."
          className="flex-1 text-lg outline-none text-slate-700 placeholder:text-slate-300"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">ESC to close</span>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2">
        {results.length === 0 && query && (
          <div className="text-center py-8 text-slate-400">
            No results found.
          </div>
        )}
        {results.map((item, index) => (
          <div
            key={`${item.type}-${item.id || item.label}`}
            onClick={() => handleSelect(item)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${index === activeIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === activeIndex ? 'bg-blue-200/50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium text-sm">{item.label}</div>
              {item.sub && <div className="text-xs opacity-70">{item.sub}</div>}
            </div>
            {index === activeIndex && <ArrowRight className="w-4 h-4 ml-auto opacity-50" />}
          </div>
        ))}
        {!query && (
           <div className="p-4 text-center text-slate-400 text-sm">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>Type to search across your entire shop database.</p>
           </div>
        )}
      </div>
    </div>
  );
};
