import React, { useState } from 'react';
import { Plus, Search, Trash2, User, Phone, Mail, Edit2, MapPin, ShoppingBag, Wrench, Calendar, ArrowRight, X, Clock, IndianRupee, FileText, ExternalLink, Receipt, Package, ClipboardList, TrendingUp, UserCircle, PhoneIncoming, AtSign, BarChart3, Target, Zap, ShieldCheck, Activity, Award } from 'lucide-react';
import { useCustomers } from '../stores/useCustomers';
import { useSales } from '../stores/useSales';
import { useRepairs } from '../stores/useRepairs';
import { Modal } from '../components/Modal';
import { useGlobalModal } from '../components/GlobalModal';
import { v4 as uuidv4 } from 'uuid';
import type { Customer, Sale, RepairJob } from '../types';
import { formatCurrency, cn } from '../utils';

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { sales } = useSales();
  const { jobs } = useRepairs();
  const { showConfirm } = useGlobalModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes,
      });
    } else {
      const newCustomer: Customer = {
        id: uuidv4(),
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes,
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      addCustomer(newCustomer);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Logic for customer stats
  const customerSales = viewingCustomer ? sales.filter(s => s.customerId === viewingCustomer.id) : [];
  const customerRepairs = viewingCustomer ? jobs.filter(j => j.customerId === viewingCustomer.id) : [];
  
  const totalProfit = customerSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalItems = customerSales.reduce((sum, sale) => sum + sale.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);
  const totalRepairsValue = customerRepairs.reduce((sum, job) => sum + job.estimatedCost, 0);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500 text-sm font-medium tracking-tight">Manage database, purchase history, and repairs</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

       <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold text-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-[0.2em] text-[8px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Identification</th>
                <th className="px-6 py-4">Contact Logic</th>
                <th className="px-6 py-4 text-center">Financial Value</th>
                <th className="px-6 py-4">Registry Activity</th>
                <th className="px-6 py-4 text-right pr-10">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filteredCustomers.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-20 text-center text-slate-300">
                     <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                     <p className="font-black uppercase tracking-widest text-[9px]">No matched profiles</p>
                   </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => setViewingCustomer(customer)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-all group border-b border-slate-50 last:border-0"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1 truncate max-w-[150px]">{customer.name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{customer.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                       <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                             <PhoneIncoming className="w-2.5 h-2.5 text-slate-300" />
                             <span className="font-mono text-[10px] font-bold tracking-tighter">{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                             <AtSign className="w-2.5 h-2.5 text-slate-200" />
                             <span className="text-[8px] font-medium lowercase tracking-tight truncate max-w-[150px]">{customer.email || 'no-email'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                       <span className="text-slate-900 font-black text-[10px] bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">{formatCurrency(customer.totalPurchases)}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                          {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right pr-10">
                       <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                         <button 
                          onClick={(e) => handleEdit(customer, e)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await showConfirm(
                              'Delete Customer', 
                              `Are you sure you want to delete ${customer.name}? associated sales data might be affected.`,
                              { variant: 'danger', confirmText: 'Delete' }
                            );
                            if (confirmed) deleteCustomer(customer.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCustomer ? "Registry Upgrade" : "New Ally Registration"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Full Legal Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jonathan Doe"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Primary Contact</label>
               <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="tel"
                  className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="000-000-0000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Digital Address</label>
             <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="address@example.com"
              />
            </div>
          </div>

           <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Physical Location</label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Building, Street, City..."
              rows={2}
            />
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-all rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              {editingCustomer ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingCustomer ? "Update Profile" : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Details Modal - Intelligence Hub (Ultra-Wide Compact Redesign) */}
      <Modal
        isOpen={viewingCustomer !== null}
        onClose={() => setViewingCustomer(null)}
        title="Intelligence Summary (Enhanced)"
        maxWidth="max-w-[95rem]"
      >
        {viewingCustomer && (
          <div className="p-3 space-y-4">
            {/* Top Bar: Profile & Core Connectivity - Density Optimized */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white flex flex-col lg:flex-row items-center justify-between gap-10 overflow-hidden relative shadow-2xl border border-slate-800">
               <div className="absolute top-0 right-0 w-[400px] h-full bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
               
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-all-mask bg-blue-600 flex items-center justify-center text-lg font-black shadow-xl shrink-0 ring-2 ring-slate-800/50">
                     {viewingCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                     <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">Corporate Client Protocol</p>
                     <h3 className="text-xl font-black tracking-tighter uppercase leading-none truncate max-w-[400px]">{viewingCustomer.name}</h3>
                     <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px] font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                           <Phone className="w-3 h-3 text-blue-500" />
                           {viewingCustomer.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[8px] uppercase tracking-widest px-2.5 py-1 bg-slate-800/40 rounded-lg">
                           <Calendar className="w-3 h-3 text-blue-500" />
                           Since {new Date(viewingCustomer.createdAt).toLocaleDateString()}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center justify-center lg:justify-end gap-3 w-full lg:max-w-2xl">
                  <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex-1 min-w-[120px] text-center group hover:bg-blue-600/20 transition-all cursor-default shadow-inner">
                     <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Total Visits</p>
                     <p className="text-xl font-black text-white">{customerSales.length}</p>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex-1 min-w-[120px] text-center group hover:bg-emerald-600/20 transition-all cursor-default shadow-inner">
                     <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Items Registry</p>
                     <p className="text-xl font-black text-white">{totalItems}</p>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex-1 min-w-[120px] text-center group hover:bg-orange-600/20 transition-all cursor-default shadow-inner">
                     <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Active Jobs</p>
                     <p className="text-xl font-black text-white">{customerRepairs.length}</p>
                  </div>
               </div>
            </div>

            {/* Middle Grid: Financial & Service Metrics (Density Optimized) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {/* Financial Value */}
               <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center group hover:border-blue-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                     <IndianRupee className="w-5 h-5" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Sales Revenue</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(viewingCustomer.totalPurchases)}</p>
               </div>

               {/* Profitability */}
               <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center group hover:border-emerald-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                     <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Net Earnings</p>
                  <p className="text-xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalProfit)}</p>
               </div>

               {/* Repair Count */}
               <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center group hover:border-orange-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-all">
                     <Wrench className="w-5 h-5" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Operational Output</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{customerRepairs.length} Units</p>
               </div>

               {/* Repair Value */}
               <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center group hover:border-indigo-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                     <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Service Valuation</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalRepairsValue)}</p>
               </div>
            </div>

            {/* Footer Summary Row (No clashing text / Ultra Compact) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-inner">
               <div className="flex items-center gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                     <Activity className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Customer Loyalty Index</p>
                     <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={cn("h-1 w-6 rounded-full transition-all", i <= Math.min(5, customerSales.length) ? "bg-blue-600" : "bg-slate-200")} />
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex flex-wrap items-center justify-center md:justify-end gap-6">
                  <div className="flex items-center gap-2 group">
                     <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                        <Mail className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                     </div>
                     <span className="text-[10px] font-bold text-slate-600 tracking-tight lowercase">{viewingCustomer.email || 'no-designated-id'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                     <Award className="w-3.5 h-3.5 text-emerald-500" />
                     <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Verified Partner</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .rounded-all-mask {
           border-radius: 35% 65% 68% 32% / 37% 33% 67% 63%;
        }
      `}</style>
    </div>
  );
};

export default Customers;
