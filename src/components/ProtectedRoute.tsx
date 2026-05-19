import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'motion/react';
import { Settings, Lock, AlertCircle, Home } from 'lucide-react';
import { UserRole } from '../types';

export const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { config, loading: configLoading } = useConfig();
  
  const loading = authLoading || configLoading;

  const [isStuck, setIsStuck] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setIsStuck(true);
      }, 10000); // 10 seconds timeout
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !isStuck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mesh dark:bg-[#0F172A]">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
          E-SMAPNA SECURE TUNNEL
        </p>
      </div>
    );
  }

  if (isStuck && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mesh dark:bg-[#0F172A] p-8 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-8 text-amber-500 shadow-lg">
           <AlertCircle size={40} />
        </div>
        <h2 className="text-xl font-black mb-2">Koneksi Lambat</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">System membutuhkan waktu lebih lama untuk sinkronisasi. Coba segarkan halaman atau bersihkan sesi.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            Segarkan Halaman
          </button>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            Reset Sesi & Login Ulang
          </button>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;

  // Maintenance Mode Check
  if (config.maintenanceMode && profile?.roles && !profile.roles.includes('admin')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mesh dark:bg-[#0F172A] p-8 text-center">
        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
           <Settings size={48} className="animate-spin-slow" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Sistem Maintenance</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[280px] leading-relaxed">
          Administrator sedang melakukan pemeliharaan rutin. Silakan kembali beberapa saat lagi.
        </p>
        <div className="mt-12 p-3 bg-white dark:bg-slate-800 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700">
           <Lock size={16} className="text-slate-300" />
           <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Protocol 403 Active</span>
        </div>
      </div>
    );
  }

  // Role Based Authorization
  if (allowedRoles && profile) {
    const userRoles = profile.roles || [];
    const hasAccess = userRoles.includes('admin' as UserRole) || 
                     allowedRoles.some(role => userRoles.includes(role as UserRole));
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[32px] flex items-center justify-center mb-8 shadow-lg">
             <Lock size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Akses Terbatas</h1>
          <p className="text-slate-500 text-xs mb-8 max-w-[240px] font-medium leading-relaxed uppercase tracking-wider">
            Akun Anda ({profile.name}) tidak memiliki izin untuk mengakses modul ini. Silakan hubungi Administrator.
          </p>
          <Link 
            to="/" 
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            <Home size={16} />
            Kembali ke Beranda
          </Link>
        </div>
      );
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};
