import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  Fingerprint, 
  Users, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  UserX, 
  Camera,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export const AttendanceAdmin: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'logs'>('stats');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    noFace: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all staff users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs
        .map(doc => ({ ...doc.data(), uid: doc.id }))
        .filter((u: any) => !u.roles.includes('student'));
      
      setUsers(allUsers);

      // Fetch today's logs
      const logsSnap = await getDocs(query(
        collection(db, 'staff_attendance'),
        where('date', '==', today)
      ));
      const todayLogs = logsSnap.docs.map(doc => doc.data());
      setLogs(todayLogs);

      // Calculate stats
      const present = todayLogs.length;
      const late = todayLogs.filter((l: any) => l.checkIn?.status === 'late').length;
      const noFace = allUsers.filter((u: any) => !u.faceDescriptor).length;

      setStats({
        total: allUsers.length,
        present,
        late,
        noFace
      });

    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh pb-24">
      <div className="pt-12 px-6">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
              <ChevronRight className="rotate-180" size={20} />
            </Link>
            <Link 
              to="/absensi/scan"
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Camera size={16} />
              Buka Absensi
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em]">Portal Manajemen</p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presensi Pegawai</h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                 <Users size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total Pegawai</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                 <CheckCircle2 size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Hadir Hari Ini</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.present}</h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                 <Clock size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Terlambat</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.late}</h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                 <Fingerprint size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Belum Face ID</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.noFace}</h3>
           </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/40 p-1.5 rounded-3xl mb-8 border border-white/50">
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'stats' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
            )}
          >
            Monitor
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'users' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
            )}
          >
            Pegawai
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'logs' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
            )}
          >
            Log
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'stats' && (
            <div className="space-y-4">
               {logs.length === 0 ? (
                 <div className="bg-white/40 p-12 rounded-[40px] border border-dashed border-slate-300 text-center">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-400">Belum ada absensi hari ini</p>
                 </div>
               ) : (
                 logs.map((log, idx) => (
                   <div key={idx} className="bg-white/60 p-5 rounded-[32px] border border-white/50 soft-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                         <Users size={20} />
                      </div>
                      <div className="flex-1">
                         <h4 className="text-sm font-black text-slate-900 leading-none mb-1">{log.name}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           {log.checkIn?.time} - {log.checkOut?.time || 'Bekerja'}
                         </p>
                      </div>
                      <div className="text-right">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                           log.checkIn?.status === 'late' ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-emerald-50 text-emerald-500 border-emerald-100"
                         )}>
                           {log.checkIn?.status === 'late' ? 'Telat' : 'Tepat'}
                         </span>
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
               {users.map((u, idx) => (
                 <div key={idx} className="bg-white/60 p-5 rounded-[32px] border border-white/50 soft-shadow flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                       {u.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                       <h4 className="text-sm font-black text-slate-900 leading-none mb-1">{u.name}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.roles.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {u.faceDescriptor ? (
                         <div title="Face ID Aktif" className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <ShieldCheck size={16} />
                         </div>
                       ) : (
                         <div title="Belum Face ID" className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                            <AlertCircle size={16} />
                         </div>
                       )}
                       {u.uid === profile?.uid && (
                         <Link to="/absensi/scan" className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                            <Camera size={14} />
                         </Link>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="bg-white/40 p-8 rounded-[40px] border border-dashed border-slate-300 text-center">
                <p className="text-sm font-bold text-slate-400 italic">Fitur export laporan kehadiran sedang disiapkan...</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
