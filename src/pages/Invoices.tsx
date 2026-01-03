import React, { useState } from 'react';
import { useSales } from '../stores/useSales';
import { useCustomers } from '../stores/useCustomers'; // Import hook
import type { Sale } from '../types';
import { formatCurrency, cn } from '../utils';
import { Search, Printer, Eye, CreditCard, History, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../components/Modal';
import { useShopSettings } from '../stores/useShopSettings';

const Invoices = () => {
  const { sales } = useSales();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');
  const { customers } = useCustomers();
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null); // Missing state added
  const [showPartialPay, setShowPartialPay] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialMethod, setPartialMethod] = useState<'CASH' | 'CARD' | 'WALLET' | 'TRANSFER' | 'OTHER'>('CASH');
  const { addPayment } = useSales();

  // Auto-print logic if navigated from Billing
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const printId = params.get('print');
    if (printId) {
        const saleToPrint = sales.find(s => s.id === printId);
        if (saleToPrint) {
            handlePrint(saleToPrint);
            // Optional: Remove param to prevent reprint on refresh
            window.history.replaceState({}, '', '/invoices');
        }
    }
  }, [sales]);

  const filteredSales = sales.filter(s => {
    const matchesSearch = (s.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' 
      ? true 
      : filter === 'DUE' 
        ? s.dueAmount > 0 
        : s.dueAmount === 0;
    return matchesSearch && matchesFilter;
  });

  const handleSettleDue = () => {
    if (!selectedInvoice) return;
    
    const payment = {
      id: uuidv4(),
      amount: selectedInvoice.dueAmount,
      method: 'CASH' as const,
      date: new Date().toISOString(),
      note: 'Full Settlement'
    };
    
    addPayment(selectedInvoice.id, payment);
    setSelectedInvoice(prev => prev ? {
      ...prev,
      payments: [...(prev.payments || []), payment],
      paidAmount: prev.totalAmount,
      dueAmount: 0,
      paymentStatus: 'PAID'
    } : null);
  };

  const handlePartialPayment = () => {
    if (!selectedInvoice || !partialAmount) return;
    const amount = Number(partialAmount);
    if (amount <= 0 || amount > selectedInvoice.dueAmount) return alert('Invalid Amount');

    const payment = {
      id: uuidv4(),
      amount,
      method: partialMethod,
      date: new Date().toISOString(),
      note: 'Partial Payment'
    };

    addPayment(selectedInvoice.id, payment);
    setSelectedInvoice(prev => {
      if (!prev) return null;
      const updatedPayments = [...(prev.payments || []), payment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...prev,
        payments: updatedPayments,
        paidAmount: totalPaid,
        dueAmount: prev.totalAmount - totalPaid,
        paymentStatus: (prev.totalAmount - totalPaid) <= 0 ? 'PAID' : 'PARTIAL'
      };
    });
    
    setShowPartialPay(false);
    setPartialAmount('');
  };


  // Fetch shop details for printing
  const { details: shopDetails } = useShopSettings();

  const handlePrint = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${sale.invoiceNo}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; margin: 0; padding: 40px; color: #1e293b; max-width: 210mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 30px; margin-bottom: 30px; }
            .logo-section { display: flex; gap: 20px; align-items: center; }
            .shop-logo { height: 80px; width: auto; max-width: 150px; object-fit: contain; }
            .shop-info h1 { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
            .shop-info p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
            .invoice-info { text-align: right; }
            .invoice-title { font-size: 32px; font-weight: 800; color: #cbd5e1; margin: 0; line-height: 1; }
            .invoice-details { margin-top: 15px; }
            .invoice-details p { margin: 2px 0; font-size: 14px; }
            
            .bill-to { margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px; }
            .bill-to h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .customer-name { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; }
            
            table { w-full; border-collapse: collapse; margin-bottom: 30px; width: 100%; }
            th { text-align: left; padding: 12px 0; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
            td { padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .total-row td { border-bottom: none; border-top: 2px solid #0f172a; font-weight: bold; font-size: 16px; padding-top: 20px; }
            
            .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .terms { margin-top: 40px; font-size: 12px; color: #64748b; }
            
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .paid { background: #d1fae5; color: #065f46; }
            .due { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${shopDetails.logo ? `<img src="${shopDetails.logo}" class="shop-logo" />` : ''}
              <div class="shop-info">
                <h1>${shopDetails.storeName}</h1>
                <p>${shopDetails.addressLine1}</p>
                <p>${shopDetails.addressLine2}</p>
                <p>Phone: ${shopDetails.phone}</p>
                <p>Email: ${shopDetails.email}</p>
                ${shopDetails.VATIn ? `<p>VAT/VAT: ${shopDetails.VATIn}</p>` : ''}
              </div>
            </div>
            <div class="invoice-info">
              <h2 class="invoice-title">INVOICE</h2>
              <div class="invoice-details">
                <p><strong>#${sale.invoiceNo}</strong></p>
                <p>Date: ${new Date(sale.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div class="bill-to">
            <h3>Bill To</h3>
            <p class="customer-name">${sale.customerName || 'Walk-in Customer'}</p>
            ${sale.customerId ? `<p>ID: ${sale.customerId.slice(0,8).toUpperCase()}</p>` : ''}
            ${(() => {
              if (sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                return customer ? `<p style="margin-top: 5px; font-weight: bold; color: #0f172a;">Loyalty Points: ${customer.loyaltyPoints || 0}</p>` : '';
              }
              return '';
            })()}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">Description</th>
                <th class="text-right" style="width: 15%">Qty</th>
                <th class="text-right" style="width: 15%">Price</th>
                <th class="text-right" style="width: 20%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.name}</strong>
                    <div style="font-size: 12px; color: #64748b">${item.serialNo || '-'}</div>
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.sellPrice)}</td>
                  <td class="text-right font-bold">${formatCurrency(item.sellPrice * item.quantity)}</td>
                </tr>
              `).join('')}
              
              <tr>
                 <td colspan="2"></td>
                 <td class="text-right" style="padding-top: 20px;">Subtotal</td>
                 <td class="text-right" style="padding-top: 20px;">${formatCurrency(sale.subTotal || 0)}</td>
              </tr>
              <tr>
                 <td colspan="2"></td>
                 <td class="text-right">Discount</td>
                 <td class="text-right text-red-600">-${formatCurrency(sale.discount || 0)}</td>
              </tr>
              <tr class="total-row">
                 <td colspan="2"></td>
                 <td class="text-right">Total</td>
                 <td class="text-right">${formatCurrency(sale.totalAmount || 0)}</td>
              </tr>
               <tr>
                 <td colspan="2"></td>
                 <td class="text-right" style="color: #059669; padding-top: 10px;">Paid</td>
                 <td class="text-right" style="color: #059669; padding-top: 10px;">${formatCurrency(sale.paidAmount || 0)}</td>
              </tr>
              <tr>
                 <td colspan="2"></td>
                 <td class="text-right" style="color: #dc2626;">Balance Due</td>
                 <td class="text-right" style="color: #dc2626;">${formatCurrency(sale.dueAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
             <div class="terms">
                <strong>Terms & Conditions:</strong>
                <p>${shopDetails.footerText}</p>
             </div>
             <div class="status-badge ${sale.dueAmount > 0 ? 'due' : 'paid'}">
                ${sale.dueAmount > 0 ? 'Payment Pending' : 'Paid in Full'}
             </div>
          </div>

          <div class="footer">
            <p>Generated by ElectroPOS System</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Invoices</h2>
           <p className="text-slate-500 text-sm">Manage sales history and dues</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilter('ALL')} className={cn("px-3 py-1 rounded text-sm font-medium", filter === 'ALL' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border")}>All</button>
           <button onClick={() => setFilter('DUE')} className={cn("px-3 py-1 rounded text-sm font-medium", filter === 'DUE' ? "bg-red-600 text-white" : "bg-white text-slate-600 border")}>Dues Pending</button>
           <button onClick={() => setFilter('PAID')} className={cn("px-3 py-1 rounded text-sm font-medium", filter === 'PAID' ? "bg-green-600 text-white" : "bg-white text-slate-600 border")}>Paid</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex items-center gap-4">
             <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search by Invoice # or Customer Name..." 
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                     <th className="px-6 py-3">Invoice #</th>
                     <th className="px-6 py-3">Date</th>
                     <th className="px-6 py-3">Customer</th>
                     <th className="px-6 py-3 text-right">Total</th>
                     <th className="px-6 py-3 text-right">Paid</th>
                     <th className="px-6 py-3 text-right">Due</th>
                     <th className="px-6 py-3 text-center">Status</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredSales.map(sale => (
                     <tr key={sale.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-3 font-mono text-slate-600 font-bold">{sale.invoiceNo}</td>
                        <td className="px-6 py-3 text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{sale.customerName || 'Walk-in Customer'}</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-900">{formatCurrency(sale.totalAmount || 0)}</td>
                        <td className="px-6 py-3 text-right text-green-600">{formatCurrency(sale.paidAmount || 0)}</td>
                        <td className="px-6 py-3 text-right text-red-600 font-bold">{sale.dueAmount > 0 ? formatCurrency(sale.dueAmount) : '-'}</td>
                        <td className="px-6 py-3 text-center">
                           <span className={cn(
                             "px-2 py-1 rounded text-xs font-bold",
                             sale.dueAmount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                           )}>
                             {sale.dueAmount > 0 ? 'DUE' : 'PAID'}
                           </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={() => setSelectedInvoice(sale)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                                <Eye className="w-4 h-4" />
                             </button>
                             <button onClick={() => handlePrint(sale)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Print Invoice">
                                <Printer className="w-4 h-4" />
                             </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {filteredSales.length === 0 && (
               <div className="p-12 text-center text-slate-400">
                  No invoices found matching your criteria.
               </div>
            )}
         </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`Invoice #${selectedInvoice.invoiceNo}`}>
           <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                 <div>
                    <h3 className="font-bold text-lg">{selectedInvoice.customerName || 'Walk-in Customer'}</h3>
                    <p className="text-sm text-slate-500">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm text-slate-500">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedInvoice.totalAmount)}</p>
                 </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                 <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                       <tr>
                          <th className="px-4 py-2 text-left">Item</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2 text-right">Price</th>
                          <th className="px-4 py-2 text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {selectedInvoice.items.map((item, idx) => (
                          <tr key={idx}>
                             <td className="px-4 py-2">{item.name}</td>
                             <td className="px-4 py-2 text-right">{item.quantity}</td>
                             <td className="px-4 py-2 text-right">{formatCurrency(item.sellPrice)}</td>
                             <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.sellPrice * item.quantity)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="space-y-2 pt-2 border-t text-sm">
                 <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedInvoice.subTotal || 0)}</span></div>
                 <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatCurrency(selectedInvoice.discount || 0)}</span></div>
                 <div className="flex justify-between font-bold text-lg pt-2 border-t text-slate-900"><span>Total</span><span>{formatCurrency(selectedInvoice.totalAmount || 0)}</span></div>
                 <div className="flex justify-between text-emerald-600 font-medium"><span>Total Paid</span><span>{formatCurrency(selectedInvoice.paidAmount || 0)}</span></div>
                 <div className="flex justify-between text-rose-600 font-bold"><span>Balance Due</span><span>{formatCurrency(selectedInvoice.dueAmount || 0)}</span></div>
              </div>

              {/* Payment History Section */}
              <div className="pt-4 border-t">
                 <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                       <History className="w-4 h-4" /> Payment History
                    </h4>
                    {selectedInvoice.dueAmount > 0 && !showPartialPay && (
                       <button 
                          onClick={() => setShowPartialPay(true)}
                          className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-100 transition-colors uppercase tracking-wider"
                       >
                          Add Payment
                       </button>
                    )}
                 </div>

                 {showPartialPay && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-4 animate-in slide-in-from-top-2 duration-200">
                       <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Amount</label>
                             <input 
                                type="number" 
                                value={partialAmount}
                                onChange={e => setPartialAmount(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder={`Max: ${selectedInvoice.dueAmount}`}
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Method</label>
                             <select 
                                value={partialMethod}
                                onChange={e => setPartialMethod(e.target.value as any)}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                             >
                                <option value="CASH">Cash</option>
                                <option value="WALLET">WALLET</option>
                                <option value="CARD">Card</option>
                                <option value="TRANSFER">Transfer</option>
                             </select>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <button 
                             onClick={handlePartialPayment}
                             className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-1"
                          >
                             <CheckCircle className="w-3.5 h-3.5" /> Save Payment
                          </button>
                          <button 
                             onClick={() => setShowPartialPay(false)}
                             className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300"
                          >
                             Cancel
                          </button>
                       </div>
                    </div>
                 )}

                 <div className="space-y-2">
                    {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                       selectedInvoice.payments.map((p, idx) => (
                          <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 group">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-blue-500 transition-colors">
                                   <span className="text-[10px] font-bold">#{idx + 1}</span>
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-slate-700">{formatCurrency(p.amount)}</p>
                                   <p className="text-[10px] text-slate-400">{new Date(p.date).toLocaleString()} • {p.method}</p>
                                </div>
                             </div>
                             <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-400 font-bold uppercase">{p.method}</span>
                          </div>
                       ))
                    ) : (
                       <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-[10px] text-slate-400 font-medium italic">No payment history recorded</p>
                       </div>
                    )}
                 </div>
              </div>
              
              <div className="flex gap-3 pt-6">
                 <button onClick={() => handlePrint(selectedInvoice)} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs">
                    <Printer className="w-4 h-4" /> Print Full Invoice
                 </button>
                 {selectedInvoice.dueAmount > 0 && (
                    <button 
                       onClick={handleSettleDue}
                       className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                       <CreditCard className="w-4 h-4" /> Final Settlement
                    </button>
                 )}
              </div>
           </div>
        </Modal>
      )}
       
       {/* Purchase Detail Modal */}
       {selectedPurchase && (
          <Modal isOpen={!!selectedPurchase} onClose={() => setSelectedPurchase(null)} title={`Bill #${selectedPurchase.billNumber}`}>
             <div className="space-y-4">
                 <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg">
                     <div>
                         <h3 className="font-bold text-lg text-purple-900">{selectedPurchase.supplierName}</h3>
                         <p className="text-sm text-purple-600">{new Date(selectedPurchase.createdAt).toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-sm text-purple-600">Total Bill Amount</p>
                         <p className="text-xl font-bold text-purple-900">{formatCurrency(selectedPurchase.totalAmount)}</p>
                     </div>
                 </div>

                 <div className="border rounded-lg overflow-hidden">
                     <table className="w-full text-sm">
                         <thead className="bg-slate-100 text-slate-600">
                             <tr>
                                 <th className="px-4 py-2 text-left">Product</th>
                                 <th className="px-4 py-2 text-right">Qty</th>
                                 <th className="px-4 py-2 text-right">Buy Price</th>
                                 <th className="px-4 py-2 text-right">Total</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {selectedPurchase.items.map((item: any, idx: number) => (
                                 <tr key={idx}>
                                     <td className="px-4 py-2">{item.name}</td>
                                     <td className="px-4 py-2 text-right">{item.quantity}</td>
                                     <td className="px-4 py-2 text-right">{formatCurrency(item.buyPrice)}</td>
                                     <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total || item.quantity * item.buyPrice)}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
                 
                 <div className="flex justify-between font-bold text-lg pt-4 border-t">
                     <span>Total Paid</span>
                     <span>{formatCurrency(selectedPurchase.totalAmount)}</span>
                 </div>
             </div>
          </Modal>
       )}
    </div>
  );
};

export default Invoices;
