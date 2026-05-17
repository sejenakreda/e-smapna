import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Wallet, 
  Building2, 
  Settings, 
  LayoutGrid, 
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Globe,
  Bell
} from 'lucide-react';
import { ModulePage, ModuleCard } from './ModuleLayout';
import { Link } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { ALL_MENUS } from './Springboard';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

export const SchoolPortalIndex: React.FC = () => {
    const { config } = useConfig();
    const { profile } = useAuth();

    const categories = [
        { 
            title: 'Administrasi Utama', 
            icon: <ShieldCheck size={20} />, 
            color: 'text-blue-600',
            menus: ['admin-users', 'admin-profile', 'admin-gtk', 'admin-tu']
        },
        {
            title: 'Bidang Wakasek',
            icon: <Building2 size={20} />,
            color: 'text-orange-600',
            menus: ['admin-waka-curriculum', 'admin-waka-students', 'admin-waka-sarpras', 'admin-waka-humas']
        },
        { 
            title: 'Akademik & Siswa', 
            icon: <BookOpen size={20} />, 
            color: 'text-indigo-600',
            menus: ['admin-academic', 'admin-schedule', 'admin-students', 'admin-bk', 'admin-ppdb']
        },
        { 
            title: 'Sarana & Keuangan', 
            icon: <Wallet size={20} />, 
            color: 'text-emerald-600',
            menus: ['admin-finance', 'admin-pembina']
        },
        { 
            title: 'Layanan & Sistem', 
            icon: <Settings size={20} />, 
            color: 'text-slate-600',
            menus: ['admin-info', 'admin-attendance', 'admin-parents', 'admin-settings-full']
        }
    ];

    const hasAccess = (requiredRoles: string[]) => {
        if (!profile) return false;
        const userRoles = profile.roles || [];
        if (userRoles.includes('admin')) return true;
        return requiredRoles.some(role => userRoles.includes(role as UserRole));
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        visibleMenus: cat.menus.map(id => ALL_MENUS.find(m => m.id === id)).filter(menu => menu && hasAccess(menu.roles))
    })).filter(cat => cat.visibleMenus.length > 0);

    return (
        <ModulePage 
            title="E-SMAPNA Hub" 
            subtitle="Central Portal Ecosystem" 
            icon={<LayoutGrid size={28} />} 
            color="bg-blue-600"
        >
            <div className="grid grid-cols-2 gap-4 mb-12">
                <ModuleCard 
                    title="Traffic Sistem" 
                    value="4.2k" 
                    label="Hits Hari Ini" 
                    icon={<Zap size={20} />} 
                    color="bg-orange-500" 
                    trend="+15%"
                />
                <ModuleCard 
                    title="Uptime" 
                    value="99.9%" 
                    label="Active Tunnel" 
                    icon={<Activity size={20} />} 
                    color="bg-blue-600" 
                />
            </div>

            <div className="space-y-12">
                {filteredCategories.map((cat, idx) => (
                    <section key={idx}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn("w-10 h-10 rounded-xl bg-white dark:bg-slate-800 soft-shadow flex items-center justify-center border border-slate-50 dark:border-slate-700", cat.color)}>
                                {cat.icon}
                            </div>
                            <h2 className="text-slate-900 dark:text-white font-black text-lg tracking-tight">{cat.title}</h2>
                        </div>

                        <div className="space-y-3">
                            {cat.visibleMenus.map((menu: any) => (
                                <Link 
                                    key={menu.id} 
                                    to={menu.path}
                                    className="bg-white dark:bg-slate-800/50 p-5 rounded-[28px] border border-slate-50 dark:border-slate-700 soft-shadow flex items-center gap-4 group hover:bg-slate-50 dark:hover:bg-slate-700 transition-all transition-all active:scale-95"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg", menu.color)}>
                                        {menu.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-800 dark:text-white text-[14px] leading-tight">{menu.label}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{menu.description}</p>
                                    </div>
                                    <ArrowRight size={18} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="mt-16 p-8 rounded-[48px] bg-gradient-to-br from-slate-900 to-blue-900 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Globe size={100} />
                </div>
                <div className="relative z-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-2">Cloud Monitoring</p>
                    <h3 className="text-2xl font-black mb-4">Sistem Terintegrasi</h3>
                    <p className="text-blue-100 text-xs leading-relaxed max-w-[240px] mx-auto opacity-70">
                        Seluruh modul portal sekolah tersinkronisasi secara realtime dengan database pusat.
                    </p>
                    <div className="inline-flex mt-8 items-center gap-3 px-6 py-3 bg-white/10 rounded-2xl border border-white/20">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Security Core v2 Active</span>
                    </div>
                </div>
            </div>
        </ModulePage>
    );
};

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
