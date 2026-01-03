import React, { useState } from 'react';
import { useAuth } from '../stores/useAuth';
import { Lock, Monitor, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-4 text-center">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <Monitor className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-slate-800">ElectroPOS</h1>
           <p className="text-slate-500 text-sm mt-1">Enterprise Edition (Offline)</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 pt-4 flex flex-col gap-5">
           <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
                <div className="relative">
                    <input 
                      autoFocus
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toUpperCase())}
                      className={`w-full px-4 py-3 pl-10 border rounded-xl outline-none transition-all font-bold ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                      placeholder="ENTER USERNAME"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
                <div className="relative">
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 pl-10 border rounded-xl outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                      placeholder="••••••••"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
             </div>

             {error && (
               <p className="text-center text-red-500 text-sm flex items-center justify-center gap-1 animate-in shake duration-300">
                 <AlertTriangle className="w-3 h-3" /> Invalid Credentials
               </p>
             )}
           </div>

           <button 
             type="submit" 
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group mt-2"
           >
             Login to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </button>
        </form>

        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
           <p>Default Admin: ADMIN / RAJU@12345#</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
