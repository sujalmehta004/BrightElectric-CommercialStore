import { useState } from 'react';
import { 
  ShoppingBag, TrendingUp, Calendar, 
  Clock, Printer, Download, ArrowUpRight, History, Settings2
} from 'lucide-react';
import { useInventory } from '../stores/useInventory';
import { useSales } from '../stores/useSales';
import { useSuppliers } from '../stores/useSuppliers';
import { useShopSettings } from '../stores/useShopSettings';
import { Truck, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { 
  isToday, isThisWeek, isThisMonth, isThisYear, parseISO
} from 'date-fns';
import { Modal } from '../components/Modal';
import type { Sale } from '../types';

const Dashboard = () => {
  const { products } = useInventory();
  const { sales } = useSales();
  const { purchaseOrders } = useSuppliers();
  const { details, updateDetails } = useShopSettings();
  
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);

  // Use preferences from store, default to all true if not loaded yet
  const prefs = details.dashboardPreferences || {
      showTodayStats: true,
      showPeriodicStats: true,
      showRecentInvoices: true,
      showInventoryWorth: true,
      showLogistics: true,
      showLowStock: true,
  };

  const togglePref = (key: keyof typeof prefs) => {
      updateDetails({
          dashboardPreferences: {
              ...prefs,
              [key]: !prefs[key]
          }
      });
  };

  // Arrival Logic
  const pendingArrivals = purchaseOrders.filter(po => !po.isReceived).sort((a, b) => {
    const dateA = new Date(a.arrivalDate || '').getTime();
    const dateB = new Date(b.arrivalDate || '').getTime();
    return dateA - dateB;
  });

  // Stats logic
  const getStatsForPeriod = (periodFn: (date: Date) => boolean) => {
    const periodSales = sales.filter(s => periodFn(parseISO(s.createdAt)));
    const revenue = periodSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const profit = periodSales.reduce((acc, s) => acc + (s.profit || 0), 0);
    const productsSoldCount = periodSales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    const count = periodSales.length;
    // Flatten all items from all sales in this period
    const allItems = periodSales.flatMap(s => s.items.map(i => ({...i, customerName: s.customerName, saleDate: s.createdAt})));
    return { revenue, profit, count, productsSoldCount, itemsList: allItems };
  };

  const todayStats = getStatsForPeriod(isToday);
  const weekStats = getStatsForPeriod(isThisWeek);
  const monthStats = getStatsForPeriod(isThisMonth);
  const yearStats = getStatsForPeriod(isThisYear);

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.buyPrice * p.stock), 0);
  const lowStockItems = products.filter(p => p.stock < 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Business Dashboard</h2>
          <p className="text-slate-500 text-xs mt-0.5">Summary of your shop's performance</p>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowCustomize(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
             >
                 <Settings2 className="w-4 h-4" /> Customize
             </button>
             <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-slate-600">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
             </div>
        </div>
      </div>

      {/* ROW 1: TODAY'S PERFORMANCE */}
      {prefs.showTodayStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-40">
              <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                 <div className="p-1 px-2 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Today</div>
                 <span className="font-bold text-slate-700 text-xs uppercase tracking-tight">Revenue</span>
              </div>
              <div className="p-5 flex flex-col justify-center flex-1">
                 <h3 className="text-2xl font-bold text-slate-900 leading-none">{formatCurrency(todayStats.revenue)}</h3>
                 <p className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{todayStats.count} Completed Invoices</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-40">
              <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                 <div className="p-1 px-2 bg-emerald-100 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Today</div>
                 <span className="font-bold text-slate-700 text-xs uppercase tracking-tight">Net Profit</span>
              </div>
              <div className="p-5 flex flex-col justify-center flex-1">
                 <h3 className="text-2xl font-bold text-emerald-600 leading-none">{formatCurrency(todayStats.profit)}</h3>
                 <p className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{todayStats.productsSoldCount} Products Sold</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-40 p-4 items-center justify-center text-center">
                 <h3 className="font-bold text-slate-800 mb-1">Products Sold Today</h3>
                 <p className="text-xs text-slate-400 mb-4">{todayStats.itemsList.length} Items</p>
                 <button 
                    onClick={() => setShowSoldModal(true)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                 >
                     View List & Profit
                 </button>
            </div>
          </div>
      )}

      {/* ROW 2: PERIODIC PERFORMANCE */}
      {prefs.showPeriodicStats && (
          <>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] pt-2">Periodic Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Weekly Performance', stats: weekStats, color: 'text-indigo-600' },
                   { label: 'Monthly Performance', stats: monthStats, color: 'text-violet-600' },
                   { label: 'Yearly Performance', stats: yearStats, color: 'text-purple-600' },
                 ].map((p) => (
                   <div key={p.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.label}</h4>
                         <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-medium text-slate-400 uppercase leading-none mb-1">Revenue</p>
                                <p className="text-lg font-bold text-slate-800 leading-none">{formatCurrency(p.stats.revenue)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-medium text-slate-400 uppercase leading-none mb-1">Net Profit</p>
                                <p className={cn("text-lg font-bold leading-none", p.color)}>{formatCurrency(p.stats.profit)}</p>
                            </div>
                         </div>
                         <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>{p.stats.count} Invoices</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span>{p.stats.productsSoldCount} Items Sold</span>
                         </div>
                      </div>
                   </div>
                 ))}
            </div>
          </>
      )}

      {/* ROW 3: RECENT INVOICES & CRITICAL ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Recent Invoices Container */}
        {prefs.showRecentInvoices && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Recent Invoices</h3>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Recently generated sales bills</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice / Date</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sales.length === 0 ? (
                       <tr>
                         <td colSpan={3} className="px-5 py-10 text-center text-slate-400 italic text-sm font-medium">No sales history found</td>
                       </tr>
                    ) : (
                      sales.slice(0, 8).map((sale) => (
                        <tr 
                          key={sale.id} 
                          onClick={() => setSelectedSale(sale)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                             <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-bold text-blue-600 uppercase">#{sale.invoiceNo}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{new Date(sale.createdAt).toLocaleDateString()}</span>
                             </div>
                          </td>
                          <td className="px-5 py-3.5">
                             <span className="font-semibold text-slate-700 text-xs block truncate max-w-[150px]">{sale.customerName}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{sale.paymentMethod} • {sale.paymentStatus}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-bold text-slate-900 text-xs">{formatCurrency(sale.totalAmount)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* Low Stock & Inventory Container */}
        <div className="space-y-6 lg:col-span-1 col-span-1">
           {prefs.showInventoryWorth && (
               <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 -mr-12 -mt-12 rounded-full" />
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Inventory Worth</p>
                    <h3 className="text-xl font-bold">{formatCurrency(totalInventoryValue)}</h3>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                     <ArrowUpRight className="w-3.5 h-3.5" />
                     <span>ACTIVE MONITORING</span>
                  </div>
               </div>
           )}

           {/* Logistics Alert Card */}
           {prefs.showLogistics && (
               <div className={cn("bg-white rounded-2xl border flex flex-col overflow-hidden transition-all", 
                  pendingArrivals.length > 0 ? "border-blue-200 shadow-blue-100/50 shadow-lg" : "border-slate-200 shadow-sm")}>
                  <div className={cn("p-4 border-b flex items-center justify-between", 
                     pendingArrivals.some(po => new Date(po.arrivalDate || '') < new Date(new Date().setHours(0,0,0,0))) 
                     ? "bg-rose-50 border-rose-100" : "bg-blue-50 border-blue-100")}>
                     <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 uppercase tracking-tight">
                        <Truck className={cn("w-4 h-4", pendingArrivals.length > 0 ? "text-blue-600 animate-bounce" : "text-slate-400")} />
                        Logistics Status
                     </h4>
                     {pendingArrivals.length > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                           {pendingArrivals.length} Pending
                        </span>
                     )}
                  </div>
                  <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                     {pendingArrivals.length === 0 ? (
                       <div className="py-12 text-center text-slate-400 text-[10px] italic">No shipments due for receipt</div>
                     ) : (
                       pendingArrivals.map(po => {
                          const isLate = new Date(po.arrivalDate || '') < new Date(new Date().setHours(0,0,0,0));
                          return (
                           <div key={po.id} className="p-3 hover:bg-slate-50 rounded-xl transition-all border-b border-slate-50 last:border-0 group">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-900 truncate uppercase">#{po.billNumber} • {po.supplierName}</p>
                                    <p className={cn("text-[9px] font-bold mt-0.5 uppercase tracking-widest", isLate ? "text-rose-600" : "text-blue-500")}>
                                       {isLate ? 'OVERDUE SINCE ' : 'EXPECTED '} 
                                       {new Date(po.arrivalDate || '').toLocaleDateString()}
                                    </p>
                                 </div>
                                 <AlertCircle className={cn("w-3.5 h-3.5", isLate ? "text-rose-500" : "text-blue-400")} />
                              </div>
                           </div>
                          );
                       })
                     )}
                  </div>
               </div>
           )}

           {prefs.showLowStock && (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                     <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 uppercase tracking-tight">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        Low Stock Alert
                     </h4>
                     <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {lowStockItems.length} Items
                     </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                     {lowStockItems.length === 0 ? (
                       <div className="text-center py-10 text-slate-400 text-[11px] italic">No stock alerts</div>
                     ) : (
                       lowStockItems.map(p => (
                        <div key={p.id} className="p-3.5 hover:bg-rose-50/20 transition-colors">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">{p.stock} units left</span>
                           </div>
                        </div>
                       ))
                     )}
                  </div>
               </div>
           )}
        </div>
      </div>

      {/* CUSTOMIZE DASHBOARD MODAL */}
      <Modal isOpen={showCustomize} onClose={() => setShowCustomize(false)} title="Customize Dashboard">
          <div className="space-y-4">
              <p className="text-sm text-slate-500">Select which widgets you want to see on your dashboard.</p>
              <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showTodayStats} onChange={() => togglePref('showTodayStats')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Today's Stats (Revenue, Profit, Sold List)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showPeriodicStats} onChange={() => togglePref('showPeriodicStats')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Periodic Stats (Weekly, Monthly, Yearly)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showRecentInvoices} onChange={() => togglePref('showRecentInvoices')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Recent Invoices Table</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showInventoryWorth} onChange={() => togglePref('showInventoryWorth')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Total Inventory Worth Widget</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showLogistics} onChange={() => togglePref('showLogistics')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Logistics/Arrivals Widget</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" checked={prefs.showLowStock} onChange={() => togglePref('showLowStock')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Low Stock Alerts</span>
                  </label>
              </div>
          </div>
      </Modal>

      {/* PRODUCTS SOLD TODAY MODAL */}
      <Modal isOpen={showSoldModal} onClose={() => setShowSoldModal(false)} title="Products Sold Today">
         <div className="max-h-[60vh] overflow-y-auto">
             <table className="w-full text-left">
                 <thead className="bg-slate-50 sticky top-0">
                     <tr>
                         <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Product</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Customer</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Profit</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {todayStats.itemsList.length > 0 ? todayStats.itemsList.map((item, idx) => {
                         const unitProfit = item.sellPrice - item.buyPrice;
                         const totalProfit = unitProfit * item.quantity;
                         return (
                             <tr key={idx} className="hover:bg-slate-50">
                                 <td className="px-4 py-3">
                                     <p className="text-xs font-bold text-slate-700">{item.name}</p>
                                     <p className="text-[10px] text-slate-400">{item.serialNo || 'N/A'}</p>
                                 </td>
                                 <td className="px-4 py-3">
                                     <p className="text-xs font-medium text-slate-600">{item.customerName || 'Walk-in'}</p>
                                     <p className="text-[10px] text-slate-400">{new Date(item.saleDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                 </td>
                                 <td className="px-4 py-3 text-right text-xs font-bold text-slate-800">
                                     {item.quantity}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     <p className="text-xs font-bold text-emerald-600">{formatCurrency(totalProfit)}</p>
                                     <p className="text-[10px] text-slate-400">({formatCurrency(unitProfit)}/ea)</p>
                                 </td>
                             </tr>
                         );
                     }) : (
                         <tr>
                             <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic text-xs">No items sold today yet.</td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </Modal>

      {/* Sale Details Modal */}
      {selectedSale && (
        <Modal 
          isOpen={!!selectedSale} 
          onClose={() => setSelectedSale(null)} 
          title={`Invoice ${selectedSale.invoiceNo}`}
        >
          <div className="space-y-6">
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-200">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                      <h4 className="font-bold text-slate-800 text-base">{selectedSale.customerName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{new Date(selectedSale.createdAt).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedSale.totalAmount)}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Item Breakdown</p>
                   {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                         <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{item.name}</span>
                            <span className="text-[10px] text-slate-400">{formatCurrency(item.sellPrice)} x {item.quantity}</span>
                         </div>
                         <span className="font-bold text-slate-900">{formatCurrency(item.sellPrice * item.quantity)}</span>
                      </div>
                   ))}
                </div>

                {/* Payment History Component */}
                <div className="pt-4 border-t mt-4">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <History className="w-3.5 h-3.5" /> Payment History
                   </h4>
                   <div className="space-y-2">
                      {selectedSale.payments && selectedSale.payments.length > 0 ? (
                         selectedSale.payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-200/50 shadow-sm">
                               <div>
                                  <p className="text-[10px] font-bold text-slate-700">{formatCurrency(p.amount)}</p>
                                  <p className="text-[9px] text-slate-500">{new Date(p.date).toLocaleDateString()} • {p.method}</p>
                               </div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{p.method}</span>
                            </div>
                         ))
                      ) : (
                         <p className="text-[10px] text-slate-400 italic font-medium">No payment history recorded</p>
                      )}
                   </div>
                </div>
             </div>

             <div className="flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white p-3.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 p-3.5 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-95">
                  <Download className="w-4 h-4" /> Export Receipt
                </button>
             </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
