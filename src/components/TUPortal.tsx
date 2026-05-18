import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  Users, 
  FileArchive, 
  Settings, 
  Search, 
  Bell, 
  Plus, 
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight,
  UserPlus,
  BookOpen,
  CalendarDays,
  FileWarning,
  AlertTriangle
} from 'lucide-react';
import { ModulePage, ModuleCard } from './ModuleLayout';
import { useConfig } from '../context/ConfigContext';
import { GTKPortal } from './GTKPortal';
import { ArchivePortal } from './ArchivePortal';
import { BukuAgenda } from './BukuAgenda';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export const TUPortal: React.FC = () => {
  const { profile } = useAuth();
  const [activePortal, setActivePortal] = useState<'DASHBOARD' | 'GTK' | 'KEARSIPAN' | 'AGENDA'>('DASHBOARD');
  const [activities, setActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [gtkList, setGtkList] = useState<any[]>([]);

  useEffect(() => {
    // Realtime Activities from Audit Logs
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribeAudit = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
    });

    // GTK List for Notifications
    const gtkQ = query(collection(db, 'users'));
    const unsubscribeGtk = onSnapshot(gtkQ, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
      setGtkList(list);
      
      // Calculate Notifications
      const newNotifs: any[] = [];
      const today = new Date();
      
      list.forEach((gtk: any) => {
        // Retirement check (60 years old as example)
        if (gtk.tglLahir) {
          const birthDate = new Date(gtk.tglLahir);
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age >= 59) {
            newNotifs.push({
              title: 'Masa Pensiun Dekat',
              desc: `${gtk.name} (${60 - age} tahun lagi)`,
              type: 'INFO',
              icon: <CalendarDays size={16} />
            });
          }
        }
        
        // Certification / SK check placeholder 
        // In a real database, we'd have a specific "SK Terakhir" date
        if (gtk.tmtGuru) {
          const tmt = new Date(gtk.tmtGuru);
          const years = today.getFullYear() - tmt.getFullYear();
          if (years % 2 === 0 && years > 0) { // Every 2 years for SK Berkala example
            newNotifs.push({
              title: 'SK Berkala',
              desc: `${gtk.name} - Jadwal Pembaruan`,
              type: 'WARNING',
              icon: <FileWarning size={16} />
            });
          }
        }
      });
      
      setNotifications(newNotifs.slice(0, 5));
    });

    return () => {
      unsubscribeAudit();
      unsubscribeGtk();
    };
  }, []);

  if (activePortal === 'GTK') {
    return (
      <div className="relative">
         <button 
           onClick={() => setActivePortal('DASHBOARD')}
           className="fixed top-8 left-8 z-[60] w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors border border-slate-50 dark:border-slate-700"
         >
            <ArrowRight className="rotate-180" size={20} />
         </button>
         <GTKPortal />
      </div>
    );
  }

  if (activePortal === 'KEARSIPAN') {
    return (
      <div className="relative">
         <button 
           onClick={() => setActivePortal('DASHBOARD')}
           className="fixed top-8 left-8 z-[60] w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors border border-slate-50 dark:border-slate-700"
         >
            <ArrowRight className="rotate-180" size={20} />
         </button>
         <ArchivePortal />
      </div>
    );
  }

  if (activePortal === 'AGENDA') {
    return (
      <div className="relative">
         <button 
           onClick={() => setActivePortal('DASHBOARD')}
           className="fixed top-8 left-8 z-[60] w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-50 dark:border-slate-700"
         >
            <ArrowRight className="rotate-180" size={20} />
         </button>
         <ModulePage title="Buku Agenda Digital" subtitle="Administrasi Surat Masuk & Keluar" icon={<BookOpen size={28} />} color="bg-blue-600">
            <BukuAgenda />
         </ModulePage>
      </div>
    );
  }

  return (
    <ModulePage 
      title="Portal Tata Usaha" 
      subtitle="Pusat Administrasi & Kepegawaian" 
      icon={<Briefcase size={28} />} 
      color="bg-blue-600"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Quick Access */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setActivePortal('GTK')}
              className="p-8 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-50 dark:border-slate-700 text-left hover:shadow-2xl hover:border-orange-200 transition-all group overflow-hidden relative"
            >
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">Database GTK</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Guru & Staf</p>
            </button>

            <button 
              onClick={() => setActivePortal('KEARSIPAN')}
              className="p-8 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-50 dark:border-slate-700 text-left hover:shadow-2xl hover:border-slate-300 transition-all group overflow-hidden relative"
            >
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900/40 rounded-2xl flex items-center justify-center text-slate-900 dark:text-slate-400 mb-6 group-hover:scale-110 transition-transform">
                <FileArchive size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">Arsip Digital</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penyimpanan Terpadu</p>
            </button>

            <button 
              onClick={() => setActivePortal('AGENDA')}
              className="p-8 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-50 dark:border-slate-700 text-left hover:shadow-2xl hover:border-blue-200 transition-all group overflow-hidden relative"
            >
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">Buku Agenda</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surat Masuk/Keluar</p>
            </button>
          </div>

          {/* Activity Feed */}
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-tight">Aktivitas Terbaru</h4>
                <div className="h-1 lg:flex-1 mx-4 bg-slate-100 dark:bg-slate-800 rounded-full hidden"></div>
             </div>
             
             <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800">
                     <Clock size={32} className="text-slate-200 mx-auto mb-2" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada aktivitas tercatat</p>
                  </div>
                ) : activities.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={item.uid}
                    className="p-5 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-50 dark:border-slate-700 flex items-center justify-between hover:shadow-lg transition-all"
                  >
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white",
                          item.type === 'GTK' ? "bg-orange-500" : item.type === 'ARCHIVE' ? "bg-slate-900" : "bg-blue-600"
                        )}>
                           {item.action === 'CREATE' ? <Plus size={16} /> : <TrendingUp size={16} />}
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">{item.message}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Oleh: {item.user}</p>
                        </div>
                     </div>
                     <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        {item.timestamp?.toDate() ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(item.timestamp.toDate()) : 'Baru saja'}
                     </div>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Profile & Notifications */}
        <div className="space-y-8">
           <div className="p-8 bg-blue-600 rounded-[40px] text-white shadow-2xl shadow-blue-600/30 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                 <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Profil Portal</p>
                 <h3 className="text-2xl font-black mb-6">{profile?.roles.includes('kepala_tu') ? 'Kepala TU' : 'Staf TU'}</h3>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-blue-100">
                       <span className="text-[10px] font-bold uppercase tracking-widest">Aktivitas Anda</span>
                       <span className="font-black">24</span>
                    </div>
                    <div className="h-0.5 bg-white/10 w-full"></div>
                    <div className="pt-2 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest">Online Sekarang</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-8 bg-slate-900 rounded-[40px] text-white">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                       <Bell size={20} />
                    </div>
                    <h4 className="font-black uppercase tracking-tight">Sistem Notifikasi</h4>
                 </div>
                 {notifications.length > 0 && (
                   <span className="w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-black">{notifications.length}</span>
                 )}
              </div>
              
              <div className="space-y-5">
                 {notifications.map((notif, i) => (
                    <div key={i} className="flex gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                         notif.type === 'WARNING' ? "bg-rose-900/40 text-rose-500" : "bg-blue-900/40 text-blue-400"
                       )}>
                          {notif.icon}
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-tight leading-tight group-hover:text-blue-400 transition-colors">{notif.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{notif.desc}</p>
                       </div>
                    </div>
                 ))}
                 
                 {notifications.length === 0 && (
                   <p className="text-center text-[10px] font-black text-slate-600 uppercase py-4">Semua Terkendali</p>
                 )}
              </div>
              
              <button className="w-full h-12 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-8 transition-colors">
                 Atur Preferensi Notif
              </button>
           </div>
        </div>
      </div>
    </ModulePage>
  );
};
