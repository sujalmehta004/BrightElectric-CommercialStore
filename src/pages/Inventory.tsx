import React, { useState } from 'react';
import { Plus, Search, Trash2, Edit2, Filter, Download, UserPlus, X, AlertCircle, CheckCircle2, PackageSearch, Image, ImageIcon, FileText } from 'lucide-react';
import { useInventory } from '../stores/useInventory';
import { useSuppliers } from '../stores/useSuppliers';
import { Modal } from '../components/Modal';
import { useGlobalModal } from '../components/GlobalModal';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../types';
import { formatCurrency, cn } from '../utils';

const Inventory = () => {
  const { products, addProduct, updateProduct, handleStockArrival, deleteProduct } = useInventory();
  const { showConfirm } = useGlobalModal();
  const { suppliers, addSupplier } = useSuppliers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    customId: '',
    brand: '',
    model: '',
    description: '',
    image: '',
    specifications: '',
    serialNo: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    category: '',
    warrantyPeriod: '',
    supplierId: ''
  });
  
  // Quick Add Supplier Form
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Filtering State
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'LOW' | 'OUT' | 'IN'>('ALL');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  const brands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.specifications && p.specifications.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.customId && p.customId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !filterCategory || p.category === filterCategory;
    const matchesSupplier = !filterSupplier || p.supplierId === filterSupplier;
    const matchesBrand = !filterBrand || p.brand === filterBrand;
    const matchesDate = !filterDate || p.createdAt.startsWith(filterDate);
    
    const matchesStock = filterStockStatus === 'ALL' 
      ? true 
      : filterStockStatus === 'LOW' 
        ? (p.stock > 0 && p.stock <= 5)
        : filterStockStatus === 'OUT'
          ? p.stock === 0
          : p.stock > 5;

    // Hide products with 0 stock
    const hasStock = p.stock > 0;

    return matchesSearch && matchesCategory && matchesSupplier && matchesBrand && matchesStock && matchesDate && hasStock;
  }).sort((a, b) => {
    // Sort by latest first (newest to oldest)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update existing
        updateProduct(editingId, {
            name: formData.name,
            customId: formData.customId,
            brand: formData.brand,
            model: formData.model,
            description: formData.description,
            image: formData.image,
            specifications: formData.specifications,
            serialNo: formData.serialNo,
            buyPrice: Number(formData.buyPrice),
            sellPrice: Number(formData.sellPrice),
            stock: Number(formData.stock),
            category: formData.category,
            warrantyPeriod: formData.warrantyPeriod,
            supplierId: formData.supplierId
        });
    } else {
        // Create new
        const newProduct: Product = {
            id: uuidv4(),
            name: formData.name!,
            customId: formData.customId || '',
            brand: formData.brand || '',
            model: formData.model || '',
            description: formData.description || '',
            image: formData.image || '',
            specifications: formData.specifications || '',
            serialNo: formData.serialNo!,
            buyPrice: Number(formData.buyPrice),
            sellPrice: Number(formData.sellPrice),
            stock: Number(formData.stock),
            category: formData.category!,
            warrantyPeriod: formData.warrantyPeriod || '',
            supplierId: formData.supplierId || '',
            createdAt: new Date().toISOString(),
        };
        addProduct(newProduct);
    }
    closeModal();
  };

  const handleEdit = (product: Product) => {
      setFormData({
          name: product.name,
          customId: product.customId,
          brand: product.brand,
          model: product.model,
          description: product.description,
          image: product.image,
          specifications: product.specifications,
          serialNo: product.serialNo,
          buyPrice: product.buyPrice,
          sellPrice: product.sellPrice,
          stock: product.stock,
          category: product.category,
          warrantyPeriod: product.warrantyPeriod,
          supplierId: product.supplierId
      });
      setEditingId(product.id);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', customId: '', brand: '', model: '', serialNo: '', description: '', image: '', buyPrice: 0, sellPrice: 0, stock: 0, category: '', specifications: '', warrantyPeriod: '', supplierId: '' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image too large (Max 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickAddSupplier = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSupplierName || !newSupplierPhone) return;
      
      const newId = uuidv4();
      addSupplier({
          id: newId,
          name: newSupplierName,
          phone: newSupplierPhone,
          contactPerson: '',
          createdAt: new Date().toISOString()
      });
      
      // Auto-select the new supplier
      setFormData({ ...formData, supplierId: newId });
      setIsSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-blue-600" />
            Inventory
          </h2>
          <p className="text-xs text-slate-500 font-medium">Managing {products.length} Items in Stock</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, SKU, or Serial Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-slate-900/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar (Always Visible) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Category</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Supplier</label>
            <select 
              value={filterSupplier} 
              onChange={e => setFilterSupplier(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Stock Status</label>
            <select 
              value={filterStockStatus} 
              onChange={e => setFilterStockStatus(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Stock</option>
              <option value="IN">In Stock (&gt;5)</option>
              <option value="LOW">Low Stock (1-5)</option>
              <option value="OUT">Out of Stock (0)</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Added Date</label>
             <input 
               type="date" 
               value={filterDate} 
               onChange={e => setFilterDate(e.target.value)}
               className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
             />
          </div>

          {(filterCategory || filterSupplier || filterStockStatus !== 'ALL' || filterBrand || filterDate || searchTerm) && (
            <button 
              onClick={() => {
                setFilterCategory('');
                setFilterSupplier('');
                setFilterStockStatus('ALL');
                setFilterBrand('');
                setFilterDate('');
                setSearchTerm('');
              }}
              className="mt-5 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
              title="Clear All Filters"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Added</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Details</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier & Stock</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const supplier = suppliers.find(s => s.id === product.supplierId);
                  const addedDate = new Date(product.createdAt);
                  return (
                    <tr key={product.id} className="hover:bg-blue-50/30 group transition-colors border-b border-slate-100 last:border-0 text-[13px]">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">
                            {addedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {addedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-4">
                           <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-blue-200 transition-colors">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              )}
                           </div>
                           <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">{product.name}</span>
                                {product.brand && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">{product.brand}</span>}
                             </div>
                             <p className="text-slate-500 text-[11px] line-clamp-2 mb-1 font-medium italic">
                               {product.specifications || <span className="text-slate-300 italic font-normal">No specifications</span>}
                             </p>
                             <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-tighter uppercase">{product.category}</span>
                                <span className="text-[10px] font-mono text-slate-400 font-medium tracking-tight bg-slate-50 border border-slate-100 px-1 rounded">{product.serialNo}</span>
                             </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                         <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                               {supplier?.name || <span className="text-slate-400 italic font-normal">No Supplier</span>}
                            </span>
                            <div className="flex items-center gap-2">
                               <span className={cn(
                                 "w-2 h-2 rounded-full",
                                 product.stock <= 0 ? "bg-rose-500 animate-pulse" : 
                                 product.stock <= 5 ? "bg-orange-500" : "bg-emerald-500"
                               )} />
                               <span className={cn(
                                 "text-[11px] font-bold",
                                 product.stock <= 0 ? "text-rose-600" : 
                                 product.stock <= 5 ? "text-orange-600" : "text-emerald-600"
                               )}>
                                 {product.stock} Units
                               </span>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4">
                         <div className="flex items-center gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Buy Price</p>
                              <p className="font-bold text-slate-700 text-sm">{formatCurrency(product.buyPrice)}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-100"></div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Sell Price</p>
                              <p className="font-bold text-slate-900 text-sm">{formatCurrency(product.sellPrice)}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-100"></div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Profit</p>
                              <p className="text-[11px] font-bold text-emerald-600">+{formatCurrency(product.sellPrice - product.buyPrice)}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleEdit(product)}
                             className="p-2 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                             title="Edit Product"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button 
                              onClick={async () => { 
                                const confirmed = await showConfirm(
                                  'Delete Product', 
                                  `Are you sure you want to delete ${product.name}? This cannot be undone.`,
                                  { variant: 'danger', confirmText: 'Delete' }
                                );
                                if (confirmed) deleteProduct(product.id);
                              }}
                              className="p-2 text-slate-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                              title="Delete Product"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Product Name *</label>
              <input required type="text" className="w-full p-2 border rounded mt-1 text-sm" placeholder="iPhone 15 Pro"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Category *</label>
              <input required type="text" className="w-full p-2 border rounded mt-1 text-sm" placeholder="Mobile"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
            </div>
          </div>
          
           <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier</label>
                <select 
                    className="w-full p-2 border rounded mt-1 text-sm bg-white"
                    value={formData.supplierId} 
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSupplierModalOpen(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded border border-slate-200 mb-[1px]" 
                title="Add New Supplier"
              >
                  <UserPlus className="w-5 h-5" />
              </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Brand</label>
              <input type="text" className="w-full p-2 border rounded mt-1 text-sm" placeholder="Apple"
                value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Model</label>
              <input type="text" className="w-full p-2 border rounded mt-1 text-sm" placeholder="A2890"
                value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">SKU / Custom ID</label>
              <input type="text" className="w-full p-2 border rounded mt-1 text-sm font-mono" placeholder="MOB-APL-001"
                value={formData.customId} onChange={e => setFormData({...formData, customId: e.target.value})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Serial / IMEI *</label>
              <input required type="text" className="w-full p-2 border rounded mt-1 text-sm font-mono"
                value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} />
            </div>
          </div>

           <div className="grid grid-cols-3 gap-3">
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Buy Price</label>
              <input required type="number" className="w-full p-2 border rounded mt-1 text-sm"
                value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: Number(e.target.value)})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Sell Price</label>
              <input required type="number" className="w-full p-2 border rounded mt-1 text-sm"
                value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: Number(e.target.value)})} />
            </div>
             <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Stock</label>
              <input required type="number" className="w-full p-2 border rounded mt-1 text-sm"
                value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
            </div>
          </div>
          
          <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Description / Summary</label>
              <input type="text" className="w-full p-2 border rounded mt-1 text-sm" placeholder="Quick overview of the product..."
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Product Image</label>
               <div className="mt-1 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                    {formData.image ? (
                        <img src={formData.image} className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <label className="flex-1">
                     <span className="sr-only">Choose image</span>
                     <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-xs text-slate-500
                        file:mr-4 file:py-1.5 file:px-3
                        file:rounded-full file:border-0
                        file:text-xs file:font-bold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100 cursor-pointer" />
                  </label>
               </div>
            </div>
            {formData.image && (
                <div className="flex items-end pb-1">
                   <button type="button" onClick={() => setFormData({...formData, image: ''})} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 bg-rose-50 rounded-lg">Remove Image</button>
                </div>
            )}
          </div>

          <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Detailed Specifications / Notes</label>
              <textarea className="w-full p-2 border rounded mt-1 text-sm" rows={2}
                value={formData.specifications} onChange={e => setFormData({...formData, specifications: e.target.value})} />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95">
              {editingId ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Quick Add Supplier">
        <form onSubmit={handleQuickAddSupplier} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Supplier / Company Name *</label>
              <input required type="text" className="w-full p-2 border rounded mt-1" 
                value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Phone *</label>
              <input required type="tel" className="w-full p-2 border rounded mt-1" 
                value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
            </div>
            <p className="text-xs text-slate-400">You can add more details later in the Suppliers tab.</p>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Add & Select</button>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
