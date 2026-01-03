import React, { useState } from 'react';
import { useAuth } from '../stores/useAuth';
import type { User } from '../stores/useAuth';
import { UserPlus, Shield, Trash2, Key, CheckCircle, XCircle, Search, UserCircle, Briefcase } from 'lucide-react';
import { Modal } from '../components/Modal';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../utils';

const UsersPage = () => {
  const { users, addUser, deleteUser, updateUserPermissions, user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'STAFF' as User['role']
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);

  const availablePaths = [
    { path: '/', label: 'Dashboard' },
    { path: '/billing', label: 'POS / Billing' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/repairs', label: 'Repairs' },
    { path: '/customers', label: 'Customers' },
    { path: '/suppliers', label: 'Suppliers' },
    { path: '/invoices', icon: 'FileText', label: 'Invoices' },
    { path: '/accounting', label: 'Accounting' },
    { path: '/reports', label: 'Reports' },
    { path: '/users', label: 'Users & Permissions' },
    { path: '/settings', label: 'Settings' }
  ];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: uuidv4(),
      username: formData.username.toUpperCase(),
      password: formData.password,
      name: formData.name,
      role: formData.role,
      permissions: ['/'], // Default only dashboard
      createdAt: new Date().toISOString()
    };
    addUser(newUser);
    setIsModalOpen(false);
    setFormData({ username: '', password: '', name: '', role: 'STAFF' });
  };

  const togglePermission = (userId: string, currentPerms: string[], path: string) => {
      let newPerms: string[];
      if (currentPerms.includes(path)) {
          newPerms = currentPerms.filter(p => p !== path);
      } else {
          newPerms = [...currentPerms, path];
      }
      updateUserPermissions(userId, newPerms);
      
      // Update local selected user state for immediate UI feedback in modal
      if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, permissions: newPerms });
      }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-slate-500 text-sm">Control staff access and permissions</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
        >
          <UserPlus className="w-5 h-5" />
          Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search users..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
               />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredUsers.map(u => (
                <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow group relative">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                            {u.username.slice(0,2)}
                        </div>
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            u.role === 'ADMIN' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>{u.role}</span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg mb-0.5">{u.name}</h3>
                    <p className="text-sm font-mono text-slate-400 mb-4">@{u.username}</p>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-50">
                        <button 
                            onClick={() => { setSelectedUser(u); setIsPermModalOpen(true); }}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Manage Permissions</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{u.permissions.includes('*') ? 'ALL' : u.permissions.length}</span>
                        </button>
                    </div>

                    {u.role !== 'ADMIN' && (
                        <button 
                            onClick={() => { if(confirm('Delete user?')) deleteUser(u.id); }}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
         </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Staff Account">
         <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                    <input required type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Username</label>
                    <input required type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none font-bold uppercase" 
                        value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="STAFF_01" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Password</label>
                    <div className="relative">
                        <input required type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none" 
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Create a password" />
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Access Role</label>
                    <select className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none font-bold"
                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as User['role']})}>
                        <option value="STAFF">Staff (Basic)</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="MANAGER">Manager</option>
                        <option value="TECHNICIAN">Technician</option>
                    </select>
                </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-600/10 mt-6 active:scale-95 transition-all">
                Create User Account
            </button>
         </form>
      </Modal>

      {/* Permissions Modal */}
      {selectedUser && (
          <Modal isOpen={isPermModalOpen} onClose={() => setIsPermModalOpen(false)} title={`Permissions: ${selectedUser.username}`}>
              <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4 border border-blue-100">
                      <div className="p-3 bg-white rounded-xl shadow-sm"><Shield className="w-6 h-6 text-blue-600" /></div>
                      <div>
                          <p className="text-sm font-bold text-blue-900">Path-Based Access Control</p>
                          <p className="text-xs text-blue-700">Toggle which modules this user can access in the sidebar.</p>
                      </div>
                  </div>

                  {selectedUser.role === 'ADMIN' ? (
                      <div className="p-12 text-center text-slate-500 border-2 border-dashed rounded-2xl">
                          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-10" />
                          <p className="font-bold">ADMIN ACCOUNT</p>
                          <p className="text-xs">Administrators have full access to all modules and cannot be restricted.</p>
                      </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {availablePaths.map(p => {
                            const hasPerm = selectedUser.permissions.includes(p.path) || selectedUser.permissions.includes('*');
                            return (
                                <button 
                                    key={p.path}
                                    disabled={selectedUser.permissions.includes('*')}
                                    onClick={() => togglePermission(selectedUser.id, selectedUser.permissions, p.path)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all font-bold text-sm",
                                        hasPerm 
                                            ? "border-blue-600 bg-blue-50 text-blue-700" 
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <span>{p.label}</span>
                                    {hasPerm ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-20" />}
                                </button>
                            );
                        })}
                    </div>
                  )}

                  <div className="pt-4 border-t flex justify-end">
                      <button onClick={() => setIsPermModalOpen(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold">Done</button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

export default UsersPage;
