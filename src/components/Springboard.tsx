import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  GraduationCap,
  Settings,
  ClipboardList,
  Bell,
  MessageSquare,
  LogOut,
  CheckCircle2,
  TrendingUp,
  Clock,
  Search,
  Plus,
  Home,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  Zap,
  LayoutGrid,
  LayoutDashboard,
  School,
  UserCheck,
  Terminal,
  Building2,
  HeartHandshake,
  Flag,
  Wallet,
  Fingerprint,
  Briefcase,
  FileText,
  FileDown,
  Mail,
  UserPlus,
  Activity,
  History,
  Moon,
  Sun,
  Component,
  Trophy,
  Construction,
  Megaphone,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../context/ConfigContext';
import { UserRole, UserProfile } from '../types';
import { cn, transformDriveUrl } from '../lib/utils';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sparkles } from 'lucide-react';

// Shared Global Search Component
export const GlobalSearch: React.FC = () => {
    const [isFocused, setIsFocused] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<{ type: string; title: string; subtitle: string; path: string }[]>([]);
    
    useEffect(() => {
        if (searchTerm.length < 2) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            const matches: any[] = [];
            
            // Search Users (Students & Teachers)
            const qUsers = query(collection(db, 'users'), where('name', '>=', searchTerm.toUpperCase()), where('name', '<=', searchTerm.toUpperCase() + '\uf8ff'));
            const userSnap = await getDocs(qUsers);
            userSnap.forEach(d => {
                const data = d.data();
                matches.push({
                    type: data.roles.includes('student') ? 'SISWA' : 'GTK',
                    title: data.name,
                    subtitle: data.roles.includes('student') ? `Kelas: ${data.classId || '-'}` : data.position || 'Staf',
                    path: data.roles.includes('student') ? '/admin/students' : '/admin/gtk'
                });
            });

            // Search Subjects
            const qSubs = query(collection(db, 'subjects'), where('name', '>=', searchTerm.toUpperCase()), where('name', '<=', searchTerm.toUpperCase() + '\uf8ff'));
            const subSnap = await getDocs(qSubs);
            subSnap.forEach(d => {
                const data = d.data();
                matches.push({
                    type: 'MAPEL',
                    title: data.name,
                    subtitle: data.code,
                    path: '/admin/academic'
                });
            });

            setResults(matches.slice(0, 5));
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    return (
        <div className={cn(
            "relative w-full transition-all duration-500 z-[110]",
            isFocused ? "scale-[1.02]" : "scale-100"
        )}>
            <div className={cn(
                "h-14 flex items-center px-5 gap-3 bg-white dark:bg-slate-800 rounded-2xl border transition-all group",
                isFocused ? "border-blue-500 shadow-2xl ring-4 ring-blue-500/5" : "border-slate-50 dark:border-slate-700"
            )}>
                <Search size={20} className={cn("transition-colors", isFocused ? "text-blue-500" : "text-slate-300")} />
                <input 
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="CARI DATA GURU, MATA PELAJARAN, NAMA SISWA..."
                    className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white placeholder:text-slate-300"
                />
            </div>

            <AnimatePresence>
                {isFocused && searchTerm.length > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-50 dark:border-slate-700 overflow-hidden p-4"
                    >
                        <div className="p-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 italic flex items-center gap-2">
                                <Sparkles size={14} className="text-blue-500" />
                                Hasil Pencarian Cepat
                            </h4>
                            <div className="space-y-2">
                                {results.length > 0 ? results.map((res, i) => (
                                    <Link 
                                        key={i} 
                                        to={res.path} 
                                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 uppercase group-hover:text-blue-600">
                                                {res.type[0]}
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors uppercase tracking-tight">{res.title}</h5>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{res.type} • {res.subtitle}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                    </Link>
                                )) : (
                                    <div className="p-10 text-center border-2 border-dashed border-slate-50 dark:border-slate-700 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tidak ada data ditemukan</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  roles: string[];
  description?: string;
}

export const ALL_MENUS: MenuItem[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} />, color: 'bg-[#2563eb]', path: '/admin/dashboard', roles: ['admin'], description: 'Ikhtisar Sistem' },
  { id: 'admin-users', label: 'Manajemen User', icon: <Users size={24} />, color: 'bg-[#4f46e5]', path: '/admin/users', roles: ['admin', 'kepsek'], description: 'Role & Akun' },
  { id: 'admin-profile', label: 'Profil Sekolah', icon: <School size={24} />, color: 'bg-[#10b981]', path: '/admin/profile', roles: ['admin'], description: 'Identitas Sekolah' },
  { id: 'admin-academic', label: 'Portal Akademik', icon: <BookOpen size={24} />, color: 'bg-[#6366f1]', path: '/admin/academic', roles: ['admin', 'teacher'], description: 'Kurikulum & KBM' },
  { id: 'admin-schedule', label: 'Portal Jadwal', icon: <Calendar size={24} />, color: 'bg-[#f43f5e]', path: '/admin/schedule', roles: ['admin', 'teacher'], description: 'Agenda & Waktu' },
  { id: 'admin-students', label: 'Portal Induk Siswa', icon: <Users size={24} />, color: 'bg-[#0891b2]', path: '/admin/students', roles: ['admin'], description: 'Data Siswa' },
  { id: 'admin-classes', label: 'Manajemen Kelas', icon: <School size={24} />, color: 'bg-[#4f46e5]', path: '/admin/classes', roles: ['admin', 'waka_kurikulum'], description: 'Rombel & Ruang' },
  { id: 'admin-gtk', label: 'Portal GTK', icon: <UserCheck size={24} />, color: 'bg-[#ea580c]', path: '/admin/gtk', roles: ['admin', 'staff_tu', 'kepsek'], description: 'PTK & Tendik' },
  { id: 'admin-waka-curriculum', label: 'Waka Kurikulum', icon: <Component size={24} />, color: 'bg-[#6366f1]', path: '/admin/waka/kurikulum', roles: ['admin', 'waka_kurikulum', 'kepsek'], description: 'Manajemen KBM' },
  { id: 'admin-waka-students', label: 'Waka Kesiswaan', icon: <Trophy size={24} />, color: 'bg-[#f43f5e]', path: '/admin/waka/kesiswaan', roles: ['admin', 'waka_kesiswaan', 'kepsek'], description: 'Layanan Siswa' },
  { id: 'admin-waka-sarpras', label: 'Waka Sarpras', icon: <Construction size={24} />, color: 'bg-[#0d9488]', path: '/admin/waka/sarpras', roles: ['admin', 'waka_sarpras', 'kepsek'], description: 'Sarana Sekolah' },
  { id: 'admin-waka-humas', label: 'Waka Humas', icon: <Megaphone size={24} />, color: 'bg-[#d97706]', path: '/admin/waka/humas', roles: ['admin', 'waka_humas', 'kepsek'], description: 'Hubungan Masyarakat' },
  { id: 'admin-operator', label: 'Portal Operator', icon: <Terminal size={24} />, color: 'bg-[#334155]', path: '/admin/operator', roles: ['admin', 'operator'], description: 'Dapodik & Teknis' },
  { id: 'admin-bk', label: 'Portal BK', icon: <HeartHandshake size={24} />, color: 'bg-[#db2777]', path: '/admin/bk', roles: ['admin', 'teacher', 'bk'], description: 'Bimbingan Konseling' },
  { id: 'admin-pembina', label: 'Portal Pembina', icon: <Flag size={24} />, color: 'bg-[#7c3aed]', path: '/admin/pembina', roles: ['admin', 'pembina'], description: 'OSIS & Ekskul' },
  { id: 'admin-treasurer', label: 'Portal Bendahara', icon: <Wallet size={24} />, color: 'bg-[#16a34a]', path: '/admin/finance', roles: ['admin', 'bendahara'], description: 'Keuangan Sekolah' },
  { id: 'admin-attendance', label: 'Absensi Pegawai', icon: <Fingerprint size={24} />, color: 'bg-[#3b82f6]', path: '/absensi', roles: ['admin', 'teacher', 'kepsek', 'wakasek', 'staff_tu', 'bendahara', 'operator', 'bk', 'pembina'], description: 'Log Kehadiran' },
  { id: 'admin-downloads', label: 'Pusat Unduhan', icon: <FileDown size={24} />, color: 'bg-[#6366f1]', path: '/unduhan', roles: ['admin', 'teacher', 'kepsek', 'wakasek', 'staff_tu', 'bendahara', 'operator', 'bk', 'pembina'], description: 'Laporan & File' },
  { id: 'admin-headmaster', label: 'Portal Pimpinan', icon: <Briefcase size={24} />, color: 'bg-[#312e81]', path: '/admin/headmaster', roles: ['admin', 'kepsek', 'wakasek'], description: 'Panel Pimpinan' },
  { id: 'admin-tu', label: 'Portal TU', icon: <FileText size={24} />, color: 'bg-[#64748b]', path: '/admin/tu', roles: ['admin', 'staff_tu', 'kepala_tu'], description: 'Administrasi & Kearsipan' },
  { id: 'admin-info', label: 'Portal Informasi', icon: <Bell size={24} />, color: 'bg-[#ca8a04]', path: '/announcements', roles: ['admin'], description: 'Pusat Informasi' },
  { id: 'admin-ppdb', label: 'Portal PPDB', icon: <UserPlus size={24} />, color: 'bg-[#10b981]', path: '/admin/ppdb', roles: ['admin'], description: 'Penerimaan Siswa' },
  { id: 'admin-parents', label: 'Portal Orang Tua', icon: <Activity size={24} />, color: 'bg-[#06b6d4]', path: '/admin/parents', roles: ['admin'], description: 'Layanan Wali' },
  { id: 'admin-settings-full', label: 'Sistem', icon: <Settings size={24} />, color: 'bg-[#1e293b]', path: '/admin/settings', roles: ['admin'], description: 'Pengaturan' },
];

export const Springboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const { config } = useConfig();
  const [studentCount, setStudentCount] = useState<number | null>(230);
  const [gtkCount, setGtkCount] = useState<number | null>(4);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const userMenus = ALL_MENUS.filter(menu => {
    if (!profile) return false;
    const userRoles = profile.roles || [];
    return userRoles.includes('admin') || 
           menu.roles.some(menuRole => userRoles.includes(menuRole as UserRole));
  });

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowInstallBanner(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  useEffect(() => {
    // Siswa Aktif Count
    const qStudents = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'student')
    );
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      if (snapshot.empty) {
        setStudentCount(230); // Default placeholder
      } else {
        const activeCount = snapshot.docs.filter(doc => {
          const data = doc.data();
          const status = data.status || 'AKTIF';
          return status.toUpperCase() === 'AKTIF';
        }).length;
        setStudentCount(activeCount || 230);
      }
    });

    // GTK Count
    const gtkRoles = ['teacher', 'wakasek', 'kepsek', 'staff_tu', 'bendahara', 'operator', 'bk', 'pembina'];
    const qGtk = query(
      collection(db, 'users'),
      where('roles', 'array-contains-any', gtkRoles)
    );
    const unsubGtk = onSnapshot(qGtk, (snapshot) => {
      if (snapshot.empty) {
        setGtkCount(4); // Default placeholder
      } else {
        const activeCount = snapshot.docs.filter(doc => {
          const data = doc.data();
          const status = data.status || 'AKTIF';
          return status.toUpperCase() === 'AKTIF';
        }).length;
        setGtkCount(activeCount || 4);
      }
    });

    return () => {
      unsubStudents();
      unsubGtk();
    };
  }, []);

  const getPortalTitle = () => {
    if (!profile) return 'Layanan Portal';
    const roles = profile.roles || [];
    
    const isLeadership = roles.includes('kepsek') || roles.includes('wakasek');
    const isTeacher = roles.includes('teacher');
    const isStaff = roles.includes('staff_tu') || roles.includes('operator') || roles.includes('bendahara') || roles.includes('kepala_tu');
    const isAdmin = roles.includes('admin');

    if (isAdmin && isLeadership) return 'Portal Pimpinan & Admin';
    if (isAdmin) return 'Portal Administrator';
    if (isLeadership && isTeacher) return 'Portal Pimpinan & Pendidik';
    if (isLeadership) return 'Portal Pimpinan Sekolah';
    if (isTeacher) return 'Portal Tenaga Pendidik';
    if (isStaff) return 'Portal Administrasi & TU';
    
    return 'Menu Utama Sekolah';
  };

  return (
    <div className="min-h-screen bg-mesh dark:bg-[#0F172A] pb-40 overflow-x-hidden transition-colors duration-300">
      {/* Dynamic Header */}
      <div className="relative pt-12 pb-24 px-6">
        <div className="flex justify-between items-start mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-2xl shadow-blue-500/20"
            >
              <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {config.schoolLogo ? (
                  <img 
                    src={transformDriveUrl(config.schoolLogo)} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-blue-600">
                    <UserIcon size={28} />
                  </div>
                )}
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Halo {profile?.name.split(' ')[0] || 'User'}</h1>
              <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.1em] mt-0.5">{config.schoolName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/admin/settings"
              className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 soft-shadow flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all active:scale-95 border border-slate-50 dark:border-slate-700"
            >
              {config.darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Link>
            <button 
              onClick={() => logout()}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 soft-shadow flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-95 border border-slate-50 dark:border-slate-700"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Stats Row (School Info Mini Header) */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar relative z-10 pb-4">
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-shrink-0 w-44 p-5 rounded-[32px] bg-blue-600 text-white shadow-xl shadow-blue-500/20"
          >
            <ShieldCheck size={24} className="mb-4 opacity-80" />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Siswa Aktif</p>
            <h3 className="text-3xl font-black">
              {studentCount !== null ? studentCount.toLocaleString('id-ID') : '...'}
            </h3>
          </motion.div>
          
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0 w-44 p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 soft-shadow"
          >
            <UserCheck size={24} className="mb-4 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total GTK</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">
              {gtkCount !== null ? gtkCount.toLocaleString('id-ID') : '...'}
            </h3>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 w-44 p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 soft-shadow"
          >
            <Zap size={24} className="mb-4 text-orange-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semester / TA</p>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">
              {config.semester} <br/> {config.academicYear}
            </h3>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-shrink-0 w-44 p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 soft-shadow"
          >
            <Activity size={24} className="mb-4 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kehadiran Hari Ini</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">
              98<span className="text-sm font-bold text-slate-400 ml-1">%</span>
            </h3>
          </motion.div>
        </div>
      </div>

      <div className="mt-[-40px] relative z-20 px-6">
        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="mb-8 p-6 rounded-[32px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap size={80} />
              </div>
              <div className="relative z-10">
                <h4 className="font-black text-lg mb-1 italic">Instal Aplikasi di HP?</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-4">Akses lebih cepat & hemat kuota langsung dari layar utama</p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleInstallClick}
                    className="px-6 py-2.5 rounded-2xl bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Instal Sekarang
                  </button>
                  <button 
                    onClick={() => setShowInstallBanner(false)}
                    className="px-6 py-2.5 rounded-2xl bg-white/20 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass p-5 rounded-[32px] mb-10 flex items-center gap-4 relative overflow-hidden group border-white/20 dark:border-slate-700/50"
        >
          <div className="absolute top-0 right-0 p-4">
             <Bell size={40} className="text-blue-500 opacity-10 animate-pulse" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Bell size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-slate-800 dark:text-white font-black text-sm">Update Sistem Tersedia</h4>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-tight mt-0.5">Versi 2.0.4 telah dirilis. Silakan periksa log sistem.</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
        </motion.div>

        {/* Global Search Component */}
        <div className="mb-10">
           <GlobalSearch />
        </div>

        {/* Portal Grid */}
        <section>
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-slate-800 dark:text-white font-black text-lg">{getPortalTitle()}</h2>
            <Link to="#" className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">Atur Grid</Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {userMenus.map((menu, index) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: 'spring', stiffness: 200, damping: 20 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to={menu.path} className="flex flex-col group h-full">
                  <div className="bg-white dark:bg-slate-800/80 p-5 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex flex-col flex-1 relative overflow-hidden">
                    <div className={cn(
                      "w-12 h-12 rounded-[18px] flex items-center justify-center text-white mb-4 shadow-lg shadow-black/5 transition-all group-hover:scale-110 group-hover:rotate-3",
                      menu.color
                    )}>
                      {menu.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white text-sm leading-none transition-colors group-hover:text-blue-600">{menu.label}</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 leading-tight uppercase tracking-wider">{menu.description}</p>
                    </div>
                    {/* Activity dot placeholder */}
                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Access Menu Placeholder */}
        <section className="mt-12">
            <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-slate-800 dark:text-white font-black text-lg">Quick Action</h2>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pin Portal</div>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {['Export Data', 'Backup DB', 'Kirim Notif', 'Audit Log'].map((action, i) => (
                    <button key={i} className="flex-shrink-0 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest soft-shadow hover:bg-slate-50 transition-all">
                        {action}
                    </button>
                ))}
            </div>
        </section>

        {/* Recent Activity */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-slate-800 dark:text-white font-black text-lg">Recent System Feed</h2>
            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
               <History size={16} />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800/50 p-5 rounded-[32px] soft-shadow border border-slate-50 dark:border-slate-700 flex items-center gap-5 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 dark:text-white font-bold text-sm leading-snug">Presensi Operator TU</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mt-0.5">Sistem Absensi • 12m ago</p>
              </div>
              <Clock size={16} className="text-slate-200 dark:text-slate-600" />
            </div>

            <div className="bg-white dark:bg-slate-800/50 p-5 rounded-[32px] soft-shadow border border-slate-50 dark:border-slate-700 flex items-center gap-5 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <UserPlus size={24} />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 dark:text-white font-bold text-sm leading-snug">5 Calon Siswa Baru</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mt-0.5">Portal PPDB • Today</p>
              </div>
              <ChevronRight size={16} className="text-slate-200 dark:text-slate-600" />
            </div>
          </div>
        </section>
      </div>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-32 right-6 w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 z-[110] border-4 border-white dark:border-slate-900"
      >
        <Plus size={32} />
      </motion.button>

      {/* Modern Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-[100] pointer-events-none">
        <nav className="max-w-md mx-auto h-20 glass-dark rounded-[36px] px-8 flex items-center justify-between shadow-2xl relative pointer-events-auto border border-white/10">
          <button className="flex flex-col items-center gap-1.5 text-white relative transition-all active:scale-90">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Home</span>
            <div className="bottom-nav-indicator"></div>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-all active:scale-90">
            <MessageSquare size={22} strokeWidth={2} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Pesan</span>
          </button>
          
          <div className="relative -top-3">
             <Link 
               to="/portal"
               className="w-16 h-16 rounded-[24px] bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-100 dark:border-slate-600 pointer-events-auto"
             >
                <LayoutGrid size={32} />
             </Link>
          </div>

          <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-all active:scale-90">
            <Calendar size={22} strokeWidth={2} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Jadwal</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-all active:scale-90">
            <UserIcon size={22} strokeWidth={2} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Akun</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
