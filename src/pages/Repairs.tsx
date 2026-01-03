import React, { useState } from 'react';
import { Plus, Search, Wrench, Clock, CheckCircle, AlertCircle, User, UserPlus, ArrowRight, UserCircle, Edit2, Trash2, AlertTriangle, Save, Check } from 'lucide-react';
import { useRepairs } from '../stores/useRepairs';
import { useCustomers } from '../stores/useCustomers';
import { Modal } from '../components/Modal';
import { v4 as uuidv4 } from 'uuid';
import type { RepairStatus, RepairJob, Customer } from '../types';
import { formatCurrency, cn } from '../utils';

const statusColors: Record<RepairStatus, string> = {
  'received': 'bg-slate-100 text-slate-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'waiting-for-parts': 'bg-orange-100 text-orange-700',
  'ready': 'bg-green-100 text-green-700',
  'delivered': 'bg-slate-900 text-white',
};

const Repairs = () => {
  const { jobs, addJob, updateJobStatus, updateJob, deleteJob } = useRepairs();
  const { customers, addCustomer } = useCustomers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'READY'>('ALL');
  
  // Edit state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  
  // Confirmation states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // Customer selection state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const [formData, setFormData] = useState({
    deviceModel: '',
    serialNo: '',
    issueDescription: '',
    estimatedCost: '',
    advanceAmount: '',
    assignedTechnician: '',
    notes: '',
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         j.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         j.jobId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'ACTIVE') {
      return j.status !== 'delivered' && j.status !== 'ready';
    }
    if (statusFilter === 'READY') {
      return j.status === 'ready';
    }
    return true; // ALL
  });

  const handleEdit = (job: RepairJob) => {
    setEditingJobId(job.id);
    const customer = customers.find(c => c.id === job.customerId);
    setSelectedCustomer(customer || {
      id: job.customerId || '',
      name: job.customerName,
      phone: job.customerPhone,
      totalPurchases: 0,
      createdAt: '',
    });
    setFormData({
      deviceModel: job.deviceModel,
      serialNo: job.serialNo,
      issueDescription: job.issueDescription,
      estimatedCost: job.estimatedCost.toString(),
      advanceAmount: (job.advanceAmount || 0).toString(),
      assignedTechnician: job.assignedTechnician || '',
      notes: job.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteJob(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    if (editingJobId) {
      setShowSaveConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = () => {
    if (!selectedCustomer) return;

    if (editingJobId) {
      updateJob(editingJobId, {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        deviceModel: formData.deviceModel,
        serialNo: formData.serialNo,
        issueDescription: formData.issueDescription,
        estimatedCost: Number(formData.estimatedCost),
        advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : 0,
        assignedTechnician: formData.assignedTechnician,
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
      });
      setShowSaveConfirm(false);
    } else {
      const newJob: RepairJob = {
        id: uuidv4(),
        jobId: `JOB-${Math.floor(Math.random() * 10000)}`,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        deviceModel: formData.deviceModel,
        serialNo: formData.serialNo,
        issueDescription: formData.issueDescription,
        estimatedCost: Number(formData.estimatedCost),
        advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : 0,
        assignedTechnician: formData.assignedTechnician,
        notes: formData.notes,
        status: 'received',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addJob(newJob);
    }
    
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingJobId(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setFormData({
      deviceModel: '', serialNo: '', issueDescription: '', 
      estimatedCost: '', advanceAmount: '', assignedTechnician: '',
      notes: ''
    });
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = {
      id: uuidv4(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      totalPurchases: 0,
      createdAt: new Date().toISOString(),
    };
    addCustomer(customer);
    setSelectedCustomer(customer);
    setShowAddCustomer(false);
    setNewCustomer({ name: '', phone: '', email: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Repair Jobs</h2>
          <p className="text-slate-500 text-sm">Track device service status</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          New Job Card
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Job ID, Customer, Serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setStatusFilter('ALL')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'ALL' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'ACTIVE' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
                >
                  ACTIVE
                </button>
                <button 
                  onClick={() => setStatusFilter('READY')}
                  className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", statusFilter === 'READY' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700")}
                >
                  READY
                </button>
             </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-slate-500">No repair jobs found.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-4 relative overflow-hidden group">
                {/* Status Bar */}
                <div className={cn("absolute top-0 left-0 w-full h-1", statusColors[job.status].split(' ')[0])} />
                
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-tighter uppercase">{job.jobId}</span>
                    <h3 className="font-black text-slate-900 mt-2 text-base truncate pr-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{job.deviceModel}</h3>
                    <p className="text-slate-400 text-[10px] font-mono font-bold mt-0.5">{job.serialNo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select 
                      value={job.status}
                      onChange={(e) => updateJobStatus(job.id, e.target.value as RepairStatus)}
                      className={cn(
                        "text-[10px] font-bold px-3 py-1.5 rounded-full border-none outline-none cursor-pointer appearance-none text-center shadow-sm hover:scale-105 transition-transform uppercase tracking-widest",
                        statusColors[job.status]
                      )}
                    >
                      <option value="received">Received</option>
                      <option value="in-progress">In Progress</option>
                      <option value="waiting-for-parts">Parts Waiting</option>
                      <option value="ready">Ready</option>
                      <option value="delivered">Delivered</option>
                    </select>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => handleEdit(job)}
                         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         title="Edit Job"
                       >
                         <Edit2 className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         onClick={() => handleDeleteClick(job.id)}
                         className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                         title="Delete Job"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                    <AlertCircle className="w-3 h-3" />
                    Issue
                  </div>
                  <p className="font-medium leading-relaxed line-clamp-3">{job.issueDescription}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                           <UserCircle className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800 text-[11px] leading-none">{job.customerName}</span>
                           <span className="text-slate-400 text-[10px] font-medium">{job.customerPhone}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">EST. COST</p>
                        <p className="font-black text-slate-900 text-sm">{formatCurrency(job.estimatedCost)}</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1 text-slate-400 uppercase tracking-tight">
                       <Clock className="w-3 h-3" />
                       {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                    {job.status === 'ready' && (
                      <span className="text-emerald-600 flex items-center gap-1 animate-pulse">
                        <CheckCircle className="w-3.5 h-3.5"/> 
                        READY
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

       <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingJobId ? "Update Job Card" : "Create New Job Card"}>
         <form onSubmit={handleSaveClick} className="space-y-5">
            {/* Customer Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Customer Detail</label>
              
              {selectedCustomer ? (
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{selectedCustomer.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{selectedCustomer.phone}</p>
                      </div>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setSelectedCustomer(null)}
                     className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                   >
                     Change
                   </button>
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Search existing customer (Name/Phone)..."
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />
                     </div>
                     <button 
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        title="Add New Customer"
                      >
                        <UserPlus className="w-4.5 h-4.5" />
                      </button>
                   </div>

                   {customerSearch && filteredCustomers.length > 0 && (
                     <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-50">
                        {filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                            className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{c.phone}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Device Model</label>
                <input required type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="e.g. iPhone 15 Pro"
                  value={formData.deviceModel} onChange={e => setFormData({...formData, deviceModel: e.target.value})} />
              </div>
              <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Serial / IMEI</label>
                <input required type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase" placeholder="Device identifier"
                  value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} />
              </div>
            </div>

            <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Issue Description</label>
               <textarea required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" rows={2} placeholder="Describe the problem..."
                 value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Est. Cost</label>
                <input required type="number" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-bold text-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="0.00"
                  value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Advance Amount</label>
                <input type="number" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-bold text-emerald-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="Optional"
                  value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={!selectedCustomer}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-slate-900/10 active:scale-95 w-full md:w-auto"
              >
                {editingJobId ? "Save Changes" : "Create Job Card"}
              </button>
            </div>
         </form>
       </Modal>

       {/* Quick Add Customer Modal */}
       <Modal isOpen={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Quick Add Customer">
          <form onSubmit={handleQuickAddCustomer} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Name *</label>
              <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number *</label>
              <input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address (Optional)</label>
              <input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-2">
              Add & Select Customer
            </button>
          </form>
       </Modal>

       {/* Delete Confirmation Modal */}
       <Modal isOpen={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} title="Confirm Deletion">
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-4 text-rose-600">
               <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-tight text-lg">Are you absolutely sure?</h3>
                  <p className="text-slate-500 text-sm font-medium">This action cannot be undone. This repair record will be permanently deleted.</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => setDeleteConfirmId(null)}
                 className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmDelete}
                 className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-rose-600/30 transition-shadow"
               >
                 Delete Record
               </button>
            </div>
          </div>
       </Modal>

       {/* Save Changes Confirmation Modal */}
       <Modal isOpen={showSaveConfirm} onClose={() => setShowSaveConfirm(false)} title="Confirm Changes">
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-4 text-blue-600">
               <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Save className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-tight text-lg">Save these changes?</h3>
                  <p className="text-slate-500 text-sm font-medium">Review the device details and estimates before saving the updated record.</p>
               </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
               <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">DEVICE</span>
                  <span className="text-slate-700 uppercase">{formData.deviceModel}</span>
               </div>
               <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">EST. COST</span>
                  <span className="text-blue-600">{formatCurrency(Number(formData.estimatedCost))}</span>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => setShowSaveConfirm(false)}
                 className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
               >
                 Go Back
               </button>
               <button 
                 onClick={executeSubmit}
                 className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-600/30 transition-shadow flex items-center justify-center gap-2"
               >
                 <Check className="w-4 h-4" />
                 Save Changes
               </button>
            </div>
          </div>
       </Modal>
    </div>
  );
};

export default Repairs;
