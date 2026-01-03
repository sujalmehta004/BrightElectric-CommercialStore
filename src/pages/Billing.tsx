import { useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, CreditCard, Banknote, Smartphone, ArrowRight, User, Printer, ImageIcon } from 'lucide-react';
import { useInventory } from '../stores/useInventory';
import { useCart } from '../stores/useCart';
import { useSales } from '../stores/useSales';
import { useCustomers } from '../stores/useCustomers';
import { formatCurrency, cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import type { Customer, PaymentMethod, PaymentStatus, PaymentRecord } from '../types';
import { UserPlus } from 'lucide-react';import { Modal } from '../components/Modal';

const Billing = () => {
  const { products, decreaseStock } = useInventory();
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { addSale } = useSales();
  const { customers, updateCustomerPurchase } = useCustomers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null); // Use Sale type
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // Product detail modal

  // Advanced Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState<string>(''); // string input for ease
  const [discountAmount, setDiscountAmount] = useState<string>(''); // Discount amount
  const [discountPercent, setDiscountPercent] = useState<string>(''); // Discount percent
  
  const cartTotal = total();
  
  const filteredProducts = products.filter(p => 
    ((p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (p.serialNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.specifications?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.customId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())) &&
    p.stock > 0
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const handleCheckout = () => {
    if (items.length === 0) return;

    const validDiscount = Number(discountAmount) || 0;
    const finalTotal = Math.max(0, cartTotal - validDiscount);

    const finalPaidAmount = paidAmount === '' ? finalTotal : Number(paidAmount);
    // Ensure finalPaidAmount is a valid number, default to 0 if NaN
    const validPaidAmount = isNaN(finalPaidAmount) ? 0 : finalPaidAmount;
    
    const dueAmount = finalTotal - validPaidAmount;
    const paymentStatus: PaymentStatus = dueAmount <= 0 ? 'PAID' : 'PARTIAL';

    const saleProfit = items.reduce((acc, item) => {
      const product = products.find(p => p.id === item.id);
      const buyPrice = product ? product.buyPrice : 0;
      return acc + ((item.sellPrice - buyPrice) * item.quantity);
    }, 0) - validDiscount; // Deduct global discount from profit

    const initialPayment: PaymentRecord = {
      id: uuidv4(),
      amount: validPaidAmount,
      method: paymentMethod,
      date: new Date().toISOString(),
      note: 'Initial Payment'
    };

    const sale = {
      id: uuidv4(),
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
      items: [...items],
      subTotal: cartTotal,
      tax: 0,
      discount: validDiscount,
      totalAmount: finalTotal,
      paidAmount: validPaidAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      profit: saleProfit,
      paymentMethod,
      paymentStatus,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Walk-in',
      createdAt: new Date().toISOString(),
      payments: validPaidAmount > 0 ? [initialPayment] : [],
    };

    addSale(sale);
    items.forEach(item => decreaseStock(item.id, item.quantity));
    
    if (selectedCustomer) {
      updateCustomerPurchase(selectedCustomer.id, cartTotal);
    }

    // Set success state effectively showing the modal via boolean or local state
    // For simplicity, we'll keep the cart state until they choose an action
    // But logically, the sale is DONE. So we should clear cart.
    clearCart();
    setSelectedCustomer(null);
    setPaidAmount('');
    setDiscountAmount('');
    setDiscountPercent('');
    
    // We need to pass the sale object to the modal for printing
    setLastSale(sale);
    setShowSuccessModal(true);
  };


  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* LEFT: Product Browser */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-3 border-b border-slate-100 flex gap-3 bg-slate-50/50">
           <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Scan Barcode or Search Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Product Grid - Compact */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col gap-2 h-auto relative"
              >
                <div 
                  onClick={() => setSelectedProduct(product)}
                  className="w-full h-24 rounded-lg bg-slate-50 border border-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-blue-100 transition-colors cursor-pointer">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-200" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-[11px] truncate mb-0.5">{product.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mb-1 font-medium italic">
                    {product.specifications || "No specs"}
                  </p>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Sell</span>
                      <span className="font-bold text-blue-600 text-xs">{formatCurrency(product.sellPrice)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Buy</span>
                      <span className="font-bold text-slate-600 text-[10px]">{formatCurrency(product.buyPrice)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-emerald-600">
                      +{formatCurrency(product.sellPrice - product.buyPrice)} profit
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded",
                      product.stock <= 5 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {product.stock}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  className="absolute bottom-2 right-2 w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                  title="Add to Cart"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Billing/Cart Panel */}
      <div className="w-full lg:w-96 bg-white rounded-lg border border-slate-200 shadow-xl flex flex-col flex-shrink-0 z-10">
        
        {/* Validated Customer Section */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
           {selectedCustomer ? (
             <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                   {selectedCustomer.name.slice(0,2).toUpperCase()}
                 </div>
                   <div>
                   <p className="font-bold text-blue-900 text-xs">{selectedCustomer.name}</p>
                   <p className="text-[10px] text-blue-600">{selectedCustomer.phone}</p>
                   <div className="flex gap-2 mt-0.5">
                      <span className="text-[9px] bg-blue-200 text-blue-800 px-1 rounded font-bold">
                        {selectedCustomer.visitCount || 0} Visits
                      </span>
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold">
                        {selectedCustomer.loyaltyPoints || 0} Points
                      </span>
                   </div>
                 </div>
               </div>
               <button onClick={() => setSelectedCustomer(null)} className="text-xs text-slate-400 hover:text-red-500 hover:underline">Change</button>
             </div>
           ) : (
             <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Customer (Name/Phone)..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    onClick={() => setShowAddCustomer(true)}
                    type="button"
                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
                    title="Add New Customer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
                {customerSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-lg rounded-b mt-1 max-h-40 overflow-y-auto z-20">
                     {filteredCustomers.map(c => (
                       <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }} className="p-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-50 flex justify-between">
                         <span className="font-medium text-slate-700">{c.name}</span>
                         <span className="text-slate-400">{c.phone}</span>
                       </div>
                     ))}
                     {filteredCustomers.length === 0 && (
                       <div className="p-2 text-xs text-slate-400 text-center">No Result</div>
                     )}
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
          {items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300">
               <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
               <p className="text-xs">Cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-blue-100 bg-slate-50 group">
                <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-slate-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-[11px] truncate">{item.name}</h4>
                  {item.specifications && (
                    <p className="text-[9px] text-slate-400 truncate italic leading-tight">{item.specifications}</p>
                  )}
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 font-medium">
                     <span>{formatCurrency(item.sellPrice)} x {item.quantity}</span>
                     <span className="font-bold text-slate-700">= {formatCurrency(item.sellPrice * item.quantity)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                   <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Minus className="w-3 h-3"/></button>
                   <input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                         const val = parseInt(e.target.value);
                         if (!isNaN(val) && val > 0) {
                            updateQuantity(item.id, val);
                         }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-10 text-center text-xs font-bold border border-slate-200 rounded py-0.5 focus:ring-1 focus:ring-blue-500 outline-none" 
                   />
                   <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100"><Plus className="w-3 h-3"/></button>
                   <button onClick={() => removeFromCart(item.id)} className="ml-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Totals */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
           {/* Payment Method Selector */}
           <div className="flex gap-2 mb-4">
             {[
               { id: 'CASH', icon: Banknote, label: 'Cash' },
               { id: 'WALLET', icon: Smartphone, label: 'WALLET' },
               { id: 'CARD', icon: CreditCard, label: 'Card' }
             ].map(m => (
               <button
                 key={m.id}
                 onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                 className={cn(
                   "flex-1 flex flex-col items-center justify-center py-2 rounded border transition-all text-xs gap-1",
                   paymentMethod === m.id 
                     ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                     : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                 )}
               >
                 <m.icon className="w-4 h-4" />
                 {m.label}
               </button>
             ))}
           </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                 <span>Discount</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  <input 
                    type="number" 
                    value={discountPercent}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      setDiscountPercent(val);
                      if (!val) {
                        setDiscountAmount('');
                      } else {
                        const amount = (cartTotal * Number(val)) / 100;
                        setDiscountAmount(amount.toFixed(2));
                      }
                    }}
                    className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold text-slate-800 text-sm"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={discountAmount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      setDiscountAmount(val);
                      if (!val) {
                        setDiscountPercent('');
                      } else {
                        const percent = (Number(val) / cartTotal) * 100;
                        setDiscountPercent(percent.toFixed(2));
                      }
                    }}
                    className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold text-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Amount Input (For Partial) */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Paying Amount</span>
                <span>Total: {formatCurrency(Math.max(0, cartTotal - (Number(discountAmount) || 0)))}</span>
              </div>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input 
                  type="number" 
                  value={paidAmount}
                  placeholder={Math.max(0, cartTotal - (Number(discountAmount) || 0)).toString()}
                  onFocus={(e) => e.target.select()}
                 onChange={e => setPaidAmount(e.target.value)}
                 className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold text-slate-800"
               />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500">
                    Due: {formatCurrency(Math.max(0, cartTotal - (Number(discountAmount) || 0)) - Number(paidAmount))}
                  </span>
             </div>
           </div>

           <div className="border-t border-slate-200 pt-3 flex justify-between items-center mb-3">
              <span className="font-bold text-lg text-slate-800">Total</span>
              <span className="font-bold text-2xl text-blue-600">{formatCurrency(Math.max(0, cartTotal - (Number(discountAmount) || 0)))}</span>
           </div>

            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              className={cn(
                "w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]",
                showSuccessModal ? "bg-green-500 shadow-green-500/20" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
              )}
            >
              {showSuccessModal ? <CheckCircle className="w-5 h-5"/> : <ArrowRight className="w-5 h-5"/>}
              {showSuccessModal ? "Order Completed!" : `Print Invoice (F1)`}
            </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center transform transition-all scale-100">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-1">Sale Completed!</h3>
               <p className="text-slate-500 text-sm mb-6">Invoice #{lastSale?.invoiceNo} generated successfully.</p>
               
               <div className="space-y-3">
                   <button 
                     onClick={() => {
                        // We will use a URL parameter logic in Invoices page to auto-print
                        window.location.href = `/invoices?print=${lastSale.id}`; 
                     }}
                     className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center gap-2"
                   >
                      <Printer className="w-5 h-5" />
                      Print / View Invoice
                   </button>
                   <button 
                     onClick={() => setShowSuccessModal(false)}
                     className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                   >
                      New Sale
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <Modal 
          isOpen={showAddCustomer} 
          onClose={() => setShowAddCustomer(false)} 
          title="Add New Customer"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Customer Name *</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="John Doe"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Phone Number *</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="98XXXXXXXX"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Address (Optional)</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="City, Area"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={() => {
                if(!newCustomer.name || !newCustomer.phone) return alert('Name and Phone are required');
                const customer = {
                  id: uuidv4(),
                  ...newCustomer,
                  totalPurchases: 0,
                  createdAt: new Date().toISOString()
                };
                const { addCustomer } = useCustomers.getState();
                addCustomer(customer);
                setSelectedCustomer(customer);
                setShowAddCustomer(false);
                setNewCustomer({ name: '', phone: '', email: '', address: '' });
              }}
              className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-800 transition-all"
            >
              Save & Select Customer
            </button>
          </div>
        </Modal>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal isOpen={true} onClose={() => setSelectedProduct(null)} title="Product Details">
          <div className="space-y-6">
            {/* Product Image */}
            <div className="w-full h-64 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-16 h-16 text-slate-200" />
              )}
            </div>

            {/* Product Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Product Name</label>
                <p className="font-bold text-slate-900 text-lg">{selectedProduct.name}</p>
              </div>

              {selectedProduct.brand && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Brand</label>
                  <p className="font-bold text-slate-700 text-sm">{selectedProduct.brand}</p>
                </div>
              )}

              {selectedProduct.model && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Model</label>
                  <p className="font-bold text-slate-700 text-sm">{selectedProduct.model}</p>
                </div>
              )}

              {selectedProduct.category && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                  <p className="font-bold text-slate-700 text-sm">{selectedProduct.category}</p>
                </div>
              )}

              {selectedProduct.serialNo && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Serial / IMEI</label>
                  <p className="font-mono text-slate-700 text-sm font-bold">{selectedProduct.serialNo}</p>
                </div>
              )}

              {selectedProduct.customId && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">SKU / Custom ID</label>
                  <p className="font-mono text-slate-700 text-sm font-bold">{selectedProduct.customId}</p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stock Available</label>
                <p className={cn("font-black text-lg", 
                  selectedProduct.stock <= 0 ? "text-rose-600" : 
                  selectedProduct.stock <= 5 ? "text-orange-600" : "text-emerald-600"
                )}>
                  {selectedProduct.stock} Units
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sell Price</label>
                <p className="font-black text-blue-600 text-2xl">{formatCurrency(selectedProduct.sellPrice)}</p>
              </div>

              {selectedProduct.warrantyPeriod && (
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Warranty</label>
                  <p className="font-bold text-slate-700 text-sm">{selectedProduct.warrantyPeriod}</p>
                </div>
              )}

              {selectedProduct.description && (
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                  <p className="text-slate-600 text-sm">{selectedProduct.description}</p>
                </div>
              )}

              {selectedProduct.specifications && (
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specifications</label>
                  <p className="text-slate-600 text-sm whitespace-pre-wrap">{selectedProduct.specifications}</p>
                </div>
              )}
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={() => {
                addToCart(selectedProduct);
                setSelectedProduct(null);
              }}
              disabled={selectedProduct.stock <= 0}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                selectedProduct.stock <= 0 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
              )}
            >
              <ShoppingCart className="w-5 h-5" />
              {selectedProduct.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Billing;
