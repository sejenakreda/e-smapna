import React from 'react';
import { motion } from 'motion/react';
import { 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Hash, 
  UserCheck, 
  Calendar,
  Shield,
  Edit2,
  Camera,
  ExternalLink,
  Award,
  BookOpen,
  Users,
  FileText
} from 'lucide-react';
import { ModulePage, ModuleCard } from './ModuleLayout';
import { useConfig } from '../context/ConfigContext';
import { transformDriveUrl } from '../lib/utils';
import { Link } from 'react-router-dom';

export const AdminProfile: React.FC = () => {
  const { config } = useConfig();

  return (
    <ModulePage 
      title="Profil Sekolah" 
      subtitle="Identitas & Legalitas" 
      icon={<School size={28} />} 
      color="bg-emerald-500"
      actions={
        <Link to="/admin/settings" className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl soft-shadow flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-50 dark:border-slate-700">
          <Edit2 size={20} />
        </Link>
      }
    >
      {/* Cover & Brand */}
      <div className="relative mb-8">
        <div className="h-32 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-[32px] shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>
        <div className="absolute -bottom-6 left-8 flex items-end gap-5">
           <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-slate-900 p-1 soft-shadow border-4 border-emerald-50 dark:border-emerald-900/30 overflow-hidden">
             {config.schoolLogo ? (
                <img 
                  src={transformDriveUrl(config.schoolLogo)} 
                  alt="School Logo" 
                  className="w-full h-full object-cover rounded-[24px]"
                  referrerPolicy="no-referrer"
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-[24px]">
                    <School size={40} />
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="mt-12 px-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{config.schoolName}</h2>
        <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Terverifikasi Dapodik</span>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-12">
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-50 dark:border-slate-700 soft-shadow">
                <h3 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-6">Informasi Dasar</h3>
                <div className="space-y-6">
                    <InfoRow icon={<Hash size={18} />} label="NPSN / NSS" value={config.npsnCode} />
                    <InfoRow icon={<UserCheck size={18} />} label="Kepala Sekolah" value={config.principalName} />
                    <InfoRow icon={<Calendar size={18} />} label="Tahun Berdiri" value={config.establishedYear} />
                    <InfoRow icon={<FileText size={18} />} label="No. Izin Operasional" value={config.opLicenseNumber} />
                    <InfoRow icon={<MapPin size={18} />} label="Alamat" value={config.schoolAddress} />
                    <InfoRow icon={<Phone size={18} />} label="Kontak" value={config.schoolContact} />
                    <InfoRow icon={<Mail size={18} />} label="Email Official" value={`info@${config.schoolName.toLowerCase().replace(/\s/g, '')}.sch.id`} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <ModuleCard 
                    title="Akreditasi" 
                    value={config.accreditation} 
                    label="Peringkat Sekolah" 
                    icon={<Award size={20} />} 
                    color="bg-amber-500" 
                    trend="+92.5"
                />
                <ModuleCard 
                    title="Kurikulum" 
                    value={config.curriculum.split(' ')[1] || 'Merdeka'} 
                    label={config.curriculum} 
                    icon={<BookOpen size={20} />} 
                    color="bg-blue-600" 
                />
            </div>
        </div>

        <div className="bg-slate-900 dark:bg-white p-8 rounded-[40px] text-white dark:text-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Shield size={80} />
            </div>
            <div className="relative z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">Visi Sekolah</p>
                <h4 className="text-xl font-black mb-4 leading-tight group">
                    "Mewujudkan Generasi Unggul, Berkarakter, dan Menguasai Teknologi"
                </h4>
                <button className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest mt-6">
                    Lihat Selengkapnya <ExternalLink size={12} />
                </button>
            </div>
        </div>
      </div>
    </ModulePage>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:text-blue-500 transition-colors flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
            {icon}
        </div>
        <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{value}</p>
        </div>
    </div>
);
