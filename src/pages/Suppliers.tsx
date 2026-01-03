import { useState } from 'react';
import { Plus, Search, Trash2, Truck, X, Package, Download, IndianRupee, History, RefreshCcw, Edit2 } from 'lucide-react';
import { useInventory } from '../stores/useInventory';
import { useSuppliers, type Supplier, type PurchaseOrder, type SupplierTransaction } from '../stores/useSuppliers';
import { useShopSettings } from '../stores/useShopSettings';
import { Modal } from '../components/Modal';
import { useGlobalModal } from '../components/GlobalModal';
import { v4 as uuidv4 } from 'uuid';
import { cn, formatCurrency } from '../utils';

const Suppliers = () => {
  const { suppliers, addSupplier, deleteSupplier, updateSupplier, purchaseOrders, addPurchaseOrder, transactions, addTransaction, updatePurchaseOrder, receiveOrder } = useSuppliers();
  const { showConfirm } = useGlobalModal();
  const { products, updateProduct, addProduct, handleStockArrival } = useInventory();
  const { details: shopDetails } = useShopSettings();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'restock' | 'new_order' | 'arrivals' | 'ledger'>('info');
  
  const [viewingBill, setViewingBill] = useState<PurchaseOrder | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string>('general');
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', contactPerson: '', phone: '', address: '', VATIn: '', category: '', paymentTerms: 'Immediate'
  });

  const [isRestocking, setIsRestocking] = useState(false);
  const [restockData, setRestockData] = useState({ billNumber: '', date: new Date().toISOString().split('T')[0], paidAmount: 0 });
  const [restockItems, setRestockItems] = useState<{ productId: string, name: string, quantity: number, buyPrice: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'WALLET' | 'OTHER'>('CASH');

  // New Product Order State - Comprehensive Product Form
  const [newOrderForm, setNewOrderForm] = useState({
    name: '', 
    customId: '', 
    brand: '', 
    model: '', 
    serialNo: '', 
    description: '', 
    image: '', 
    buyPrice: 0, 
    sellPrice: 0, 
    stock: 0, 
    category: '', 
    specifications: '', 
    warrantyPeriod: ''
  });

  // Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDateStart, setLedgerDateStart] = useState('');
  const [ledgerDateEnd, setLedgerDateEnd] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState<'ALL' | 'SETTLED' | 'PENDING'>('ALL');

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Financial Calculations
  const getSupplierBalance = (supplierId: string) => {
    const supplierTransactions = transactions.filter(t => t.supplierId === supplierId);
    return supplierTransactions.reduce((acc, t) => {
        if (t.type === 'BILL') return acc + t.amount;
        return acc - t.amount;
    }, 0);
  };

  const handleRestock = () => {
    if (!selectedSupplier || restockItems.length === 0) return;
    
    const totalAmount = restockItems.reduce((acc, item) => acc + (item.quantity * item.buyPrice), 0);
    const poId = uuidv4();
    const currentBalance = getSupplierBalance(selectedSupplier.id);

    const newPO: PurchaseOrder = {
        id: poId,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        billNumber: restockData.billNumber || `DRC-${uuidv4().slice(0,6).toUpperCase()}`,
        billDate: restockData.date,
        items: restockItems.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: Number(item.quantity),
            buyPrice: Number(item.buyPrice),
            total: Number(item.quantity) * Number(item.buyPrice)
        })),
        totalAmount,
        paidAmount: Number(restockData.paidAmount),
        dueAmount: totalAmount - Number(restockData.paidAmount),
        status: restockData.paidAmount >= totalAmount ? 'SETTLED' : 'PARTIAL',
        isReceived: false,
        arrivalDate: restockData.date,
        payments: restockData.paidAmount > 0 ? [{
            id: uuidv4(),
            amount: Number(restockData.paidAmount),
            date: new Date().toISOString(),
            method: 'CASH', 
            description: 'Initial Restock Payment'
        }] : [],
        createdAt: new Date().toISOString()
    };

    addPurchaseOrder(newPO);

    // Bill Transaction
    addTransaction({
        id: uuidv4(),
        supplierId: selectedSupplier.id,
        type: 'BILL',
        amount: totalAmount,
        referenceId: poId,
        description: `Purchase Bill #${newPO.billNumber}`,
        date: restockData.date,
        balanceAfter: currentBalance + totalAmount
    });

    // If paid amount > 0, add a payment transaction too
    if (restockData.paidAmount > 0) {
        addTransaction({
            id: uuidv4(),
            supplierId: selectedSupplier.id,
            type: 'PAYMENT',
            amount: Number(restockData.paidAmount),
            referenceId: poId,
            description: `Payment for Bill #${newPO.billNumber}`,
            date: restockData.date,
            balanceAfter: currentBalance + totalAmount - Number(restockData.paidAmount)
        });
    }

    // Update Inventory
    restockItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            updateProduct(product.id, {
                stock: Number(product.stock) + Number(item.quantity),
                buyPrice: Number(item.buyPrice)
            });
        }
    });

    setIsRestocking(false);
    setRestockItems([]);
    setRestockData({ billNumber: '', date: new Date().toISOString().split('T')[0], paidAmount: 0 });
    setActiveTab('arrivals');
  };

  const handleNewProductOrder = () => {
    if (!selectedSupplier || !newOrderForm.name || !newOrderForm.category || !newOrderForm.serialNo || !newOrderForm.buyPrice || !newOrderForm.sellPrice || !newOrderForm.stock) {
      alert('Please fill in all required fields (Name, Category, Serial/IMEI, Buy Price, Sell Price, Quantity)');
      return;
    }

    // Step 1: Create the product draft in inventory with 0 stock initially
    const newProductId = uuidv4();
    addProduct({
      id: newProductId,
      name: newOrderForm.name,
      customId: newOrderForm.customId || '',
      brand: newOrderForm.brand || '',
      model: newOrderForm.model || '',
      serialNo: newOrderForm.serialNo,
      description: newOrderForm.description || '',
      image: newOrderForm.image || '',
      specifications: newOrderForm.specifications || '',
      category: newOrderForm.category,
      warrantyPeriod: newOrderForm.warrantyPeriod || '',
      buyPrice: Number(newOrderForm.buyPrice),
      sellPrice: Number(newOrderForm.sellPrice),
      stock: 0, // Stock is 0 until arrival is confirmed
      supplierId: selectedSupplier.id,
      createdAt: new Date().toISOString()
    });

    // Step 2: Create a Purchase Order for this new product
    const totalAmount = Number(newOrderForm.buyPrice) * Number(newOrderForm.stock);
    const poId = uuidv4();
    const currentBalance = getSupplierBalance(selectedSupplier.id);

    const newPO: PurchaseOrder = {
      id: poId,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      billNumber: restockData.billNumber || `NEW-${uuidv4().slice(0,6).toUpperCase()}`,
      billDate: restockData.date,
      items: [{
        productId: newProductId,
        name: newOrderForm.name,
        quantity: Number(newOrderForm.stock),
        buyPrice: Number(newOrderForm.buyPrice),
        total: totalAmount
      }],
      totalAmount,
      paidAmount: Number(restockData.paidAmount),
      dueAmount: totalAmount - Number(restockData.paidAmount),
      status: restockData.paidAmount >= totalAmount ? 'SETTLED' : 'PARTIAL',
      isReceived: false,
      arrivalDate: restockData.date,
      payments: restockData.paidAmount > 0 ? [{
        id: uuidv4(),
        amount: Number(restockData.paidAmount),
        date: new Date().toISOString(),
        method: 'CASH',
        description: 'Initial Payment for New Product Order'
      }] : [],
      createdAt: new Date().toISOString()
    };

    addPurchaseOrder(newPO);

    // Step 3: Record Financial Transactions
    addTransaction({
      id: uuidv4(),
      supplierId: selectedSupplier.id,
      type: 'BILL',
      amount: totalAmount,
      referenceId: poId,
      description: `New Product Order - ${newOrderForm.name}`,
      date: restockData.date,
      balanceAfter: currentBalance + totalAmount
    });

    if (restockData.paidAmount > 0) {
      addTransaction({
        id: uuidv4(),
        supplierId: selectedSupplier.id,
        type: 'PAYMENT',
        amount: Number(restockData.paidAmount),
        referenceId: poId,
        description: `Payment for New Product Order`,
        date: restockData.date,
        balanceAfter: currentBalance + totalAmount - Number(restockData.paidAmount)
      });
    }

    // Reset form and switch to arrivals tab
    setNewOrderForm({ 
      name: '', customId: '', brand: '', model: '', serialNo: '', 
      description: '', image: '', buyPrice: 0, sellPrice: 0, stock: 0, 
      category: '', specifications: '', warrantyPeriod: '' 
    });
    setRestockData({ billNumber: '', date: new Date().toISOString().split('T')[0], paidAmount: 0 });
    setActiveTab('arrivals');
  };

  const handlePayment = (type: 'PAYMENT' | 'SETTLEMENT') => {
    if (!selectedSupplier || paymentAmount <= 0) return;
    
    const currentBalance = getSupplierBalance(selectedSupplier.id);
    const bill = selectedBillId !== 'general' ? purchaseOrders.find(po => po.id === selectedBillId) : null;
    
    const transId = uuidv4();
    addTransaction({
        id: transId,
        supplierId: selectedSupplier.id,
        type: type,
        amount: paymentAmount,
        referenceId: selectedBillId !== 'general' ? selectedBillId : undefined,
        description: paymentDesc || `${type === 'SETTLEMENT' ? 'Settlement' : 'Partial Payment'} ${bill ? `for Bill #${bill.billNumber}` : '(General)'}`,
        date: new Date().toISOString(),
        balanceAfter: currentBalance - paymentAmount
    });

    if (bill) {
        const newPaid = Number(bill.paidAmount) + paymentAmount;
        const newPaymentRecord = {
            id: transId,
            amount: paymentAmount,
            date: new Date().toISOString(),
            method: paymentMethod,
            description: paymentDesc || `${type === 'SETTLEMENT' ? 'Settlement' : 'Partial Payment'}`
        };

        updatePurchaseOrder(bill.id, {
            paidAmount: newPaid,
            dueAmount: bill.totalAmount - newPaid,
            status: newPaid >= bill.totalAmount ? 'SETTLED' : 'PARTIAL',
            payments: [...(bill.payments || []), newPaymentRecord]
        });
    }

    setPaymentAmount(0);
    setPaymentDesc('');
    setSelectedBillId('general');
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updateSupplier(editingId, formData);
    } else {
        addSupplier({
          ...formData as Supplier,
          id: uuidv4(),
          createdAt: new Date().toISOString()
        });
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', contactPerson: '', phone: '', address: '', VATIn: '', category: '', paymentTerms: 'Immediate' });
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Suppliers & Ledgers</h2>
          <p className="text-slate-500 text-sm font-medium">Professional procurement and financial settlement system</p>
        </div>
        <button
          onClick={() => {
              setEditingId(null);
              setFormData({ name: '', contactPerson: '', phone: '', address: '', VATIn: '', category: '', paymentTerms: 'Immediate' });
              setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Register Supplier
        </button>
      </div>

       <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, ID or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-xs font-bold text-slate-700 shadow-sm"
            />
          </div>
          <button className="p-3 text-slate-400 hover:text-slate-600 transition-colors bg-white border border-slate-200 rounded-2xl shadow-sm">
             <Download className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-50/50">
           {filtered.map(supplier => {
              const balance = getSupplierBalance(supplier.id);
              return (
                <div key={supplier.id} onClick={() => { setSelectedSupplier(supplier); setActiveTab('info'); }} 
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-400 cursor-pointer transition-all group relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1">
                   <div className="absolute top-0 right-0 p-6 flex gap-1 items-center">
                      <div className={cn("w-2 h-2 rounded-full", balance > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{balance > 0 ? 'Dues Pending' : 'Clear'}</span>
                   </div>

                   <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:bg-blue-600 transition-colors">
                         <Truck className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{supplier.category || 'GENERAL'}</p>
                         <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">{supplier.name}</h3>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pb-5 border-b border-slate-50 mb-5">
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Hub</p>
                         <p className="text-[10px] font-bold text-slate-700">{supplier.phone}</p>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement</p>
                         <p className="text-[10px] font-bold text-slate-700">{supplier.paymentTerms}</p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Net Pay Balance</p>
                         <p className={cn("text-xl font-black tracking-tighter", balance > 0 ? "text-rose-600" : "text-emerald-600")}>{formatCurrency(balance)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                         <ArrowRight className="w-4 h-4" />
                      </div>
                   </div>

                   <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                     <button onClick={(e) => {
                         e.stopPropagation();
                         setFormData({
                            name: supplier.name, 
                            contactPerson: supplier.contactPerson, 
                            phone: supplier.phone, 
                            address: supplier.address || '', 
                            VATIn: supplier.VATIn || '', 
                            category: supplier.category || '', 
                            paymentTerms: supplier.paymentTerms || 'Immediate'
                         });
                         setEditingId(supplier.id);
                         setIsModalOpen(true);
                     }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                     </button>
                     <button onClick={async (e) => { 
                       e.stopPropagation(); 
                       const confirmed = await showConfirm(
                         'Erase Supplier', 
                         `Are you sure you want to remove ${supplier.name} from your partners? History will remain but they won't be selectable.`,
                         { variant: 'danger', confirmText: 'Erase Identity' }
                       );
                       if (confirmed) deleteSupplier(supplier.id); 
                     }} 
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-white rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              );
           })}
        </div>
      </div>

       {/* Supplier Workspace Modal */}
      {selectedSupplier && (
        <Modal isOpen={true} onClose={() => setSelectedSupplier(null)} 
               maxWidth="max-w-[98vw]" 
               title={`${selectedSupplier.name.toUpperCase()} COMMAND HUB`}>
            <div className="flex flex-col h-[85vh]">
               {/* Advanced Tabs */}
               <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-6 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'info', icon: Package, label: 'Matrix' },
                    { id: 'restock', icon: RefreshCcw, label: 'Restock' },
                    { id: 'new_order', icon: Plus, label: 'New Stock' },
                    { id: 'arrivals', icon: Truck, label: 'Arrivals' },
                     { id: 'ledger', icon: History, label: 'Ledger' }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap", 
                        activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.id === 'arrivals' && selectedSupplier && purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && !po.isReceived).length > 0 && (
                           <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                              {purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && !po.isReceived).length}
                           </span>
                        )}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {/* TAB 1: Inventory Matrix */}
                  {activeTab === 'info' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div className="bg-slate-900 p-6 rounded-3xl text-white">
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total SKU Variance</p>
                             <p className="text-3xl font-black tracking-tighter">{products.filter(p => p.supplierId === selectedSupplier.id).length} Types</p>
                          </div>
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Asset Value</p>
                             <p className="text-3xl font-black tracking-tighter text-slate-900">
                                {formatCurrency(products.filter(p => p.supplierId === selectedSupplier.id).reduce((acc, p) => acc + (p.buyPrice * p.stock), 0))}
                             </p>
                          </div>
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Payables</p>
                             <p className="text-3xl font-black tracking-tighter text-rose-600">{formatCurrency(getSupplierBalance(selectedSupplier.id))}</p>
                          </div>
                          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
                             <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-2">Stock Integrity</p>
                             <p className="text-3xl font-black tracking-tighter">100% Secure</p>
                          </div>
                       </div>

                       <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
                          <table className="w-full text-left text-sm">
                             <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                <tr>
                                   <th className="px-6 py-4">Product Unit</th>
                                   <th className="px-6 py-4">Stock Status</th>
                                   <th className="px-6 py-4 text-right">Unit Price</th>
                                   <th className="px-6 py-4 text-right">Inventory Valuation</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {products.filter(p => p.supplierId === selectedSupplier.id).map(p => (
                                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-4">
                                        <div className="font-black text-slate-800 text-xs truncate max-w-[200px] uppercase tracking-tight">{p.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold">{p.model || 'GENERIC UNIT'}</div>
                                     </td>
                                     <td className="px-6 py-4">
                                        <span className={cn("px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest", 
                                          p.stock < 5 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                                          {p.stock} Units Available
                                        </span>
                                     </td>
                                     <td className="px-6 py-4 text-right font-bold text-slate-600">{formatCurrency(p.buyPrice)}</td>
                                     <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(p.buyPrice * p.stock)}</td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  )}

                  {/* TAB 2: Restock Flow */}
                  {activeTab === 'restock' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-900 p-8 rounded-[2.5rem] text-white">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Bill Reference No.</label>
                             <input type="text" className="w-full bg-slate-800 border-0 rounded-2xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/20" 
                                placeholder="EX: BLL-9988-24" value={restockData.billNumber} onChange={e => setRestockData({...restockData, billNumber: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Arrival Date</label>
                             <input type="date" className="w-full bg-slate-800 border-0 rounded-2xl px-4 py-3 font-bold text-sm" 
                                value={restockData.date} onChange={e => setRestockData({...restockData, date: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Partial Payment Executed</label>
                             <div className="relative">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="number" className="w-full bg-slate-800 border-0 rounded-2xl pl-12 pr-4 py-3 font-bold text-sm" 
                                   value={restockData.paidAmount} onChange={e => setRestockData({...restockData, paidAmount: Number(e.target.value)})} />
                             </div>
                          </div>
                       </div>

                       <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                          <div className="flex items-center gap-4 mb-6">
                             <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search Master Inventory to Import Items..." 
                                   className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl font-bold text-xs" 
                                   value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                                {productSearch && (
                                  <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                                     {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                       <div key={p.id} onClick={() => { setRestockItems([...restockItems, { productId: p.id, name: p.name, quantity: 1, buyPrice: p.buyPrice }]); setProductSearch(''); }}
                                          className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center group transition-all">
                                          <div>
                                             <p className="font-black text-slate-900 text-[10px] uppercase">{p.name}</p>
                                             <p className="text-[9px] text-slate-400 font-bold uppercase">{p.model}</p>
                                          </div>
                                          <div className="bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100">+ IMPORT</div>
                                       </div>
                                     ))}
                                  </div>
                                )}
                             </div>
                          </div>

                          <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                             <thead className="bg-white text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <tr>
                                   <th className="px-4 py-2">Manifest Description</th>
                                   <th className="px-4 py-2 w-32">Qty</th>
                                   <th className="px-4 py-2 w-40 text-right">Acquisition Price</th>
                                   <th className="px-4 py-2 w-40 text-right">Extended Net</th>
                                   <th className="px-4 py-2 w-10"></th>
                                </tr>
                             </thead>
                             <tbody>
                                {restockItems.map((item, idx) => (
                                  <tr key={idx} className="bg-slate-50/50 rounded-2xl overflow-hidden hover:bg-slate-100/50 transition-all">
                                     <td className="px-4 py-4 rounded-l-2xl font-black text-xs text-slate-900 uppercase">{item.name}</td>
                                     <td className="px-4 py-4">
                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 font-bold text-xs" 
                                           value={item.quantity} onChange={e => {
                                              const updated = [...restockItems];
                                              updated[idx].quantity = Number(e.target.value);
                                              setRestockItems(updated);
                                           }} />
                                     </td>
                                     <td className="px-4 py-4">
                                        <div className="relative">
                                           <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                           <input type="number" className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2 py-1 font-bold text-xs" 
                                              value={item.buyPrice} onChange={e => {
                                                 const updated = [...restockItems];
                                                 updated[idx].buyPrice = Number(e.target.value);
                                                 setRestockItems(updated);
                                              }} />
                                        </div>
                                     </td>
                                     <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(item.quantity * item.buyPrice)}</td>
                                     <td className="px-4 py-4 rounded-r-2xl text-right">
                                        <button onClick={() => setRestockItems(restockItems.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-600">
                                           <X className="w-4 h-4" />
                                        </button>
                                     </td>
                                  </tr>
                                ))}
                                {restockItems.length === 0 && (
                                  <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px] border-4 border-dashed border-slate-50 rounded-[4rem]">Pending item importation...</td></tr>
                                )}
                             </tbody>
                          </table>

                          {restockItems.length > 0 && (
                            <div className="mt-8 flex items-center justify-between bg-slate-900 p-6 rounded-[2rem] text-white">
                               <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Manifest Gross Total</p>
                                  <p className="text-3xl font-black tracking-tighter">{formatCurrency(restockItems.reduce((acc, i) => acc + (i.quantity * i.buyPrice), 0))}</p>
                               </div>
                               <button onClick={handleRestock} className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                  Execute Financial Entry & Schedule Arrival
                               </button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {/* TAB 3: New Product Order */}
                  {activeTab === 'new_order' && (
                    <div className="space-y-6">
                       <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                             <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                   <Plus className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                   <h4 className="text-2xl font-black text-slate-900 tracking-tight">New Product Discovery</h4>
                                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Add Completely New SKU to Inventory</p>
                                </div>
                             </div>
                             </div>
                          </div>
                          <div className="space-y-6">
                             {/* Row 1: Name & Category */}
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Product Name *</label>
                                   <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="iPhone 15 Pro"
                                      value={newOrderForm.name} onChange={e => setNewOrderForm({...newOrderForm, name: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category *</label>
                                   <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="Mobile"
                                      value={newOrderForm.category} onChange={e => setNewOrderForm({...newOrderForm, category: e.target.value})} />
                                </div>
                             </div>

                             {/* Row 2: Brand & Model */}
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Brand</label>
                                   <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="Apple"
                                      value={newOrderForm.brand} onChange={e => setNewOrderForm({...newOrderForm, brand: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Model</label>
                                   <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="A2890"
                                      value={newOrderForm.model} onChange={e => setNewOrderForm({...newOrderForm, model: e.target.value})} />
                                </div>
                             </div>

                             {/* Row 3: SKU & Serial */}
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">SKU / Custom ID</label>
                                   <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="MOB-APL-001"
                                      value={newOrderForm.customId} onChange={e => setNewOrderForm({...newOrderForm, customId: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Serial / IMEI *</label>
                                   <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                      placeholder="359876543210987"
                                      value={newOrderForm.serialNo} onChange={e => setNewOrderForm({...newOrderForm, serialNo: e.target.value})} />
                                </div>
                             </div>

                             {/* Row 4: Prices & Stock */}
                             <div className="grid grid-cols-3 gap-6">
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Buy Price *</label>
                                   <div className="relative">
                                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                      <input required type="number" className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                         value={newOrderForm.buyPrice} onChange={e => setNewOrderForm({...newOrderForm, buyPrice: Number(e.target.value)})} />
                                   </div>
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sell Price *</label>
                                   <div className="relative">
                                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                      <input required type="number" className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                         value={newOrderForm.sellPrice} onChange={e => setNewOrderForm({...newOrderForm, sellPrice: Number(e.target.value)})} />
                                   </div>
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ordered Quantity *</label>
                                   <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                      value={newOrderForm.stock} onChange={e => setNewOrderForm({...newOrderForm, stock: Number(e.target.value)})} />
                                </div>
                             </div>

                             {/* Row 5: Description */}
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description / Summary</label>
                                <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                   placeholder="Quick overview of the product..."
                                   value={newOrderForm.description} onChange={e => setNewOrderForm({...newOrderForm, description: e.target.value})} />
                             </div>

                             {/* Row 6: Specifications & Warranty */}
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Specifications</label>
                                   <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                                      rows={3}
                                      placeholder="6.7 inch display, 256GB storage, 8GB RAM..."
                                      value={newOrderForm.specifications} onChange={e => setNewOrderForm({...newOrderForm, specifications: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Warranty Period</label>
                                   <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                      placeholder="1 Year"
                                      value={newOrderForm.warrantyPeriod} onChange={e => setNewOrderForm({...newOrderForm, warrantyPeriod: e.target.value})} />
                                </div>
                             </div>
                          </div>

                          {/* Financial Execution Section */}
                          <div className="mt-10 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                             <h5 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-6">Financial Execution & Arrival Tracking</h5>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Bill Number</label>
                                   <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs focus:ring-2 focus:ring-blue-500/20"
                                      placeholder="Auto-generated if empty"
                                      value={restockData.billNumber} onChange={e => setRestockData({...restockData, billNumber: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Scheduled Arrival</label>
                                   <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs focus:ring-2 focus:ring-blue-500/20"
                                      value={restockData.date} onChange={e => setRestockData({...restockData, date: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Paid Now</label>
                                   <div className="relative">
                                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                      <input type="number" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold text-xs focus:ring-2 focus:ring-blue-500/20"
                                         value={restockData.paidAmount} onChange={e => setRestockData({...restockData, paidAmount: Number(e.target.value)})} />
                                   </div>
                                </div>
                             </div>

                             <div className="mt-8 flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
                                <div>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Contract Value</p>
                                   <p className="text-4xl font-black tracking-tighter">{formatCurrency((Number(newOrderForm.buyPrice) || 0) * (Number(newOrderForm.stock) || 0))}</p>
                                </div>
                                <button onClick={handleNewProductOrder} className="bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                   Confirm Order & Generate SKU
                                </button>
                             </div>
                          </div>
                       </div>
                  )}

                  {/* TAB: Arrivals Tracker */}
                  {activeTab === 'arrivals' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                             {purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && !po.isReceived).sort((a,b) => new Date(a.arrivalDate || '').getTime() - new Date(b.arrivalDate || '').getTime()).map(po => {
                                const isLate = new Date(po.arrivalDate || '') < new Date(new Date().setHours(0,0,0,0));
                                const isToday = new Date(po.arrivalDate || '').toDateString() === new Date().toDateString();
                                
                                return (
                                 <div key={po.id} className={cn("bg-white border rounded-[2.5rem] p-8 transition-all hover:shadow-xl group relative overflow-hidden", 
                                    isLate ? "border-rose-100 bg-rose-50/10" : isToday ? "border-blue-100 bg-blue-50/10" : "border-slate-100")}>
                                    
                                    <div className="flex items-center justify-between relative z-10">
                                       <div className="flex items-center gap-6">
                                          <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", 
                                             isLate ? "bg-rose-600 text-white" : isToday ? "bg-blue-600 text-white" : "bg-slate-900 text-white")}>
                                             <Truck className="w-8 h-8" />
                                          </div>
                                          <div>
                                             <div className="flex items-center gap-3 mb-1">
                                                <span className={cn("px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest", 
                                                   isLate ? "bg-rose-100 text-rose-700" : isToday ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700")}>
                                                   {isLate ? 'OVERDUE ARRIVAL' : isToday ? 'TODAY EXPECTED' : 'UPCOMING'}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill #{po.billNumber}</span>
                                             </div>
                                             <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">
                                                {po.items.length === 1 ? po.items[0].name : `${po.items.length} Product Varieties`}
                                             </h4>
                                             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5" /> Scheduled for {new Date(po.arrivalDate || '').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                             </div>
                                          </div>
                                       </div>
                                       
                                       <div className="text-right">
                                          <button onClick={() => {
                                             handleStockArrival(po.items);
                                             receiveOrder(po.id, new Date().toISOString());
                                          }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/10 transition-all active:scale-95 flex items-center gap-2">
                                             <CheckCircle2 className="w-4 h-4" /> Confirm & Receive
                                          </button>
                                       </div>
                                    </div>

                                    <div className="mt-8 grid grid-cols-4 gap-4 border-t border-slate-100 pt-6">
                                       {po.items.map((item, idx) => (
                                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                             <p className="text-[10px] font-black text-slate-900 truncate uppercase mb-1">{item.name}</p>
                                             <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-blue-600">Qty: {item.quantity}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{formatCurrency(item.buyPrice)}</span>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                    
                                    <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 -mt-16 -mr-16 rounded-full", 
                                       isLate ? "bg-rose-500" : isToday ? "bg-blue-500" : "bg-slate-500")}></div>
                                 </div>
                                );
                             })}
                             
                             {purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && !po.isReceived).length === 0 && (
                                <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[4rem]">
                                   <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                   <p className="text-slate-300 font-black uppercase tracking-widest text-[11px]">No pending arrivals tracked locally</p>
                                </div>
                             )}
                          </div>
                          
                          <div className="space-y-6">
                             <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                <h4 className="font-black uppercase tracking-widest text-blue-100 text-[10px] mb-6 relative z-10">Local Logistics Control</h4>
                                <div className="space-y-6 relative z-10">
                                   <div>
                                      <p className="text-3xl font-black tracking-tighter leading-none mb-1">{purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && !po.isReceived).length}</p>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Shipments in Transit</p>
                                   </div>
                                   <div className="h-px bg-white/10" />
                                   <p className="text-[10px] font-bold text-blue-50 leading-relaxed italic">"Financial entries are recorded immediately. Inventory stock is only updated once you confirm physical receipt of the items."</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                   {/* TAB 3: Financial Ledger */}
                   {activeTab === 'ledger' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                             <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                   <h4 className="font-black uppercase tracking-widest text-slate-900 text-xs flex items-center gap-2">
                                      <Receipt className="w-4 h-4 text-blue-500" />
                                      Invoice Settlement Hub
                                   </h4>
                                   <div className="flex gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Settled</div>
                                      <div className="flex items-center gap-1.5 ml-3"><div className="w-2 h-2 rounded-full bg-rose-500" /> Pending</div>
                                   </div>
                                </div>

                                {/* Advanced Ledger Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                   <div className="md:col-span-2 relative">
                                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                      <input type="text" placeholder="Search Bill # or Products..." 
                                         className="w-full bg-white border-0 rounded-2xl pl-11 pr-4 py-3 font-bold text-xs shadow-sm focus:ring-2 focus:ring-blue-500/20"
                                         value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
                                   </div>
                                   <div className="flex gap-2">
                                      <input type="date" className="flex-1 bg-white border-0 rounded-2xl px-3 py-2 font-bold text-[10px] shadow-sm"
                                         value={ledgerDateStart} onChange={e => setLedgerDateStart(e.target.value)} />
                                      <input type="date" className="flex-1 bg-white border-0 rounded-2xl px-3 py-2 font-bold text-[10px] shadow-sm"
                                         value={ledgerDateEnd} onChange={e => setLedgerDateEnd(e.target.value)} />
                                   </div>
                                   <select className="bg-white border-0 rounded-2xl px-4 py-2 font-black text-[10px] uppercase shadow-sm"
                                      value={ledgerStatus} onChange={e => setLedgerStatus(e.target.value as any)}>
                                      <option value="ALL">All Status</option>
                                      <option value="SETTLED">Settled Only</option>
                                      <option value="PENDING">Pending Only</option>
                                   </select>
                                </div>
                             </div>
                             <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-6">
                                <div className="space-y-4">
                                   {purchaseOrders.filter(po => {
                                      if (po.supplierId !== selectedSupplier.id) return false;
                                      
                                      // Search Filter
                                      const matchesSearch = po.billNumber?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                                                          po.items.some(i => i.name.toLowerCase().includes(ledgerSearch.toLowerCase()));
                                      
                                      // Date Filter
                                      const poDate = po.createdAt.split('T')[0];
                                      const matchesDate = (!ledgerDateStart || poDate >= ledgerDateStart) &&
                                                        (!ledgerDateEnd || poDate <= ledgerDateEnd);
                                      
                                      // Status Filter
                                      const isClear = po.dueAmount <= 0;
                                      const matchesStatus = ledgerStatus === 'ALL' || 
                                                          (ledgerStatus === 'SETTLED' && isClear) ||
                                                          (ledgerStatus === 'PENDING' && !isClear);

                                      return matchesSearch && matchesDate && matchesStatus;
                                   }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(po => {
                                      const isClear = po.dueAmount <= 0;
                                      return (
                                        <div key={po.id} onClick={() => setViewingBill(po)}
                                            className={cn("p-6 rounded-[2rem] border-2 transition-all cursor-pointer group relative overflow-hidden", 
                                            isClear ? "bg-emerald-50/30 border-emerald-100/50 hover:bg-emerald-50" : "bg-rose-50/30 border-rose-100/50 hover:bg-rose-50")}>
                                           
                                           <div className="flex items-center justify-between relative z-10">
                                              <div className="flex items-center gap-6">
                                                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", 
                                                    isClear ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")}>
                                                    <FileText className="w-7 h-7" />
                                                 </div>
                                                 <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice ID</p>
                                                       <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black", isClear ? "bg-emerald-100 text-emerald-700 font-mono" : "bg-rose-100 text-rose-700 font-mono")}>
                                                          #{po.billNumber}
                                                       </span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">
                                                       {po.items.length} {po.items.length === 1 ? 'Product Type' : 'Product Varieties'}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(po.createdAt).toLocaleDateString()}</span>
                                                       <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                       <span className="flex items-center gap-1"><Printer className="w-3 h-3" /> Click to Print Manifest</span>
                                                    </div>
                                                 </div>
                                              </div>

                                              <div className="text-right">
                                                 <div className="grid grid-cols-3 gap-8">
                                                    <div>
                                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Total</p>
                                                       <p className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(po.totalAmount)}</p>
                                                    </div>
                                                    <div>
                                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid Val</p>
                                                       <p className="text-lg font-black text-emerald-600 tracking-tighter">-{formatCurrency(po.paidAmount)}</p>
                                                    </div>
                                                    <div className={cn("px-4 py-2 rounded-2xl border transition-all", isClear ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-rose-200 text-rose-600 shadow-sm")}>
                                                       <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isClear ? "text-emerald-200" : "text-rose-400")}>Due Balance</p>
                                                       <p className="text-xl font-black tracking-tighter leading-none">{formatCurrency(po.dueAmount)}</p>
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>
                                           
                                           {/* Visual Indicators */}
                                           <div className={cn("absolute bottom-0 right-0 w-32 h-32 blur-3xl opacity-20 -mb-16 -mr-16 rounded-full transition-transform group-hover:scale-150", 
                                              isClear ? "bg-emerald-400" : "bg-rose-400")} />
                                        </div>
                                      );
                                   })}
                                   {purchaseOrders.filter(po => po.supplierId === selectedSupplier.id).length === 0 && (
                                      <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                                         <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Zero Purchase Records Identified</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                                <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-6 flex items-center gap-2">
                                   <Receipt className="w-4 h-4 text-blue-400" />
                                   Settlement Center
                                </h4>
                                <div className="space-y-6">
                                   <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">Target Bill Allocation</p>
                                      <select className="w-full bg-slate-800 border-0 rounded-2xl px-4 py-3.5 font-black text-[10px] uppercase tracking-widest text-white focus:ring-4 focus:ring-blue-500/10 mb-4"
                                          value={selectedBillId} onChange={e => setSelectedBillId(e.target.value)}>
                                          <option value="general">General Account Credit</option>
                                          <optgroup label="Pending Invoices">
                                             {purchaseOrders.filter(po => po.supplierId === selectedSupplier.id && po.dueAmount > 0).map(po => (
                                                <option key={po.id} value={po.id}>
                                                   Bill #{po.billNumber} - Due: {formatCurrency(po.dueAmount)}
                                                </option>
                                             ))}
                                          </optgroup>
                                      </select>

                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">Execution Limit</p>
                                      <div className="relative">
                                         <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                         <input type="number" className="w-full bg-slate-800 border-0 rounded-2xl pl-12 pr-4 py-4 font-black text-lg focus:ring-4 focus:ring-blue-500/10 placeholder-slate-600 transition-all" 
                                            placeholder="0.00" value={paymentAmount || ''} onChange={e => {
                                                const val = Number(e.target.value);
                                                setPaymentAmount(val);
                                            }} />
                                      </div>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">Payment Method</p>
                                      <div className="grid grid-cols-4 gap-2 mb-4">
                                         {['CASH', 'BANK', 'WALLET', 'OTHER'].map(m => (
                                            <button key={m} onClick={() => setPaymentMethod(m as any)}
                                               className={cn("py-2 rounded-xl border font-black text-[9px] transition-all", 
                                               paymentMethod === m ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700")}>
                                               {m}
                                            </button>
                                         ))}
                                      </div>

                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">Record Specification</p>
                                      <textarea className="w-full bg-slate-800 border-0 rounded-2xl px-4 py-4 font-bold text-xs focus:ring-4 focus:ring-blue-500/10 placeholder-slate-600 transition-all resize-none" 
                                         rows={2} placeholder="EX: BANK TRANSFER - AXIS BANK..." value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} />
                                   </div>
                                   <div className="grid grid-cols-2 gap-3 pt-2">
                                      <button onClick={() => handlePayment('PAYMENT')} 
                                         className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/10 transition-all active:scale-95">
                                         Execute Pay
                                      </button>
                                      <button onClick={() => handlePayment('SETTLEMENT')}
                                         className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/10 transition-all active:scale-95">
                                         Final Settle
                                      </button>
                                   </div>
                                </div>
                             </div>

                             <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                <h4 className="font-black uppercase tracking-widest text-blue-900 text-[10px] mb-4 relative z-10">Real-time Liquidity Status</h4>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter relative z-10">{formatCurrency(getSupplierBalance(selectedSupplier.id))}</p>
                                <div className="flex items-center gap-2 mt-4 relative z-10">
                                   <div className="px-3 py-1 bg-white rounded-lg border border-blue-200">
                                      <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">Status Code</p>
                                      <p className="text-[10px] font-black text-slate-900 tracking-tight mt-0.5">DUES_ACTIVE</p>
                                   </div>
                                   <TrendingUp className="w-6 h-6 text-blue-400 ml-auto" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
        </Modal>
      )}

      {/* Bill Details Modal */}
      {viewingBill && (
         <Modal isOpen={true} onClose={() => setViewingBill(null)} title={`Purchase Manifest: #${viewingBill.billNumber || 'N/A'}`}>
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entry Date</p>
                     <p className="text-xs font-bold text-slate-900">{new Date(viewingBill.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current Status</p>
                     <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", 
                        viewingBill.status === 'SETTLED' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                        {viewingBill.status}
                     </span>
                  </div>
               </div>

               <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[10px]">
                     <thead className="bg-slate-50/50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                           <th className="px-4 py-3">Item Description</th>
                           <th className="px-4 py-3 w-20">Qty</th>
                           <th className="px-4 py-3 text-right">Price</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {viewingBill.items.map((item, i) => (
                           <tr key={i}>
                              <td className="px-4 py-3 font-bold text-slate-700 uppercase">{item.name}</td>
                              <td className="px-4 py-3 font-black">{item.quantity}</td>
                              <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.buyPrice)}</td>
                           </tr>
                        ))}
                     </tbody>
                     <tfoot className="bg-slate-50/30">
                        <tr>
                           <td colSpan={2} className="px-4 py-4 text-right font-black uppercase tracking-widest text-[8px] text-slate-400">Net Invoice</td>
                           <td className="px-4 py-4 text-right font-black text-slate-900 text-lg">{formatCurrency(viewingBill.totalAmount)}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                     <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Paid to Date</p>
                     <p className="text-lg font-black text-emerald-700">{formatCurrency(viewingBill.paidAmount)}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                     <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Outstanding</p>
                     <p className="text-lg font-black text-rose-700">{formatCurrency(viewingBill.dueAmount)}</p>
                  </div>
               </div>

               {viewingBill.payments && viewingBill.payments.length > 0 && (
                  <div className="space-y-3">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment History Timeline</p>
                     <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {viewingBill.payments.map((p, i) => (
                           <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{p.method} PAYMENT</p>
                                    <p className="text-[8px] text-slate-400 font-bold">{new Date(p.date).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <p className="font-black text-emerald-600 text-xs">-{formatCurrency(p.amount)}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => {
                     const printContent = `
                        <html>
                        <head>
                           <title>Voucher - ${viewingBill.billNumber}</title>
                           <style>
                              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                              body { font-family: 'Inter', sans-serif; padding: 50px; color: #0f172a; line-height: 1.5; }
                              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; border-bottom: 4px solid #0f172a; padding-bottom: 30px; }
                              .shop-info h1 { margin: 0; font-weight: 900; text-transform: uppercase; font-size: 28px; letter-spacing: -1px; }
                              .shop-info p { margin: 5px 0; font-size: 12px; font-weight: 700; color: #64748b; }
                              .voucher-title { text-align: right; }
                              .voucher-title h2 { margin: 0; font-weight: 900; text-transform: uppercase; font-size: 32px; color: #0f172a; }
                              .voucher-title p { margin: 5px 0; font-size: 14px; font-weight: 900; color: #3b82f6; }
                              
                              .info-grid { display: grid; grid-cols: 2; display: flex; justify-content: space-between; margin-bottom: 50px; background: #f8fafc; padding: 30px; border-radius: 20px; }
                              .info-box h3 { margin-top: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
                              .info-box p { margin: 2px 0; font-size: 13px; font-weight: 700; }

                              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                              th { text-align: left; padding: 15px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                              td { padding: 15px; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; }
                              .text-right { text-align: right; }
                              
                              .summary-section { display: flex; justify-content: flex-end; margin-bottom: 50px; }
                              .summary-box { width: 300px; }
                              .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: 700; }
                              .summary-row.total { border-top: 2px solid #0f172a; margin-top: 10px; padding-top: 20px; font-size: 20px; font-weight: 900; }
                              .summary-row.paid { color: #059669; }
                              .summary-row.due { color: #dc2626; }

                              .timeline { margin-bottom: 40px; }
                              .timeline h3 { font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px; border-left: 4px solid #3b82f6; padding-left: 15px; }
                              .timeline-item { display: flex; justify-content: space-between; padding: 12px 15px; background: #fdfdfd; border: 1px solid #f1f5f9; margin-bottom: 8px; border-radius: 12px; font-size: 12px; font-weight: 700; }
                              .timeline-item span { color: #64748b; font-size: 10px; text-transform: uppercase; }

                              .footer { margin-top: 80px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 30px; font-size: 11px; font-weight: 700; color: #94a3b8; }
                           </style>
                        </head>
                        <body>
                           <div class="header">
                              <div class="shop-info">
                                 <h1>${shopDetails.storeName}</h1>
                                 <p>${shopDetails.addressLine1}, ${shopDetails.addressLine2}</p>
                                 <p>CONTACT: ${shopDetails.phone} | VAT: ${shopDetails.VATIn || 'N/A'}</p>
                              </div>
                              <div class="voucher-title">
                                 <h2>PURCHASE VOUCHER</h2>
                                 <p># ${viewingBill.billNumber}</p>
                                 <p style="color: #64748b; font-size: 11px;">DATE: ${new Date(viewingBill.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>

                           <div class="info-grid">
                              <div class="info-box">
                                 <h3>SUPPLIER IDENTITY</h3>
                                 <p style="font-size: 18px; color: #0f172a;">${selectedSupplier.name}</p>
                                 <p>${selectedSupplier.address}</p>
                                 <p>VATIN: ${selectedSupplier.VATIn || 'N/A'}</p>
                                 <p>CONTACT: ${selectedSupplier.phone}</p>
                              </div>
                              <div class="info-box" style="text-align: right;">
                                 <h3>MANIFEST SUMMARY</h3>
                                 <p>TOTAL ITEMS: ${viewingBill.items.length}</p>
                                 <p>STATUS: ${viewingBill.status}</p>
                                 <p>PRINTED ON: ${new Date().toLocaleString()}</p>
                              </div>
                           </div>

                           <table>
                              <thead>
                                 <tr>
                                    <th>DESCRIPTION</th>
                                    <th class="text-right">QTY</th>
                                    <th class="text-right">UNIT PRICE</th>
                                    <th class="text-right">TOTAL</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 ${viewingBill.items.map(i => `
                                    <tr>
                                       <td style="text-transform: uppercase;">${i.name}</td>
                                       <td class="text-right">${i.quantity}</td>
                                       <td class="text-right">${formatCurrency(i.buyPrice)}</td>
                                       <td class="text-right">${formatCurrency(i.total)}</td>
                                    </tr>
                                 `).join('')}
                              </tbody>
                           </table>

                           <div class="summary-section">
                              <div class="summary-box">
                                 <div class="summary-row">
                                    <span>Gross Sub-Total</span>
                                    <span>${formatCurrency(viewingBill.totalAmount)}</span>
                                 </div>
                                 <div class="summary-row paid">
                                    <span>Total Payments Realized</span>
                                    <span>- ${formatCurrency(viewingBill.paidAmount)}</span>
                                 </div>
                                 <div class="summary-row total due">
                                    <span>Balance Outstanding</span>
                                    <span>${formatCurrency(viewingBill.dueAmount)}</span>
                                 </div>
                              </div>
                           </div>

                           ${viewingBill.payments && viewingBill.payments.length > 0 ? `
                              <div class="timeline">
                                 <h3>POLYTROPIC SETTLEMENT TIMELINE</h3>
                                 ${viewingBill.payments.map(p => `
                                    <div class="timeline-item">
                                       <div>
                                          <div style="margin-bottom: 2px;">${p.description || 'Partial Payment'}</div>
                                          <span>BY ${p.method} • ID: ${p.id.slice(0,8)}</span>
                                       </div>
                                       <div style="text-align: right;">
                                          <div style="color: #059669;">- ${formatCurrency(p.amount)}</div>
                                          <span>${new Date(p.date).toLocaleDateString()}</span>
                                       </div>
                                    </div>
                                 `).join('')}
                              </div>
                           ` : ''}

                           <div class="footer">
                              <p>${shopDetails.footerText}</p>
                              <p style="margin-top: 10px; font-size: 8px; font-weight: 400; color: #cbd5e1;">GENERATED BY ANTIGRAVITY POS SYSTEM</p>
                           </div>

                           <script>
                              window.onload = function() { window.print(); }
                           </script>
                        </body>
                        </html>
                     `;
                     const printWindow = window.open('', '_blank');
                     if (printWindow) {
                        printWindow.document.write(printContent);
                        printWindow.document.close();
                     }
                  }} className="w-full bg-white border-2 border-slate-200 text-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-slate-50">
                     <Printer className="w-4 h-4" /> Print Vouchers
                  </button>
                  <button onClick={() => {
                     setSelectedBillId(viewingBill.id);
                     setPaymentAmount(viewingBill.dueAmount);
                     setViewingBill(null);
                     setActiveTab('ledger');
                  }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-slate-900/10">
                     Load Settlement Center
                  </button>
               </div>
            </div>
         </Modal>
      )}

      {/* Add/Edit Supplier Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingId(null); }} title={editingId ? "Update Partner Identity" : "New Partner Registry"}>
        <form onSubmit={handleAddSupplier} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Company Information</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Company Name *</label>
                        <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                           placeholder="Global Electronics Ltd"
                           value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Category</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                           placeholder="Mobile Distributor"
                           value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                     </div>
                  </div>
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contact Protocol</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Contact Person</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                           placeholder="John Doe"
                           value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Direct Line *</label>
                        <input required type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                           placeholder="+977 9800000000"
                           value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tax / VAT ID</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                     placeholder="VAT-888-999"
                     value={formData.VATIn} onChange={e => setFormData({...formData, VATIn: e.target.value})} />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Payment Terms</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10"
                     value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})}>
                     <option value="Immediate">Immediate Settlement</option>
                     <option value="Net 15">Net 15 Days</option>
                     <option value="Net 30">Net 30 Days</option>
                     <option value="Net 60">Net 60 Days</option>
                     <option value="Consignment">Consignment Basis</option>
                  </select>
               </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Full Address</label>
               <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="123 Tech Park, Kathmandu"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 active:scale-95">
               {editingId ? "Update Partner Credentials" : "Initialize Partner Protocol"}
            </button>
        </form>
      </Modal>


      <style>{`
        .rounded-all-mask {
           border-radius: 35% 65% 68% 32% / 37% 33% 67% 63%;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Suppliers;
