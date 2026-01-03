import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, FileBarChart, Users, Settings, Wrench, 
  Menu, X, Search, Bell, Monitor, Truck, DollarSign, FileText, LogOut, ChevronDown, UserCircle,
  Maximize, Minimize
} from 'lucide-react';
import { cn } from '../utils';
import { GlobalSearch } from '../components/GlobalSearch';
import { useAuth } from '../stores/useAuth';
import { useShopSettings } from '../stores/useShopSettings';
import { useInventory } from '../stores/useInventory';
import { useSuppliers } from '../stores/useSuppliers';

export const CompactLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { details } = useShopSettings();
  const { products } = useInventory();
  const { purchaseOrders } = useSuppliers();

  // Notification Logic: Low Stock
  const lowStockProducts = products.filter(p => p.stock < 5);
  
  // Arrival Logic - Show ALL pending arrivals (today + upcoming + overdue)
  const pendingArrivals = purchaseOrders.filter(po => !po.isReceived).sort((a, b) => {
    const dateA = new Date(a.arrivalDate || '').getTime();
    const dateB = new Date(b.arrivalDate || '').getTime();
    return dateA - dateB; // Sort by arrival date (earliest first)
  });

  const menuGroups = [
    {
      title: 'CORE',
      links: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/billing', icon: ShoppingCart, label: 'POS / Billing' },
      ]
    },
    {
      title: 'INVENTORY',
      links: [
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/repairs', icon: Wrench, label: 'Repairs' },
      ]
    },
    {
      title: 'PARTNERS',
      links: [
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/suppliers', icon: Truck, label: 'Suppliers' },
      ]
    },
    {
      title: 'FINANCE',
      links: [
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        { to: '/accounting', icon: DollarSign, label: 'Accounting' },
        { to: '/reports', icon: FileBarChart, label: 'Reports' },
      ]
    },
    {
      title: 'SYSTEM',
      links: [
        { to: '/users', icon: UserCircle, label: 'Users & Staff' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  // Logic to filter groups and links based on permissions
  const filteredGroups = menuGroups.map(group => ({
    ...group,
    links: group.links.filter(link => {
       if (!user) return false;
       const perms = user.permissions || [];
       if (perms.includes('*')) return true;
       return perms.includes(link.to);
    })
  })).filter(group => group.links.length > 0);

  React.useLayoutEffect(() => {
    document.documentElement.style.fontSize = `${details.uiScale || 14}px`;
  }, [details.uiScale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    for (const group of menuGroups) {
        const active = group.links.find(l => l.to === path);
        if (active) return active.label;
    }
    return details.storeName || 'ElectroPOS';
  };

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  return (
    <div className="flex h-screen bg-neutral-100 text-slate-800 font-sans overflow-hidden text-sm relative">
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
           <GlobalSearch onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 transition-all duration-300",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className="h-14 flex items-center px-4 border-b border-slate-800 shrink-0 bg-slate-950/50">
          <div className="flex items-center justify-center w-6 h-6 shrink-0">
            {details.logo ? (
              <img src={details.logo} alt="Logo" className="w-full h-full object-contain rounded" />
            ) : (
              <Monitor className="w-5 h-5 text-blue-400" />
            )}
          </div>
          {!collapsed && (
            <span className="font-bold text-white ml-3 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis uppercase text-[11px]">
              {details.storeName || 'ElectroPOS'}
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {filteredGroups.map((group, gIdx) => (
            <div key={group.title} className={cn("mb-6", gIdx !== 0 && "pt-2 border-t border-slate-800/50")}>
               {!collapsed && (
                 <p className="px-5 mb-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase">{group.title}</p>
               )}
               <div className="space-y-0.5 px-2">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={collapsed ? link.label : ''}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center h-10 px-3 rounded-lg transition-all duration-200 group relative",
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "hover:bg-slate-800/50 hover:text-white text-slate-400"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <link.icon className={cn("w-5 h-5 shrink-0 transition-transform", collapsed ? "mx-auto" : "mr-3 group-hover:scale-110")} />
                        {!collapsed && (
                          <span className="font-medium text-[13px] truncate">{link.label}</span>
                        )}
                        {isActive && !collapsed && (
                            <div className="absolute right-2 w-1 h-1 bg-white rounded-full" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
               </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/20">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center h-9 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 sticky top-0">
          <h1 className="font-bold text-slate-700 text-lg sm:text-base">{getPageTitle()}</h1>
          
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block w-64" onClick={() => setSearchOpen(true)}>
               <input 
                  readOnly 
                  type="text" 
                  placeholder="Quick Search (Ctrl+K)..." 
                  className="w-full h-8 pl-8 pr-3 bg-slate-100 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
               />
               <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
             </div>

             <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-8">
               {/* Full Screen Toggle */}
               <button 
                  onClick={toggleFullScreen}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                  title="Toggle Full Screen"
               >
                 {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
               </button>

               {/* Notifications */}
               <div className="relative">
                 <button 
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className={cn(
                        "p-1.5 hover:bg-slate-100 rounded-full transition-colors relative",
                        notificationOpen && "bg-slate-100"
                    )}
                >
                   <Bell className="w-4 h-4 text-slate-600" />
                   {lowStockProducts.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>}
                   {pendingArrivals.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] font-black border border-white">{pendingArrivals.length}</span>}
                 </button>

                 {notificationOpen && (
                     <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                         <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="font-bold text-slate-700 text-xs uppercase tracking-widest">Command Notifications</span>
                            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-black">{lowStockProducts.length + pendingArrivals.length}</span>
                         </div>
                         <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {pendingArrivals.length > 0 && pendingArrivals.map(po => {
                                const isLate = new Date(po.arrivalDate || '') < new Date(new Date().setHours(0,0,0,0));
                                return (
                                 <div key={po.id} onClick={() => { setNotificationOpen(false); navigate('/suppliers'); }}
                                    className="px-4 py-4 hover:bg-blue-50/50 border-b border-slate-50 transition-all cursor-pointer group">
                                    <div className="flex items-start gap-4">
                                        <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", isLate ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600")}>
                                           <Truck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                               {isLate ? 'OVERDUE SHIPMENT' : 'ARRIVAL EXPECTED TODAY'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-bold mt-0.5 leading-snug">
                                               Bill #{po.billNumber} from {po.supplierName}
                                            </p>
                                            <p className="text-[9px] font-black text-blue-600 uppercase mt-1">Check Arrivals Tab →</p>
                                        </div>
                                    </div>
                                 </div>
                                );
                            })}
                            
                            {lowStockProducts.length > 0 && lowStockProducts.map(p => (
                                <div key={p.id} className="px-4 py-4 hover:bg-orange-50/50 border-b border-slate-50 last:border-0 transition-all cursor-pointer"
                                     onClick={() => { setNotificationOpen(false); navigate('/inventory'); }}>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0"><Package className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">STOCK INTEGRITY ALERT</p>
                                            <p className="text-[11px] text-slate-500 font-bold mt-0.5 leading-snug">{p.name} is critically low ({p.stock} units left)</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {lowStockProducts.length === 0 && pendingArrivals.length === 0 && (
                                <div className="py-12 text-center">
                                   <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <Bell className="w-6 h-6 text-slate-200" />
                                   </div>
                                   <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">System Status: Clear</p>
                                </div>
                            )}
                         </div>
                     </div>
                 )}
               </div>

               {/* User Menu */}
               <div className="relative border-l border-slate-100 pl-2">
                 <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded transition-colors group"
                >
                    <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ring-1 ring-blue-100">
                        {(user?.username || 'AD').slice(0,2).toUpperCase()}
                    </div>
                    <div className="hidden lg:block text-left">
                        <p className="text-[11px] font-bold text-slate-800 leading-none">{user?.name || 'Admin User'}</p>
                        <p className="text-[9px] text-slate-400 leading-none mt-0.5">{user?.role || 'ADMIN'}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                 </button>

                 {userMenuOpen && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                         <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/30">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Logged in as</p>
                            <p className="text-xs font-bold text-blue-600">{user?.username}</p>
                         </div>
                         <button className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                             <Settings className="w-3.5 h-3.5" /> Profile Settings
                         </button>
                         <button 
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600 font-bold"
                         >
                             <LogOut className="w-3.5 h-3.5" /> Logout Session
                         </button>
                     </div>
                 )}
               </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 bg-slate-50 relative">
           <Outlet />
        </main>
      </div>
    </div>
  );
};
