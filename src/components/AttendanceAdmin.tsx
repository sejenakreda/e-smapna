import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc, startAt, endAt } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertCircle,
  Download,
  Filter,
  ArrowUpDown,
  History,
  FileSpreadsheet,
  FileText as FilePdf
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfig } from '../context/ConfigContext';

export const AttendanceAdmin: React.FC = () => {
  const { profile } = useAuth();
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'logs'>('stats');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    noFace: 0
  });

  const [showExportMenu, setShowExportMenu] = useState(false);

  const canSeeAll = profile?.roles.some(r => ['admin', 'kepsek', 'kurikulum', 'operator'].includes(r));

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (canSeeAll) {
        // Fetch all staff users (exclude students and parents)
        const usersSnap = await getDocs(collection(db, 'users'));
        const allUsers = usersSnap.docs
          .map(doc => ({ ...doc.data(), uid: doc.id } as any))
          .filter((u: any) => {
            const roles = u.roles || [];
            // Exclude pure admins or anyone with admin role if user wants them off stats
            if (roles.includes('admin')) return false;

            const hasStaffRole = roles.some((r: string) => 
               ['teacher', 'guru', 'staff', 'staff_tu', 'kepsek', 'kurikulum', 'waka_kurikulum', 'operator', 'bendahara', 'kepala_tu', 'bk'].includes(r)
            );
            return hasStaffRole;
          });
        
        setUsers(allUsers);

        // Fetch today's logs for monitoring
        const logsSnap = await getDocs(query(
          collection(db, 'staff_attendance'),
          where('date', '==', today)
        ));
        const todayLogs = logsSnap.docs.map(doc => doc.data());
        setLogs(todayLogs);

        // Fetch all logs (limited to last 100 for performance, or can be filtered)
        const allLogsSnap = await getDocs(query(
          collection(db, 'staff_attendance'),
          orderBy('date', 'desc'),
          limit(100)
        ));
        setAllLogs(allLogsSnap.docs.map(doc => doc.data()));

        // Calculate stats
        const present = todayLogs.length;
        const late = todayLogs.filter((l: any) => l.checkIn?.status === 'late').length;
        
        // Count users who HAVE registered their face
        const hasFaceCount = allUsers.filter((u: any) => 
          u.faceDescriptor && Array.isArray(u.faceDescriptor) && u.faceDescriptor.length > 0
        ).length;
        
        const noFace = allUsers.length - hasFaceCount;

        setStats({
          total: allUsers.length,
          present,
          late,
          noFace
        });
      } else {
        // Teacher view - only their own logs
        const myLogsSnap = await getDocs(query(
          collection(db, 'staff_attendance'),
          where('uid', '==', profile.uid),
          orderBy('date', 'desc'),
          limit(30)
        ));
        const myLogs = myLogsSnap.docs.map(doc => doc.data());
        setLogs(myLogs.filter(l => l.date === today));
        setAllLogs(myLogs);
        
        setStats({
          total: 1,
          present: myLogs.some(l => l.date === today) ? 1 : 0,
          late: myLogs.find(l => l.date === today)?.checkIn?.status === 'late' ? 1 : 0,
          noFace: (profile.faceDescriptor && Array.isArray(profile.faceDescriptor) && profile.faceDescriptor.length > 0) ? 0 : 1
        });

        // For users tab in teacher view, just show self
        setUsers([profile]);
      }

    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      const data = allLogs.map(log => {
        const user = users.find(u => u.uid === log.uid);
        const position = user?.roles?.join(', ') || 'Pegawai';
        const statusStr = 'Hadir'; // Default to Hadir for existing scanned logs
        const keteranganStr = log.checkIn?.status === 'late' ? 'Terlambat' : 'Tepat Waktu';

        return {
          'Tanggal': log.date,
          'Nama Pegawai': log.name,
          'Jabatan': position,
          'Check In': log.checkIn?.time || '-',
          'Check Out': log.checkOut?.time || '-',
          'Status': statusStr,
          'Keterangan': keteranganStr,
          'Catatan': log.notes || '-'
        };
      });

      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Absensi Pegawai");
      
      // Auto-size columns
      const maxWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      worksheet['!cols'] = maxWidths;

      writeFile(workbook, `Laporan_Absensi_Lengkap_${new Date().toLocaleDateString('id-ID')}.xlsx`);
    } catch (err) {
      console.error("Excel Export error:", err);
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Add Kop Surat if available
      let startY = 22;
      if (config.kopSuratUrl) {
        try {
          let directUrl = config.kopSuratUrl;
          if (config.kopSuratUrl.includes('drive.google.com')) {
            const fileId = config.kopSuratUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 
                         config.kopSuratUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
            if (fileId) {
              directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            }
          }

          // Use Image object which is sometimes more reliable for jspdf
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = directUrl;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 3000); // 3s timeout
          });

          doc.addImage(img, 'JPEG', 14, 10, 182, 35);
          startY = 55;
        } catch (e) {
          console.warn("Failed to load Kop Surat image for PDF:", e);
          doc.setFontSize(22);
          doc.setTextColor(30, 41, 59);
          doc.text("SMAS PGRI NARINGGUL", 105, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(config.schoolAddress || "Jl. Raya Naringgul No.1, Cianjur", 105, 27, { align: 'center' });
          doc.setLineWidth(0.5);
          doc.line(14, 32, 196, 32);
          doc.setLineWidth(0.2);
          doc.line(14, 33, 196, 33);
          startY = 42;
        }
      } else {
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("SMAS PGRI NARINGGUL", 14, 20);
        startY = 35;
      }

      // Report Info
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN PRESENSI PEGAWAI", 105, startY, { align: 'center' });
      doc.text("SMAS PGRI NARINGGUL", 105, startY + 8, { align: 'center' });
      
      doc.setFontSize(11);
      // Fixed header text as requested: TAHUN AJARAN 2025/2026 - GENAP
      doc.text(`TAHUN AJARAN 2025/2026 - GENAP`, 105, startY + 16, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, startY + 23);
      
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Catatan: Jam masuk utama: ${config.attendanceStartTime || '07:00'} WIB. Batas keterlambatan: ${config.lateTolerance || 0} menit.`, 14, startY + 27);
      doc.text(`Status "Terlambat" otomatis diberikan oleh sistem jika check-in melewati batas waktu toleransi.`, 14, startY + 31);
      
      const tableData = allLogs.map(log => {
        const user = users.find(u => u.uid === log.uid);
        const position = user?.roles?.join(', ') || 'Pegawai';
        return [
          log.date,
          log.name,
          position,
          log.checkIn?.time || '-',
          log.checkOut?.time || '-',
          'Hadir',
          log.checkIn?.status === 'late' ? 'Telat' : 'Tepat'
        ];
      });

      autoTable(doc, {
        startY: startY + 40,
        head: [['Tanggal', 'Nama Pegawai', 'Jabatan', 'Check In', 'Check Out', 'Status', 'Keterangan']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        columnStyles: {
          2: { cellWidth: 30 }, // Jabatan column
        },
        didDrawPage: (data) => {
          // Footer
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Dokumen ini diunduh secara resmi melalui portal E-SMAPNA`, 
            14, 
            pageHeight - 15
          );
          doc.text(
            `Diunduh oleh: ${profile?.name || '-' } (${profile?.roles?.[0] || 'User'}) pada ${new Date().toLocaleString('id-ID')}`, 
            14, 
            pageHeight - 10
          );
        }
      });

      doc.save(`Laporan_Absensi_Lengkap_${new Date().toLocaleDateString('id-ID')}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['Tanggal', 'Nama', 'Check In', 'Status In', 'Check Out', 'Total Jam'];
      const rows = allLogs.map(log => [
        log.date,
        log.name,
        log.checkIn?.time || '-',
        log.checkIn?.status === 'late' ? 'Terlambat' : 'Tepat Waktu',
        log.checkOut?.time || '-',
        '-' // Logic for total hours could be added
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Absensi_${new Date().toLocaleDateString('id-ID')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
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
            <div className="flex gap-2 relative">
              {canSeeAll && (
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exporting}
                    className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Download size={14} />
                    Unduh
                  </button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-2 right-0 w-48 bg-white rounded-2xl soft-shadow border border-slate-100 overflow-hidden z-50"
                      >
                        <button 
                          onClick={exportToExcel}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <FileSpreadsheet size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Excel (.xlsx)</span>
                        </button>
                        <button 
                          onClick={exportToPDF}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-50"
                        >
                          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <FilePdf size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">PDF (.pdf)</span>
                        </button>
                        <button 
                          onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                          className="w-full px-4 py-2 text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors border-t border-slate-50"
                        >
                          Unduh CSV lama
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <Link 
                to="/absensi/scan"
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-transform"
              >
                <Camera size={14} />
                Presensi
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.25em]">
              {canSeeAll ? 'Manajemen Presensi' : 'Riwayat Absensi Saya'}
            </p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {canSeeAll ? 'Monitoring Kehadiran' : 'Log Kehadiran'}
          </h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                 <Users size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                {canSeeAll ? 'Total Pegawai' : 'Status Akun'}
              </p>
              <h3 className="text-2xl font-black text-slate-900">
                {canSeeAll ? stats.total : (profile?.roles.includes('guru') ? 'Guru' : 'Pegawai')}
              </h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                 <CheckCircle2 size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Hari Ini</p>
              <h3 className="text-2xl font-black text-slate-900">
                {stats.present ? (canSeeAll ? stats.present : 'Hadir') : 'Belum Absen'}
              </h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                 <Clock size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Terlambat</p>
              <h3 className="text-2xl font-black text-slate-900">
                {canSeeAll ? stats.late : (stats.late ? 'Ya' : 'Tidak')}
              </h3>
           </div>
           <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                 <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Face ID</p>
              <h3 className="text-2xl font-black text-slate-900">
                {canSeeAll ? stats.total - stats.noFace : (profile?.faceDescriptor ? 'Aktif' : 'Belum')}
              </h3>
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
            {canSeeAll ? 'Hari Ini' : 'Ringkasan'}
          </button>
          {canSeeAll && (
            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'users' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
              )}
            >
              Pegawai
            </button>
          )}
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'logs' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
            )}
          >
            Log {canSeeAll ? 'Lengkap' : 'Saya'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'stats' && (
            <div className="space-y-4">
               {logs.length === 0 ? (
                 <div className="bg-white/40 p-12 rounded-[40px] border border-dashed border-slate-300 text-center">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-400">Belum ada data absensi hari ini</p>
                 </div>
               ) : (
                 logs.map((log, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     key={idx} 
                     className="bg-white/60 p-5 rounded-[32px] border border-white/50 soft-shadow flex items-center gap-4"
                   >
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
                   </motion.div>
                 ))
               )}
            </div>
          )}

          {activeTab === 'users' && canSeeAll && (
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
                       {u.faceDescriptor && Array.isArray(u.faceDescriptor) && u.faceDescriptor.length > 0 ? (
                         <div title="Face ID Aktif" className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <ShieldCheck size={16} />
                         </div>
                       ) : (
                         <div title="Belum Face ID" className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                            <AlertCircle size={16} />
                         </div>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="space-y-3">
                {allLogs.length === 0 ? (
                  <div className="bg-white/40 p-12 rounded-[40px] border border-dashed border-slate-300 text-center">
                    <History className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-400">Belum ada riwayat log</p>
                  </div>
                ) : (
                  allLogs.map((log, idx) => (
                    <div key={idx} className="bg-white/40 p-4 rounded-3xl border border-white/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{log.date.split('-')[2]}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(log.date).toLocaleDateString('id-ID', { month: 'short' })}</p>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200" />
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{canSeeAll ? log.name : 'Presensi Harian'}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.checkIn?.time} - {log.checkOut?.time || '---'}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        log.checkIn?.status === 'late' ? "bg-rose-400" : "bg-emerald-400"
                      )} />
                    </div>
                  ))
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

