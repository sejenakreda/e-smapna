import React from 'react';
import { 
  Component, 
  Trophy, 
  Construction, 
  Megaphone,
  Plus,
  FileText,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
  Users,
  Calendar,
  Building,
  Flag
} from 'lucide-react';
import { ModulePage, ModuleSearch, ModuleCard } from './ModuleLayout';

// Waka Kurikulum
export const WakaKurikulumPortal: React.FC = () => {
    return (
        <ModulePage 
            title="Waka Kurikulum" 
            subtitle="Manajemen Akademik & KBM" 
            icon={<Component size={28} />} 
            color="bg-indigo-600"
            actions={
                <button className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white active:scale-90 transition-all">
                    <Plus size={24} />
                </button>
            }
        >
            <ModuleSearch placeholder="Cari modul kurikulum..." />
            <div className="grid grid-cols-2 gap-4 mb-8">
                <ModuleCard title="Perangkat" value="92%" label="Kesiapan Guru" icon={<FileText size={20} />} color="bg-blue-600" />
                <ModuleCard title="Jadwal" value="Genap" label="TA 2023/2024" icon={<Calendar size={20} />} color="bg-indigo-600" />
            </div>
            {/* Template lists could go here */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] text-center border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-xs">Modul Manajemen Kurikulum Sedang Disiapkan</p>
            </div>
        </ModulePage>
    );
};

// Waka Kesiswaan
export const WakaKesiswaanPortal: React.FC = () => {
    return (
        <ModulePage 
            title="Waka Kesiswaan" 
            subtitle="Kesiswaan & Ekstrakurikuler" 
            icon={<Trophy size={28} />} 
            color="bg-rose-600"
        >
            <div className="grid grid-cols-2 gap-4 mb-8">
                <ModuleCard title="Pelanggaran" value="12" label="Kasus Hari Ini" icon={<Activity size={20} />} color="bg-rose-500" trend="-5%" />
                <ModuleCard title="Poin Siswa" value="4.8k" label="Total Reward" icon={<TrendingUp size={20} />} color="bg-emerald-500" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] text-center border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-xs">Modul Kesiswaan Sedang Disiapkan</p>
            </div>
        </ModulePage>
    );
};

// Waka Sarpras
export const WakaSarprasPortal: React.FC = () => {
    return (
        <ModulePage 
            title="Waka Sarpras" 
            subtitle="Sarana & Prasarana" 
            icon={<Construction size={28} />} 
            color="bg-teal-600"
        >
            <div className="grid grid-cols-2 gap-4 mb-8">
                <ModuleCard title="Aset" value="842" label="Barang Terdata" icon={<Building size={20} />} color="bg-slate-800" />
                <ModuleCard title="Kondisi" value="98%" label="Sangat Baik" icon={<ShieldCheck size={20} />} color="bg-teal-600" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] text-center border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-xs">Modul Sarana Prasarana Sedang Disiapkan</p>
            </div>
        </ModulePage>
    );
};

// Waka Humas
export const WakaHumasPortal: React.FC = () => {
    return (
        <ModulePage 
            title="Waka Humas" 
            subtitle="Hubungan Masyarakat & Industri" 
            icon={<Megaphone size={28} />} 
            color="bg-amber-600"
        >
            <div className="grid grid-cols-2 gap-4 mb-8">
                <ModuleCard title="MoU" value="48" label="Mitra Industri" icon={<Flag size={20} />} color="bg-amber-500" />
                <ModuleCard title="Agenda" value="12" label="Bulan Ini" icon={<Calendar size={20} />} color="bg-slate-800" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] text-center border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-xs">Modul Hubungan Masyarakat Sedang Disiapkan</p>
            </div>
        </ModulePage>
    );
};

const ShieldCheck = ({ size }: { size: number }) => <Construction size={size} />;
