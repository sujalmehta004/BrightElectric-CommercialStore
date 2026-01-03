import React from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle } from 'lucide-react';
import { useShopSettings } from '../stores/useShopSettings';
import { Building2 } from 'lucide-react';
import { useGlobalModal } from '../components/GlobalModal';

const Settings = () => {
  const { details, updateDetails } = useShopSettings(); // Add hook
  const { showAlert, showConfirm } = useGlobalModal();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              updateDetails({ logo: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleExport = async () => {
    try {
      const collections = [
        'products', 'sales', 'customers', 'suppliers', 
        'purchaseOrders', 'transactions', 'expenses', 'repairs', 'settings'
      ];

      const results = await Promise.all(
        collections.map(async (key) => {
            const res = await fetch(`http://localhost:3000/${key}`);
            if (!res.ok) {
                // Settings might return 404 if not initialized, return default
                if (key === 'settings') return {}; 
                return [];
            }
            return res.json();
        })
      );

      const data = collections.reduce((acc, key, index) => {
        acc[key] = results[index];
        return acc;
      }, {} as any);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `electro_pos_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      showAlert('Export Failed', (error as Error).message);
    }
  };

  const clearCollection = async (collection: string) => {
    const response = await fetch(`http://localhost:3000/${collection}`);
    const items = await response.json();
    await Promise.all(items.map((item: any) => 
      fetch(`http://localhost:3000/${collection}/${item.id}`, { method: 'DELETE' })
    ));
  };

  const importCollection = async (collection: string, items: any[]) => {
    // Sequential to avoid overwhelming server or just Promise.all
    for (const item of items) {
      await fetch(`http://localhost:3000/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = await showConfirm(
        'Overwrite Database', 
        'This will OVERWRITE all current data in the database with the backup file. This action cannot be undone.',
        { variant: 'danger', confirmText: 'Overwrite Data' }
    );
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Clear all collections
        await Promise.all([
          clearCollection('products'),
          clearCollection('sales'),
          clearCollection('customers'),
          clearCollection('suppliers'),
          clearCollection('purchaseOrders'),
          clearCollection('transactions'),
          clearCollection('expenses'),
          clearCollection('repairs'),
        ]);

        // Import new Data
        await importCollection('products', data.products || []);
        await importCollection('sales', data.sales || []);
        await importCollection('customers', data.customers || []);
        await importCollection('suppliers', data.suppliers || []);
        await importCollection('purchaseOrders', data.purchaseOrders || []);
        await importCollection('transactions', data.transactions || []);
        await importCollection('expenses', data.expenses || []);
        await importCollection('repairs', data.repairs || []);

        // Settings (PATCH)
        if (data.settings) {
            await fetch('http://localhost:3000/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.settings),
            });
        }
          
        await showAlert('Success', 'Database imported successfully! The page will reload.');
        window.location.reload();
      } catch (err) {
        showAlert('Import Failed', 'Failed to import backup file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    const confirmed = await showConfirm(
        'Factory Reset', 
        'This will DELETE ALL DATA permanently from the server. This action cannot be undone.', 
        { variant: 'danger', confirmText: 'Delete All Data' }
    );

    if (confirmed) {
        const doubleCheck = await showConfirm(
            'Final Confirmation', 
            'Are you absolutely sure?', 
            { variant: 'danger', confirmText: 'Yes, Wipe Everything' }
        );
        
        if (doubleCheck) {
            try {
                await Promise.all([
                    clearCollection('products'),
                    clearCollection('sales'),
                    clearCollection('customers'),
                    clearCollection('suppliers'),
                    clearCollection('purchaseOrders'),
                    clearCollection('transactions'),
                    clearCollection('expenses'),
                    clearCollection('repairs'),
                ]);
                
                await showAlert('Reset Complete', 'Factory reset complete. The page will reload.');
                window.location.reload();
            } catch (e) {
                showAlert('Error', 'Reset failed. Check console for details.');
            }
        }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
       {/* ... Header ... */}
       <div>
          <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
          <p className="text-slate-500 text-sm">Configure your application preferences and shop details</p>
        </div>

        {/* 1. INTERFACE SETTINGS */}
        <div>
            <div className="flex items-center gap-4 mb-4">
                <span className="h-px bg-slate-200 flex-1"></span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interface</span>
                <span className="h-px bg-slate-200 flex-1"></span>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">UI Scale</h3>
                            <p className="text-slate-500 text-sm">Adjust user interface size</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => updateDetails({ uiScale: Math.max(12, (details.uiScale || 14) - 1) })} className="p-2 bg-white border rounded hover:bg-slate-50 font-bold w-10 h-10 flex items-center justify-center">-</button>
                            <span className="font-mono font-bold w-12 text-center text-lg">{details.uiScale || 14}</span>
                            <button onClick={() => updateDetails({ uiScale: Math.min(20, (details.uiScale || 14) + 1) })} className="p-2 bg-white border rounded hover:bg-slate-50 font-bold w-10 h-10 flex items-center justify-center">+</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. COMPANY DETAILS */}
        <div>
            <div className="flex items-center gap-4 mb-4">
                <span className="h-px bg-slate-200 flex-1"></span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Details</span>
                <span className="h-px bg-slate-200 flex-1"></span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                     <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold text-slate-800">Shop Profile</h3>
                     <p className="text-slate-500 text-sm">Visible on printed invoices</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                   <div className="col-span-2">
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Store Name</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" value={details.storeName} onChange={e => updateDetails({ storeName: e.target.value })} />
                   </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.phone} onChange={e => updateDetails({ phone: e.target.value })} />
                   </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.email} onChange={e => updateDetails({ email: e.target.value })} />
                   </div>
                   <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Address Line 1</label>
                        <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.addressLine1} onChange={e => updateDetails({ addressLine1: e.target.value })} />
                   </div>
                   <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Address Line 2</label>
                        <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.addressLine2} onChange={e => updateDetails({ addressLine2: e.target.value })} />
                   </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">VAT / VAT IN</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.VATIn} onChange={e => updateDetails({ VATIn: e.target.value })} />
                   </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Website</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={details.website} onChange={e => updateDetails({ website: e.target.value })} />
                   </div>
                   <div className="col-span-2">
                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Store Logo</label>
                       <div className="flex items-center gap-4">
                           <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"/>
                           {details.logo && <div className="h-12 w-12 border rounded-lg p-1 bg-white flex items-center justify-center shrink-0"><img src={details.logo} alt="Logo" className="max-h-full max-w-full object-contain" /></div>}
                       </div>
                   </div>
               </div>
            </div>
        </div>

        {/* 3. DATA MANAGEMENT */}
        <div>
           <div className="flex items-center gap-4 mb-4">
              <span className="h-px bg-slate-200 flex-1"></span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">About Data</span>
              <span className="h-px bg-slate-200 flex-1"></span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Export */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-full">
                 <div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                       <Download className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Backup Data</h3>
                    <p className="text-slate-500 text-sm mt-2 mb-6">
                      Download a full JSON backup of your database. Recommended before making major changes.
                    </p>
                 </div>
                 <button 
                   onClick={handleExport}
                   className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                   <Database className="w-4 h-4" />
                   Export Database
                 </button>
               </div>

               {/* Import */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between h-full">
                 <div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                       <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Restore Data</h3>
                    <p className="text-slate-500 text-sm mt-2 mb-6">
                      Restore your database from a backup file. 
                      <span className="text-rose-500 font-bold block mt-1">⚠️ Overwrites all current data.</span>
                    </p>
                 </div>
                 <label className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center">
                   <Upload className="w-4 h-4" />
                   Select Backup File
                   <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                 </label>
               </div>
           </div>

           {/* Factory Reset - Separate Warning Block */}
           <div className="mt-8 bg-rose-50 rounded-2xl border border-rose-100 p-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white text-rose-600 rounded-xl shadow-sm">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-rose-900">Danger Zone</h3>
                    <p className="text-rose-700/80 text-sm">Factory reset wipes all data permanently.</p>
                 </div>
              </div>
              <button 
                onClick={handleReset}
                className="px-6 py-3 bg-white text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-transparent rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Application
              </button>
           </div>
        </div>
    </div>
  );
};

export default Settings;
