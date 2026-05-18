import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  getDoc, 
  doc, 
  startAt, 
  endAt, 
  updateDoc, 
  setDoc, 
  serverTimestamp,
  addDoc 
} from 'firebase/firestore';
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
  FileText as FilePdf,
  FileText,
  Check,
  X,
  RefreshCw,
  MoreVertical,
  Activity,
  BarChart as BarIcon,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfig } from '../context/ConfigContext';
import { LeaveRequest, StaffAttendance as StaffAttType } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export const AttendanceAdmin: React.FC = () => {
  const { profile } = useAuth();
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'logs' | 'leave'>('stats');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<StaffAttType[]>([]);
  const [allLogs, setAllLogs] = useState<StaffAttType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    noFace: 0,
    leave: 0,
    absent: 0
  });

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  const canSeeAll = profile?.roles.some(r => ['admin', 'kepsek', 'wakakur', 'wakasis', 'wakahum', 'wakasar', 'operator', 'kepala_tu'].includes(r));

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const now = new Date();
      // Use Jakarta time for today's date
      const today = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Jakarta', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);
      
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
               ['teacher', 'guru', 'staff', 'staff_tu', 'kepsek', 'wakakur', 'wakasis', 'wakasar', 'wakahum', 'operator', 'bendahara', 'kepala_tu', 'bk'].includes(r)
            );
            return hasStaffRole;
          });
        
        setUsers(allUsers);

        // Fetch all leave requests
        const leaveSnap = await getDocs(collection(db, 'leave_requests'));
        const allLeave = leaveSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        setLeaveRequests(allLeave);

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
        const allLogsData = allLogsSnap.docs.map(doc => doc.data() as StaffAttType);
        setAllLogs(allLogsData);

        // Calculate Weekly Chart Data
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const weekly = last7Days.map(dateStr => {
          const dayLogs = allLogsData.filter(l => l.date === dateStr);
          const dayLeaves = allLeave.filter(l => l.status === 'approved' && dateStr >= l.startDate && dateStr <= l.endDate);
          const label = new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short' });
          return {
            date: dateStr,
            display: label,
            Hadir: dayLogs.length,
            Izin: dayLeaves.length,
            Alpa: allUsers.length - dayLogs.length - dayLeaves.length
          };
        });
        setWeeklyData(weekly);

        // Fetch today's confirmed leaves
        const todayLeaves = allLeave.filter(l => l.status === 'approved' && today >= l.startDate && today <= l.endDate);

        // Calculate stats
        const present = todayLogs.length;
        const late = todayLogs.filter((l: any) => l.checkIn?.status === 'late').length;
        const leave = todayLeaves.length;
        const absent = allUsers.length - present - leave;
        
        // Count users who HAVE registered their face
        const hasFaceCount = allUsers.filter((u: any) => 
          u.faceDescriptor && Array.isArray(u.faceDescriptor) && u.faceDescriptor.length > 0
        ).length;
        
        const noFace = allUsers.length - hasFaceCount;

        setStats({
          total: allUsers.length,
          present,
          late,
          noFace,
          leave,
          absent: absent > 0 ? absent : 0
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

  const processLeave = async (request: LeaveRequest, action: 'approved' | 'rejected') => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'leave_requests', request.id), {
        status: action,
        processedBy: profile.uid,
        processedAt: new Date().toISOString()
      });

      // If approved, create entry in staff_attendance for all dates in range
      if (action === 'approved') {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const cur = new Date(start);
        
        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          const docId = `${request.uid}_${dateStr}`;
          await setDoc(doc(db, 'staff_attendance', docId), {
            uid: request.uid,
            name: request.name,
            date: dateStr,
            status: request.type,
            updatedAt: serverTimestamp(),
            leaveRequestId: request.id
          }, { merge: true });
          cur.setDate(cur.getDate() + 1);
        }
      }

      await addDoc(collection(db, 'audit_logs'), {
        type: 'ATTENDANCE',
        action: 'LEAVE_DECISION',
        message: `${action === 'approved' ? 'Menyetujui' : 'Menolak'} izin: ${request.name} (${request.type})`,
        user: profile.name || 'Admin',
        timestamp: serverTimestamp()
      });

      alert(`Berhasil ${action === 'approved' ? 'menyetujui' : 'menolak'} pengajuan.`);
      fetchData();
    } catch (err: any) {
      alert("Gagal proses: " + err.message);
    }
  };

  const autoMarkAlpa = async () => {
    if (!canSeeAll) return;
    const confirm = window.confirm("Sistem akan melihat siapa saja yang belum absen hari ini dan menandainya sebagai ALPA. Lanjutkan?");
    if (!confirm) return;

    setLoading(true);
    try {
      const now = new Date();
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
      
      const presentUids = new Set(logs.map(l => l.uid));
      const absentUsers = users.filter(u => !presentUids.has(u.uid));

      for (const user of absentUsers) {
        const docId = `${user.uid}_${today}`;
        await setDoc(doc(db, 'staff_attendance', docId), {
          uid: user.uid,
          name: user.name,
          date: today,
          status: 'Alpa',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ATTENDANCE',
        action: 'GENERATE_ALPA',
        message: `Generate ALPA otomatis untuk ${absentUsers.length} pegawai`,
        user: profile.name || 'Admin',
        timestamp: serverTimestamp()
      });

      alert(`Berhasil menandai ${absentUsers.length} pegawai sebagai ALPA.`);
      fetchData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
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

      const dateStr = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }).replace(/\//g, '-');
      writeFile(workbook, `Laporan_Absensi_Lengkap_${dateStr}.xlsx`);

      addDoc(collection(db, 'audit_logs'), {
        type: 'ATTENDANCE',
        action: 'EXPORT',
        message: 'Ekspor laporan absensi (Excel)',
        user: profile?.name || 'Admin',
        timestamp: serverTimestamp()
      });
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
      const printDate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      doc.text(`Dicetak pada: ${printDate} WIB`, 14, startY + 23);
      
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
            `Diunduh oleh: ${profile?.name || '-' } (${profile?.roles?.[0] || 'User'}) pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`, 
            14, 
            pageHeight - 10
          );
        }
      });

      doc.save(`Laporan_Absensi_Lengkap_${new Date().toLocaleDateString('id-ID')}.pdf`);

      addDoc(collection(db, 'audit_logs'), {
        type: 'ATTENDANCE',
        action: 'EXPORT',
        message: 'Ekspor laporan absensi (PDF)',
        user: profile?.name || 'Admin',
        timestamp: serverTimestamp()
      });
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
                        key="attendance-export-menu"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                 <CheckCircle2 size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Hadir</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.present}</h3>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                 <UserX size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Alpa</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.absent}</h3>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                 <Calendar size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Izin/Sakit</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.leave}</h3>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/60 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 soft-shadow">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                 <Clock size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Terlambat</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.late}</h3>
           </motion.div>
        </div>

        {/* Analytics Section */}
        {canSeeAll && weeklyData.length > 0 && activeTab === 'stats' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-white/60 backdrop-blur-xl p-6 rounded-[40px] border border-white/50 soft-shadow"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-none mb-1">Tren Kehadiran Mingguan</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aktivitas 7 Hari Terakhir</p>
                </div>
              </div>
            </div>
            
            <div className="w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="display" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{payload[0].payload.date}</p>
                            {payload.map((p: any) => (
                              <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-xs font-bold text-slate-700">{p.name}: {p.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Hadir" fill="#10B981" radius={[4, 4, 4, 4]} barSize={12} />
                  <Bar dataKey="Izin" fill="#F59E0B" radius={[4, 4, 4, 4]} barSize={12} />
                  <Bar dataKey="Alpa" fill="#EF4444" radius={[4, 4, 4, 4]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Action Bar */}
        {canSeeAll && (
           <div className="flex items-center justify-between mb-8 p-4 bg-blue-50/50 rounded-[28px] border border-blue-100/50">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Activity size={16} />
                 </div>
                 <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Tindakan Cepat</p>
              </div>
              <button 
                 onClick={autoMarkAlpa}
                 className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                 Generate Alpa Hari Ini
              </button>
           </div>
        )}

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
              onClick={() => setActiveTab('leave')}
              className={cn(
                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'leave' ? "bg-white text-blue-600 soft-shadow" : "text-slate-400"
              )}
            >
              Pengajuan
            </button>
          )}
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
          {loading ? (
            <div className="space-y-4 px-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={`skeleton-log-${i}`} className="bg-white/40 p-5 rounded-[32px] border border-white/50 animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-full w-1/3" />
                    <div className="h-2 bg-slate-100 rounded-full w-1/4" />
                  </div>
                  <div className="w-16 h-6 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : activeTab === 'stats' && (
            <div className="space-y-4 px-2">
               {logs.length === 0 ? (
                 <div className="bg-white/40 p-12 rounded-[40px] border border-dashed border-slate-300 text-center">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-400">Belum ada data absensi hari ini</p>
                 </div>
               ) : (
                 <motion.div initial="hidden" animate="visible" variants={{
                   visible: { transition: { staggerChildren: 0.05 } }
                 }} className="space-y-4">
                   {logs.map((log, idx) => (
                     <motion.div 
                       variants={{
                         hidden: { opacity: 0, y: 10 },
                         visible: { opacity: 1, y: 0 }
                       }}
                       key={`today-log-${log.uid}-${log.date}`} 
                       className="bg-white/60 p-5 rounded-[32px] border border-white/50 soft-shadow flex items-center gap-4"
                     >
                       <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                         <Users size={20} />
                      </div>
                      <div className="flex-1">
                         <h4 className="text-sm font-black text-slate-900 leading-none mb-1">{log.name}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           {log.status === 'Hadir' || !log.status ? (
                             `${log.checkIn?.time || '--'} - ${log.checkOut?.time || 'Bekerja'}`
                           ) : (
                             log.status
                           )}
                         </p>
                      </div>
                      <div className="text-right">
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                           log.checkIn?.status === 'late' ? "bg-rose-50 text-rose-500 border-rose-100" : 
                           (log.status === 'Hadir' || !log.status ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-amber-50 text-amber-500 border-amber-100")
                         )}>
                           {log.checkIn?.status === 'late' ? 'Telat' : (log.status || 'Hadir')}
                         </span>
                      </div>
                   </motion.div>
                ))}
            </motion.div>
          )}
            </div>
          )}

          {activeTab === 'leave' && canSeeAll && (
             <div className="space-y-4">
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-sm">Belum ada pengajuan izin/sakit</div>
                ) : (
                  leaveRequests.map((req) => (
                    <div key={`leave-req-admin-${req.id}`} className="bg-white/60 p-6 rounded-[32px] border border-white/50 soft-shadow">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                {req.name.charAt(0)}
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-slate-900 leading-none mb-1">{req.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.type}</p>
                             </div>
                          </div>
                          <span className={cn(
                             "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                             req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : (req.status === 'rejected' ? "bg-rose-50 text-rose-600" : "bg-blue-50/50 text-blue-400")
                          )}>
                             {req.status}
                          </span>
                       </div>
                       
                       <div className="bg-slate-50/50 rounded-2xl p-4 mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Keterangan</p>
                          <p className="text-xs text-slate-600 italic">"{req.reason}"</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-2">{req.startDate} s/d {req.endDate}</p>
                       </div>

                       {req.status === 'pending' && (
                         <div className="flex gap-2">
                            <button 
                               onClick={() => processLeave(req, 'approved')}
                               className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                               <Check size={14} /> Setujui
                            </button>
                            <button 
                               onClick={() => processLeave(req, 'rejected')}
                               className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                               <X size={14} /> Tolak
                            </button>
                         </div>
                       )}
                    </div>
                  ))
                )}
             </div>
          )}

          {activeTab === 'users' && canSeeAll && (
            <div className="space-y-4">
               {users.map((u) => (
                 <div key={`user-att-row-${u.uid}`} className="bg-white/60 p-5 rounded-[32px] border border-white/50 soft-shadow flex items-center gap-4">
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
                    <div key={`history-log-${log.uid}-${log.date}`} className="bg-white/40 p-4 rounded-3xl border border-white/50 flex items-center justify-between">
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

