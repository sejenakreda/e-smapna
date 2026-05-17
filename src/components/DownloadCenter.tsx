import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FileDown, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Clock,
  Printer,
  Download,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Document {
  id: string;
  title: string;
  category: 'presensi' | 'akademik' | 'keuangan' | 'sk_tugas';
  type: 'pdf' | 'excel';
  date: string;
  size: string;
  status: 'ready' | 'pending';
}

const SAMPLE_DOCS: Document[] = [
  { id: '1', title: 'Laporan Presensi Pegawai - April 2024', category: 'presensi', type: 'pdf', date: '2024-04-30', size: '1.2 MB', status: 'ready' },
  { id: '2', title: 'Rekap Absensi Harian - 13 Mei 2024', category: 'presensi', type: 'excel', date: '2024-05-13', size: '450 KB', status: 'ready' },
  { id: '3', title: 'Daftar Nilai Ulangan Harian X-IPA-1', category: 'akademik', type: 'excel', date: '2024-05-10', size: '890 KB', status: 'ready' },
  { id: '4', title: 'SK Pembagian Tugas Mengajar Ganjil', category: 'sk_tugas', type: 'pdf', date: '2023-07-15', size: '2.5 MB', status: 'ready' },
];

export const DownloadCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'Semua', icon: <FileText size={16} /> },
    { id: 'presensi', label: 'Presensi', icon: <Clock size={16} /> },
    { id: 'akademik', label: 'Akademik', icon: <FileText size={16} /> },
    { id: 'keuangan', label: 'Keuangan', icon: <FileSpreadsheet size={16} /> },
    { id: 'sk_tugas', label: 'SK & Tugas', icon: <FileCode size={16} /> },
  ];

  const filteredDocs = SAMPLE_DOCS.filter(doc => {
    const matchesTab = activeTab === 'all' || doc.category === activeTab;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-mesh pb-24">
      <div className="pt-12 px-6">
        <header className="mb-10">
          <Link to="/" className="w-12 h-12 bg-white rounded-2xl soft-shadow flex items-center justify-center text-slate-400 mb-8 hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-600" />
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.25em]">Manajemen Berkas</p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pusat Unduhan</h1>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Cari laporan atau dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 backdrop-blur-xl border border-white/50 rounded-[28px] py-5 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all soft-shadow"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-6 px-6 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                activeTab === cat.id 
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                  : "bg-white/60 text-slate-500 border-white/50"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* File List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  key={doc.id}
                  className="bg-white/70 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow group hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center soft-shadow mb-0",
                      doc.type === 'pdf' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      {doc.type === 'pdf' ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          doc.category === 'presensi' ? "bg-blue-50 text-blue-500" :
                          doc.category === 'akademik' ? "bg-amber-50 text-amber-500" :
                          doc.category === 'sk_tugas' ? "bg-indigo-50 text-indigo-500" : "bg-slate-50 text-slate-500"
                        )}>
                          {doc.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">• {doc.size}</span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 truncate leading-tight">{doc.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dibuat: {doc.date}</p>
                    </div>
                    <button className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                       <Download size={20} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/40 border-2 border-dashed border-slate-200 rounded-[40px] p-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                   <Search size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-400">Berkas tidak ditemukan</h3>
                <p className="text-sm font-bold text-slate-400 mt-2">Coba gunakan kata kunci lain atau filter kategori berbeda</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Generate Report Placeholder */}
        <div className="mt-12 p-8 bg-indigo-900 rounded-[48px] relative overflow-hidden shadow-2xl shadow-indigo-500/20">
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Printer size={120} />
           </div>
           <div className="relative z-10">
              <h3 className="text-xl font-black text-white mb-2">Buat Laporan Baru</h3>
              <p className="text-indigo-200 text-xs font-bold leading-relaxed mb-8 max-w-[80%]">
                 Butuh laporan instan? Sistem dapat mengenerate laporan kustom sesuai rentang waktu yang Anda tentukan.
              </p>
              <button className="px-8 py-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-colors">
                 Mulai Generate
              </button>
           </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-8 flex items-start gap-3 px-4">
           <Info className="text-slate-400 shrink-0" size={16} />
           <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
             Daftar dokumen di atas bersifat dinamis. Pastikan Anda memiliki otoritas untuk mengunduh laporan tertentu. Semua log pengunduhan akan dicatat oleh sistem pusat.
           </p>
        </div>
      </div>
    </div>
  );
};
