import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, Filter, MoreVertical, LayoutGrid, List, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';

interface ModulePageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ModulePage: React.FC<ModulePageProps> = ({ 
  title, 
  subtitle, 
  icon, 
  color, 
  children, 
  actions 
}) => {
  const { config } = useConfig();

  return (
    <div className={cn("min-h-screen bg-bg-primary dark:bg-[#0F172A] pb-40 transition-colors duration-300", config.darkMode && "dark")}>
      <div className="pt-12 px-6">
        <header className="mb-10">
          <div className="flex justify-between items-start mb-8">
            <Link to="/" className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl soft-shadow flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-50 dark:border-slate-700">
              <ArrowLeft size={20} />
            </Link>
            {actions}
          </div>
          
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
                {icon}
            </div>
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-1">{subtitle}</p>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

interface ModuleSearchProps {
  searchTerm?: string;
  setSearchTerm?: (val: string) => void;
  placeholder?: string;
  extraFilters?: React.ReactNode;
}

export const ModuleSearch: React.FC<ModuleSearchProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  placeholder = "Cari data...",
  extraFilters
}) => (
  <div className="flex flex-col md:flex-row gap-4 mb-8">
    <div className="flex-1 glass dark:bg-slate-800/50 rounded-2xl h-14 flex items-center px-4 soft-shadow border-white/20 dark:border-slate-700/50 group focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
      <Search className="text-slate-300 mr-3" size={20} />
      <input 
        type="text" 
        value={searchTerm}
        onChange={(e) => setSearchTerm?.(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-none flex-1 text-slate-800 dark:text-white text-sm font-bold focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />
      {setSearchTerm && searchTerm && (
        <button 
          onClick={() => setSearchTerm('')}
          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
    {extraFilters}
  </div>
);

export const ModuleCard: React.FC<{
  title: string;
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  subValue?: string;
}> = ({ title, value, label, icon, color, trend, subValue }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-[32px] soft-shadow border border-slate-50 dark:border-slate-700 relative overflow-hidden group">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg", color)}>
            {icon}
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
          {subValue && <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">{subValue}</span>}
        </div>
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
            {trend && <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{trend}</span>}
        </div>
    </div>
);
