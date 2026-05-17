import React, { useState, useEffect } from 'react';
import { GraduationCap, ArrowRight, User, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { transformDriveUrl } from '../lib/utils';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Kredensial tidak valid. Periksa kembali ID dan Key Anda.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menghubungkan ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 relative z-10 text-center"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] rounded-[28px] shadow-2xl shadow-blue-500/20 mx-auto mb-6 animate-float"
        >
          <div className="w-full h-full bg-white rounded-[25px] flex items-center justify-center text-blue-600 overflow-hidden">
            {config.schoolLogo ? (
              <img 
                src={transformDriveUrl(config.schoolLogo)} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap size={40} />
            )}
          </div>
        </motion.div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{config.appName}</h1>
        <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-60">
           {config.schoolName}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm glass p-8 rounded-[48px] shadow-2xl relative z-10 border border-white/50"
      >
        <div className="mb-8 text-center">
            <h2 className="text-lg font-black text-slate-800">Selamat Datang</h2>
            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Authorized Access Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="User ID"
                className="w-full bg-white/50 border-none h-14 pl-12 pr-6 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-slate-300 font-bold text-sm text-slate-700"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Key"
                className="w-full bg-white/50 border-none h-14 pl-12 pr-6 rounded-2xl focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-slate-300 font-bold text-sm text-slate-700"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 text-rose-500 text-[10px] font-bold bg-rose-50 rounded-2xl p-4"
            >
              <AlertCircle size={14} className="shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:translate-y-[-2px] hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-6"
          >
            {isSubmitting ? 'Authenticating...' : 'Masuk Portal'}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-none">
              &copy; {new Date().getFullYear()} {config.schoolName}
            </p>
        </div>
      </motion.div>

      <div className="mt-12 text-center pointer-events-none">
        <p className="text-[9px] text-slate-300 font-mono">
          SECURE_TERMINAL_VX40
        </p>
      </div>
    </div>
  );
};
