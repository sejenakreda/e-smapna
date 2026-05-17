import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Globe, 
  Palette, 
  Smartphone,
  ChevronRight,
  Save,
  RefreshCw,
  FileText,
  School,
  GraduationCap,
  MessageSquare,
  Lock,
  Cpu,
  Layout,
  Search,
  Wifi,
  Cloud,
  History,
  ToggleRight,
  Moon,
  Calendar,
  Hash,
  Phone,
  MapPin,
  UserCheck,
  BookOpen,
  Layers,
  Building2,
  Zap,
  Mail,
  Megaphone,
  Clock,
  ShieldCheck,
  Activity,
  Navigation,
  Package,
  FileCode,
  Trash2,
  Sun,
  X,
  CheckCircle2,
  AlertCircle,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppConfig } from '../types';
import { useConfig } from '../context/ConfigContext';

interface SettingItem {
  id: string;
  label: string;
  key: keyof AppConfig;
  value?: string | boolean;
  type: 'text' | 'toggle' | 'select' | 'action';
  icon: React.ReactNode;
  color: string;
  options?: string[];
  onClick?: () => void;
}

interface SettingCategory {
  id: string;
  label: string;
  items: SettingItem[];
}

const DEFAULT_CONFIG: AppConfig = {
  appName: 'E-SMAPNA',
  schoolLogo: 'logo_smapna.png',
  academicYear: '2023/2024 Genap',
  language: 'Bahasa Indonesia',
  theme: 'Modern Glass',
  darkMode: false,
  schoolName: 'SMAS PGRI Naringgul',
  npsnCode: '10293847',
  schoolContact: '0812-3456-7890',
  schoolAddress: 'Parigi Natal, Naringgul, Cianjur',
  principalName: 'Drs. H. Ahmad Fauzi',
  accreditation: 'A',
  opLicenseNumber: '421.3/2849-DPK/2016',
  establishedYear: '1984',
  kopSuratUrl: '',
  semester: 'Genap',
  curriculum: 'Kurikulum Merdeka',
  majors: 'MIPA, IPS, Bahasa',
  totalClasses: '18 Rombel',
  kkmValue: '75.00',
  pushNotif: true,
  emailNotif: false,
  waGateway: true,
  autoAnnouncement: true,
  sessionType: 'Normal',
  loginTimeout: '30 Menit',
  deviceVerification: true,
  maintenanceMode: false,
  appVersion: 'v4.2.0-core',
  attendanceRadius: 100,
  schoolLatitude: -7.3332, 
  schoolLongitude: 107.3284, 
  attendanceStartTime: '07:00',
  attendanceEndTime: '14:00',
  lateTolerance: 30,
  pwaIconUrl: 'https://drive.google.com/file/d/1uOKSjAJH-I9U1O78Cd5Jp0Nrjkj9RWyX/view?usp=sharing',
  updatedAt: new Date()
};

