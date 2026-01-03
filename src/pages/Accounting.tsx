import React, { useState } from 'react';
import { useExpenses } from '../stores/useExpenses';
import type { Expense } from '../stores/useExpenses';
import { useSales } from '../stores/useSales';
import { formatCurrency } from '../utils';
import { Plus, Trash2, PieChart, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../components/Modal';

const Accounting = () => {
  const { expenses, addExpense, deleteExpense, getTotalsByCategory } = useExpenses();
  const { sales } = useSales();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats
  const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses; // Simplified P&L
  const expenseBreakdown = getTotalsByCategory();

  const [formData, setFormData] = useState<Partial<Expense>>({
    title: '', amount: 0, category: 'OTHER', notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.title) return;
    
    addExpense({
      id: uuidv4(),
      title: formData.title,
      amount: Number(formData.amount),
      category: formData.category as any,
      date: new Date().toISOString(),
      notes: formData.notes
    });
    setIsModalOpen(false);
    setFormData({ title: '', amount: 0, category: 'OTHER', notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Accounting & Expenses</h2>
           <p className="text-slate-500 text-sm">Track cash flow and profit</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-red-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-green-600">
               <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
               <span className="font-bold">Total Income</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSales)}</p>
         </div>
         
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-red-600">
               <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-5 h-5"/></div>
               <span className="font-bold">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
         </div>

         <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2 text-blue-300">
               <div className="p-2 bg-slate-800 rounded-lg"><DollarSign className="w-5 h-5"/></div>
               <span className="font-bold">Net Profit</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(netProfit)}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-100 font-bold text-slate-800">Recent Expenses</div>
           <div className="overflow-y-auto max-h-[400px]">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500">
                 <tr>
                   <th className="px-6 py-3">Expense</th>
                   <th className="px-6 py-3">Category</th>
                   <th className="px-6 py-3">Date</th>
                   <th className="px-6 py-3 text-right">Amount</th>
                   <th className="px-6 py-3"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {expenses.map(exp => (
                   <tr key={exp.id} className="hover:bg-slate-50">
                     <td className="px-6 py-3 font-medium text-slate-800">{exp.title}</td>
                     <td className="px-6 py-3 text-xs uppercase text-slate-500 font-bold">{exp.category}</td>
                     <td className="px-6 py-3 text-slate-500 text-xs">{new Date(exp.date).toLocaleDateString()}</td>
                     <td className="px-6 py-3 text-right font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                     <td className="px-6 py-3 text-right">
                       <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             {expenses.length === 0 && <div className="p-8 text-center text-slate-400">No expenses recorded</div>}
           </div>
        </div>

        {/* Categories Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
           <div className="flex items-center gap-2 font-bold text-slate-800 mb-6">
             <PieChart className="w-5 h-5 text-blue-500" />
             Expense Breakdown
           </div>
           <div className="space-y-4">
             {Object.entries(expenseBreakdown).map(([cat, amount]) => (
               <div key={cat}>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="font-medium text-slate-600 uppercase text-xs">{cat}</span>
                   <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
                 </div>
                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${(amount / totalExpenses) * 100}%` }}
                    />
                 </div>
               </div>
             ))}
             {Object.keys(expenseBreakdown).length === 0 && <div className="text-center text-slate-400 text-xs">No data to display</div>}
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
            <input required type="text" className="w-full p-2 border rounded mt-1" 
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Shop Rent"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
              <input required type="number" className="w-full p-2 border rounded mt-1" 
                value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <select className="w-full p-2 border rounded mt-1 bg-white"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                <option value="RENT">Rent</option>
                <option value="SALARY">Salary</option>
                <option value="UTILITIES">Utilities (Bill)</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700">Add Expense</button>
        </form>
      </Modal>
    </div>
  );
};

export default Accounting;
