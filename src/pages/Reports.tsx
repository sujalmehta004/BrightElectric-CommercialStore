import { useMemo, useState } from 'react';
import { useSales } from '../stores/useSales';
import { useSuppliers } from '../stores/useSuppliers';
import { formatCurrency, cn } from '../utils';
import { format, subDays, isSameMonth, isSameYear, isSameDay, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Download, TrendingUp, DollarSign, Users, Wallet } from 'lucide-react';


type DateRangeType = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const Reports = () => {
  const { sales } = useSales();
  const { transactions: supplierTransactions, purchaseOrders } = useSuppliers();
  
  const [dateRange, setDateRange] = useState<DateRangeType>('WEEK');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');


  // Filter Sales
  const filteredSales = useMemo(() => {
    const today = new Date();
    return sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      if (dateRange === 'TODAY') {
        return isSameDay(saleDate, today);
      } else if (dateRange === 'WEEK') {
        return saleDate >= subDays(today, 7);
      } else if (dateRange === 'MONTH') {
        return isSameMonth(saleDate, today) && isSameYear(saleDate, today);
      } else if (dateRange === 'YEAR') {
        return isSameYear(saleDate, today);
      } else if (dateRange === 'CUSTOM' && customStart && customEnd) {
        return isWithinInterval(saleDate, { 
            start: startOfDay(parseISO(customStart)), 
            end: endOfDay(parseISO(customEnd)) 
        });
      }
      return false;
    });
  }, [sales, dateRange, customStart, customEnd]);

  // Filter Supplier Transactions
  const filteredSupplierTransactions = useMemo(() => {
    const today = new Date();
    return supplierTransactions.filter(t => {
      const tDate = new Date(t.date);
      if (dateRange === 'TODAY') {
        return isSameDay(tDate, today);
      } else if (dateRange === 'WEEK') {
        return tDate >= subDays(today, 7);
      } else if (dateRange === 'MONTH') {
        return isSameMonth(tDate, today) && isSameYear(tDate, today);
      } else if (dateRange === 'YEAR') {
        return isSameYear(tDate, today);
      } else if (dateRange === 'CUSTOM' && customStart && customEnd) {
        return isWithinInterval(tDate, { 
            start: startOfDay(parseISO(customStart)), 
            end: endOfDay(parseISO(customEnd)) 
        });
      }
      return false;
    });
  }, [supplierTransactions, dateRange, customStart, customEnd]);

  // Chart Data: Revenue Trend (Bar Chart)
  const barChartData = useMemo(() => {
    const data: any[] = [];
    if (dateRange === 'TODAY') {
        // Hourly buckets for today? Or just single bar? Let's do nothing or simple
        data.push({ name: 'Today', revenue: filteredSales.reduce((acc, s) => acc + s.totalAmount, 0), profit: filteredSales.reduce((acc, s) => acc + s.profit, 0) });
    } else if (dateRange === 'WEEK' || dateRange === 'CUSTOM') {
       // Daily groWALLETng
       const map = new Map();
       filteredSales.forEach(s => {
           const d = format(new Date(s.createdAt), 'MMM dd');
           if (!map.has(d)) map.set(d, { revenue: 0, profit: 0 });
           map.get(d).revenue += s.totalAmount;
           map.get(d).profit += s.profit;
       });
       // Fill missing days if standard week? kept simple for now
       map.forEach((val, key) => data.push({ name: key, ...val }));
       if(data.length === 0 && dateRange==='WEEK') {
           // Show empty days
           for(let i=6;i>=0;i--) {
               data.push({ name: format(subDays(new Date(), i), 'MMM dd'), revenue: 0, profit: 0 }); 
           }
       }
    } else if (dateRange === 'MONTH') {
        // Weekly or daily? Let's do daily
        const map = new Map();
        filteredSales.forEach(s => {
            const d = format(new Date(s.createdAt), 'dd');
            if(!map.has(d)) map.set(d, { revenue: 0, profit: 0 });
            map.get(d).revenue += s.totalAmount;
            map.get(d).profit += s.profit;
        });
        map.forEach((val, key) => data.push({ name: key, ...val }));
    } else if (dateRange === 'YEAR') {
        // Monthly
        for(let i=0; i<12; i++) {
            const monthName = format(new Date(2024, i, 1), 'MMM');
            const monthSales = filteredSales.filter(s => new Date(s.createdAt).getMonth() === i);
            data.push({
                name: monthName,
                revenue: monthSales.reduce((acc, s) => acc + s.totalAmount, 0),
                profit: monthSales.reduce((acc, s) => acc + s.profit, 0)
            });
        }
    }
    return data;
  }, [filteredSales, dateRange]);

  // Chart Data: Payment Methods (Pie Chart)
  const pieChartData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredSales.forEach(s => {
          map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.totalAmount;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  // Metrics
  const metrics = useMemo(() => {
      const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
      const customersUnpaid = sales.reduce((acc, s) => acc + s.dueAmount, 0); // Global unpaid
      const suppliersUnpaid = purchaseOrders.reduce((acc, p) => acc + p.dueAmount, 0); // Global due
      
      const supplierDebit = filteredSupplierTransactions
        .filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);

      return { totalRevenue, totalProfit, customersUnpaid, suppliersUnpaid, supplierDebit };
  }, [filteredSales, sales, purchaseOrders, filteredSupplierTransactions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Analytics & Reports</h2>
           <p className="text-slate-500 text-sm">Financial overview and transaction history</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             {/* Date Filter Buttons */}
            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as const).map(range => (
                    <button
                        key={range}
                        onClick={() => setDateRange(range)}
                        className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                            dateRange === range ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {range}
                    </button>
                ))}
            </div>

            {dateRange === 'CUSTOM' && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                    <input type="date" className="text-xs border-none focus:ring-0 p-1" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    <span className="text-slate-400">-</span>
                    <input type="date" className="text-xs border-none focus:ring-0 p-1" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
            )}
            
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
                <div>
                     <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Revenue</p>
                     <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.totalRevenue)}</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                </div>
            </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
                <div>
                     <p className="text-slate-500 text-xs font-bold uppercase mb-1">Net Profit</p>
                     <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalProfit)}</p>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
                <div>
                     <p className="text-slate-500 text-xs font-bold uppercase mb-1">Pending from Customers</p>
                     <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.customersUnpaid)}</p>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <Wallet className="w-5 h-5" />
                </div>
            </div>
             <p className="text-[10px] text-slate-400 mt-2">Total unpaid across all time</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
                <div>
                     <p className="text-slate-500 text-xs font-bold uppercase mb-1">Due to Suppliers</p>
                     <p className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.suppliersUnpaid)}</p>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Users className="w-5 h-5" />
                </div>
            </div>
             <p className="text-[10px] text-slate-400 mt-2">Total payable amount</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Bar Graph */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
              <h3 className="font-bold text-slate-800 mb-6">Revenue Overview</h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                        <RechartsTooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             cursor={{ fill: '#f8fafc' }}
                             formatter={(value: any) => formatCurrency(Number(value))}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Payment Methods Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
               <h3 className="font-bold text-slate-800 mb-6">Sales by Payment Mode</h3>
               <div className="h-[300px] w-full flex flex-col items-center justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                               data={pieChartData}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                           >
                               {pieChartData.map((_, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <RechartsTooltip formatter={(val: any) => formatCurrency(val)} />
                           <Legend />
                       </PieChart>
                   </ResponsiveContainer>
               </div>
          </div>
      </div>

       {/* Supplier Transactions Table */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Supplier Transactions Log</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {dateRange === 'CUSTOM' ? `${customStart} - ${customEnd}` : dateRange}
                </span>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Transaction Type</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredSupplierTransactions.length > 0 ? filteredSupplierTransactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                    {format(new Date(tx.date), 'MMM dd, yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4">
                                     <span className={cn(
                                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                        tx.type === 'PAYMENT' ? 'bg-red-50 text-red-600' : 
                                        tx.type === 'BILL' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100'
                                    )}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-700">{tx.description}</td>
                                <td className="px-6 py-4 text-right font-medium">
                                    {formatCurrency(tx.amount)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                    No supplier transactions found in this period
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>

    </div>
  );
};

export default Reports;