export const AdminSettings: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { config: globalConfig } = useConfig();
  const [config, setConfig] = useState<AppConfig>(globalConfig);
  const [loading, setLoading] = useState(false); // Managed by context now
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [editingItem, setEditingItem] = useState<SettingItem | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    setConfig(globalConfig);
  }, [globalConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSyncStatus('idle');
    try {
      const docRef = doc(db, 'app_config', 'main');
      await setDoc(docRef, {
        ...config,
        updatedAt: serverTimestamp()
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setSyncStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateConfigField = (key: keyof AppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: keyof AppConfig) => {
    const currentValue = config[key];
    if (typeof currentValue === 'boolean') {
      updateConfigField(key, !currentValue);
    }
  };

  const openEditor = (item: SettingItem) => {
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.type === 'toggle') {
      handleToggle(item.key);
      return;
    }
    setEditingItem(item);
    setEditValue(String(config[item.key] || ''));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateConfigField('schoolLatitude', pos.coords.latitude);
        updateConfigField('schoolLongitude', pos.coords.longitude);
        alert(`Lokasi berhasil diambil: ${pos.coords.latitude}, ${pos.coords.longitude}`);
      },
      (err) => alert("Gagal mengambil lokasi: " + err.message),
      { enableHighAccuracy: true }
    );
  };

  const saveEdit = () => {
    if (editingItem) {
      let value: any = editValue;
      if (['attendanceRadius', 'schoolLatitude', 'schoolLongitude', 'lateTolerance'].includes(editingItem.key as string)) {
        value = parseFloat(editValue) || 0;
      }
      updateConfigField(editingItem.key, value);
      setEditingItem(null);
    }
  };

  const categories: SettingCategory[] = [
    {
      id: 'general',
      label: 'Pengaturan Umum',
      items: [
        { id: 'app-name', label: 'Nama Aplikasi', key: 'appName', value: config.appName, type: 'text', icon: <Smartphone size={18} />, color: 'bg-blue-500' },
        { id: 'academic-year', label: 'Tahun Ajaran Aktif', key: 'academicYear', value: config.academicYear, type: 'select', icon: <Calendar size={18} />, color: 'bg-indigo-500', options: Array.from({length: 27}, (_, i) => [`${2023+i}/${2024+i} Ganjil`, `${2023+i}/${2024+i} Genap`]).flat() },
        { id: 'lang', label: 'Bahasa', key: 'language', value: config.language, type: 'select', icon: <Globe size={18} />, color: 'bg-slate-700', options: ['Bahasa Indonesia', 'English', 'Sunda'] },
        { id: 'theme-app', label: 'Tema Aplikasi', key: 'theme', value: config.theme, type: 'select', icon: <Palette size={18} />, color: 'bg-pink-500', options: ['Modern Glass', 'Classic Blue', 'Minimalist Black', 'Indigo Royal'] },
        { id: 'dark-mode', label: 'Dark Mode', key: 'darkMode', value: config.darkMode, type: 'toggle', icon: config.darkMode ? <Sun size={18} /> : <Moon size={18} />, color: 'bg-slate-900' },
      ]
    },
    {
      id: 'school',
      label: 'Pengaturan Sekolah',
      items: [
        { id: 'school-fullname', label: 'Nama Sekolah', key: 'schoolName', value: config.schoolName, type: 'text', icon: <Building2 size={18} />, color: 'bg-indigo-500' },
        { id: 'school-logo-set', label: 'Logo Sekolah (URL)', key: 'schoolLogo', value: config.schoolLogo, type: 'text', icon: <School size={18} />, color: 'bg-emerald-500' },
        { id: 'npsn', label: 'NPSN/NSS', key: 'npsnCode', value: config.npsnCode, type: 'text', icon: <Hash size={18} />, color: 'bg-slate-600' },
        { id: 'contact', label: 'Kontak Sekolah', key: 'schoolContact', value: config.schoolContact, type: 'text', icon: <Phone size={18} />, color: 'bg-blue-600' },
        { id: 'address', label: 'Alamat Sekolah', key: 'schoolAddress', value: config.schoolAddress, type: 'text', icon: <MapPin size={18} />, color: 'bg-rose-500' },
        { 
          id: 'geo-auto', 
          label: 'Set Lokasi ke Sini', 
          key: 'schoolLatitude', 
          value: 'Klik untuk ambil kordinat otomatis', 
          type: 'action', 
          onClick: getCurrentLocation,
          icon: <Navigation size={18} />, 
          color: 'bg-emerald-600' 
        },
        { id: 'geo-radius', label: 'Radius Absensi (Meter)', key: 'attendanceRadius', value: String(config.attendanceRadius || 100), type: 'text', icon: <Zap size={18} />, color: 'bg-orange-500' },
        { id: 'geo-lat', label: 'Latitude Sekolah', key: 'schoolLatitude', value: String(config.schoolLatitude || ''), type: 'text', icon: <Navigation size={18} />, color: 'bg-indigo-600' },
        { id: 'geo-lng', label: 'Longitude Sekolah', key: 'schoolLongitude', value: String(config.schoolLongitude || ''), type: 'text', icon: <MapPin size={18} />, color: 'bg-blue-600' },
        { id: 'att-start', label: 'Jam Masuk (Check-In)', key: 'attendanceStartTime', value: config.attendanceStartTime || '07:00', type: 'text', icon: <Clock size={18} />, color: 'bg-emerald-600' },
        { id: 'att-end', label: 'Jam Pulang (Check-Out)', key: 'attendanceEndTime', value: config.attendanceEndTime || '14:00', type: 'text', icon: <Clock size={18} />, color: 'bg-rose-600' },
        { id: 'att-late', label: 'Toleransi Telat (Menit)', key: 'lateTolerance', value: String(config.lateTolerance || 0), type: 'text', icon: <Zap size={18} />, color: 'bg-amber-600' },
        { id: 'principal', label: 'Kepala Sekolah', key: 'principalName', value: config.principalName, type: 'text', icon: <UserCheck size={18} />, color: 'bg-indigo-600' },
        { id: 'accreditation', label: 'Akreditasi', key: 'accreditation', value: config.accreditation, type: 'text', icon: <Award size={18} />, color: 'bg-amber-500' },
        { id: 'kop-surat', label: 'Kop Surat (URL Gambar)', key: 'kopSuratUrl', value: config.kopSuratUrl || '', type: 'text', icon: <FileText size={18} />, color: 'bg-blue-400' },
        { id: 'op-license', label: 'No. Izin Operasional', key: 'opLicenseNumber', value: config.opLicenseNumber, type: 'text', icon: <FileText size={18} />, color: 'bg-slate-500' },
        { id: 'est-year', label: 'Tahun Berdiri', key: 'establishedYear', value: config.establishedYear, type: 'text', icon: <Calendar size={18} />, color: 'bg-blue-400' },
      ]
    },
    {
      id: 'academic',
      label: 'Pengaturan Akademik',
      items: [
        { id: 'semester', label: 'Semester Aktif', key: 'semester', value: config.semester, type: 'select', icon: <GraduationCap size={18} />, color: 'bg-indigo-500', options: ['Ganjil', 'Genap'] },
        { id: 'curriculum', label: 'Kurikulum', key: 'curriculum', value: config.curriculum, type: 'select', icon: <BookOpen size={18} />, color: 'bg-emerald-600', options: ['Kurikulum Merdeka', 'K-13 Revisi', 'Kurikulum 2013'] },
        { id: 'majors', label: 'Jurusan', key: 'majors', value: config.majors, type: 'text', icon: <Layers size={18} />, color: 'bg-cyan-600' },
        { id: 'classes', label: 'Kelas', key: 'totalClasses', value: config.totalClasses, type: 'text', icon: <Building2 size={18} />, color: 'bg-sky-600' },
        { id: 'kkm', label: 'KKM / Nilai Batas', key: 'kkmValue', value: config.kkmValue, type: 'text', icon: <Zap size={18} />, color: 'bg-orange-500' },
      ]
    },
    {
      id: 'notifications',
      label: 'Pengaturan Notifikasi',
      items: [
        { id: 'push-notif', label: 'Push Notification', key: 'pushNotif', value: config.pushNotif, type: 'toggle', icon: <Bell size={18} />, color: 'bg-yellow-600' },
        { id: 'email-notif', label: 'Email Notification', key: 'emailNotif', value: config.emailNotif, type: 'toggle', icon: <Mail size={18} />, color: 'bg-blue-400' },
        { id: 'wa-gateway', label: 'WhatsApp Gateway', key: 'waGateway', value: config.waGateway, type: 'toggle', icon: <MessageSquare size={18} />, color: 'bg-emerald-500' },
        { id: 'auto-announcement', label: 'Pengumuman Otomatis', key: 'autoAnnouncement', value: config.autoAnnouncement, type: 'toggle', icon: <Megaphone size={18} />, color: 'bg-rose-600' },
      ]
    },
    {
      id: 'security',
      label: 'Pengaturan Keamanan',
      items: [
        { id: 'session', label: 'Session Login', key: 'sessionType', value: config.sessionType, type: 'select', icon: <History size={18} />, color: 'bg-slate-700', options: ['Normal', 'Strict', 'Ultra Secure'] },
        { id: 'timeout', label: 'Timeout Login', key: 'loginTimeout', value: config.loginTimeout, type: 'select', icon: <Clock size={18} />, color: 'bg-orange-600', options: ['15 Menit', '30 Menit', '1 Jam', '6 Jam'] },
        { id: 'dev-verification', label: 'Verifikasi Perangkat', key: 'deviceVerification', value: config.deviceVerification, type: 'toggle', icon: <ShieldCheck size={18} />, color: 'bg-blue-600' },
      ]
    },
    {
      id: 'system',
      label: 'Pengaturan Sistem',
      items: [
        { id: 'maintenance', label: 'Maintenance Mode', key: 'maintenanceMode', value: config.maintenanceMode, type: 'toggle', icon: <Settings size={18} />, color: 'bg-red-600' },
        { id: 'pwa-icon', label: 'Ikon PWA (Instalasi HP)', key: 'pwaIconUrl', value: config.pwaIconUrl || '/icon.png', type: 'text', icon: <Smartphone size={18} />, color: 'bg-indigo-600' },
        { id: 'app-version', label: 'Versi Aplikasi', key: 'appVersion', value: config.appVersion, type: 'text', icon: <Shield size={18} />, color: 'bg-emerald-600' },
      ]
    }
  ];

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary dark:bg-[#0F172A] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading System Config...</p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-bg-primary dark:bg-[#0F172A] pb-40 transition-colors duration-300", config.darkMode && "dark")}>
      <div className="pt-12 px-6">
        <header className="mb-10">
          <Link to="/" className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl soft-shadow flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors mb-8 border border-slate-50 dark:border-slate-700">
            <ArrowLeft size={20} />
          </Link>
          <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-1">System Architecture</p>
          <div className="flex justify-between items-center text-slate-900 dark:text-white">
            <h1 className="text-3xl font-black tracking-tight">Pengaturan</h1>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Settings size={22} className={cn(saving && "animate-spin")} />
              </div>
              {syncStatus === 'success' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </motion.div>
              )}
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="glass dark:bg-slate-800/50 rounded-2xl h-14 flex items-center px-4 mb-10 soft-shadow border-white/20 dark:border-slate-700/50 group focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
          <Search className="text-slate-300 mr-3" size={20} />
          <input 
            type="text" 
            placeholder="Cari pengaturan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none flex-1 text-slate-800 dark:text-white text-sm font-bold focus:ring-0 placeholder:text-slate-300"
          />
        </div>

        {/* Categories List */}
        <div className="space-y-12">
          {filteredCategories.map((category) => (
            <motion.section 
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-2">{category.label}</h2>
              <div className="bg-white dark:bg-slate-800/80 rounded-[40px] soft-shadow border border-slate-50 dark:border-slate-700/50 overflow-hidden">
                {category.items.map((item, index) => (
                  <div 
                    key={item.id}
                    onClick={() => openEditor(item)}
                    className={cn(
                      "group p-5 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-900 transition-colors relative cursor-pointer",
                      index !== category.items.length - 1 && "border-b border-slate-50 dark:border-slate-700/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5 transition-transform group-hover:scale-110",
                        item.color
                      )}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 dark:text-white text-sm leading-none">{item.label}</h3>
                        {typeof item.value === 'boolean' ? (
                          <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
                            {item.value ? 'AKTIF' : 'NON-AKTIF'}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">{item.value as string}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {item.type === 'toggle' ? (
                        <div className={cn(
                          "w-12 h-12 flex items-center justify-center transition-colors",
                          item.value ? "text-blue-600 dark:text-blue-400" : "text-slate-200 dark:text-slate-700"
                        )}>
                          <ToggleRight size={32} className={cn("transition-transform", !item.value && "rotate-180 opacity-50")} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-blue-600 transition-colors">
                          <ChevronRight size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Sync Info Area */}
        <div className="mt-16 bg-gradient-to-tr from-slate-900 to-slate-800 p-8 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Cloud size={80} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Database Linked</span>
                </div>
                <h4 className="text-xl font-black mb-2">Sinkronisasi Cloud</h4>
                <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-[220px]">Pastikan perubahan disimpan untuk memperbarui sistem di seluruh perangkat.</p>
            </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border border-white/20"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", editingItem.color)}>
                    {editingItem.icon}
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-lg">{editingItem.label}</h3>
                </div>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {editingItem.options ? (
                  <div className="space-y-2">
                    {editingItem.options.map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => setEditValue(opt)}
                        className={cn(
                          "w-full p-4 rounded-2xl text-left text-[11px] font-black uppercase tracking-widest transition-all border",
                          editValue === opt 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-200"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <input 
                      autoFocus
                      type="text"
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white font-bold text-sm focus:ring-0 p-0"
                      placeholder={`Masukkan ${editingItem.label}...`}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={saveEdit}
                className="w-full h-14 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                Konfirmasi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Bar (Settings Action) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-[120] pointer-events-none">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="max-w-md mx-auto pointer-events-auto"
        >
          <div className="bg-slate-900 dark:bg-white p-2 rounded-[32px] flex items-center justify-between shadow-2xl">
            <Link to="/" className="px-8 py-4 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest">
              Kembali
            </Link>
            <button 
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "h-14 px-10 rounded-[24px] text-white flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all",
                syncStatus === 'success' ? "bg-emerald-500" : "bg-blue-600"
              )}
            >
              {saving ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : syncStatus === 'success' ? (
                <CheckCircle2 size={20} />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'Menyimpan...' : syncStatus === 'success' ? 'Tersimpan' : 'Simpan'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
