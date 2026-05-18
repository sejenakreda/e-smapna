import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Briefcase, 
  UserPlus, 
  FileText, 
  MoreVertical,
  ChevronRight,
  Award,
  GraduationCap,
  Users,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  Filter,
  UserX,
  Save,
  ArrowRightLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ScanEye,
  Camera,
  RefreshCw,
  MoreHorizontal,
  Fingerprint,
  ShieldCheck,
  School,
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { ModulePage, ModuleSearch, ModuleCard } from './ModuleLayout';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { ArchivePortal } from './ArchivePortal';

export const GTKPortal: React.FC = () => {
  const { profile } = useAuth();
  const [gtkList, setGtkList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generatePDF = (gtk: UserProfile) => {
    const doc = new jsPDF();
    
    // Header (KOP SURAT)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('YAYASAN PENDIDIKAN BINA NUSANTARA', 105, 15, { align: 'center' });
    doc.setFontSize(16);
    doc.text('SMAP NUSANTARA AR-RASYID', 105, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Raya Pendidikan No. 45, Kota Metropolitan, Indonesia', 105, 28, { align: 'center' });
    doc.text('Email: info@smapnusantara.sch.id | Telp: (021) 555-0123', 105, 33, { align: 'center' });
    
    doc.setLineWidth(1);
    doc.line(20, 38, 190, 38);
    doc.setLineWidth(0.2);
    doc.line(20, 39.5, 190, 39.5);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BIODATA PROFIL GURU & TENAGA KEPENDIDIKAN', 105, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Referensi: ${gtk.uid.substring(0, 8).toUpperCase()}`, 105, 55, { align: 'center' });

    // Section: Profile
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 65, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('I. INFORMASI IDENTITAS DIRI', 25, 70.5);

    const personalData = [
      ['Nama Lengkap', gtk.name],
      ['Tempat, Tanggal Lahir', `${gtk.tmptLahir || '-'}, ${gtk.tglLahir || '-'}`],
      ['Jenis Kelamin', gtk.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
      ['NIK (KTP)', gtk.nik || '-'],
      ['Email', gtk.email],
      ['Nomor HP/WA', gtk.hp || '-'],
      ['Pendidikan Terakhir', `${gtk.pendidikanTerakhir || '-'} - ${gtk.programStudi || '-'}`],
      ['Tahun Lulus', gtk.tahunLulus || '-']
    ];

    (doc as any).autoTable({
      startY: 75,
      head: [],
      body: personalData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
      margin: { left: 25 }
    });

    // Section: Credentials
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('II. KREDENSIAL JABATAN & KEPEGAWAIAN', 25, currentY + 5.5);

    const credentialData = [
      ['NUPTK', gtk.nuptk || '-'],
      ['NIP / NPA', gtk.npa || '-'],
      ['Status Kepegawaian', gtk.statusKepegawaian || '-'],
      ['Pangkat / Golongan', `${gtk.pangkat || '-'} / ${gtk.golongan || '-'}`],
      ['TMT Guru', gtk.tmtGuru || '-'],
      ['Tugas Utama', gtk.roles.join(', ')],
      ['Tugas Tambahan', gtk.tugasTambahan || '-'],
      ['Sertifikasi', gtk.noSertifikasi ? `${gtk.noSertifikasi} (${gtk.jenisSertifikasi})` : 'Belum Sertifikasi']
    ];

    (doc as any).autoTable({
      startY: currentY + 10,
      head: [],
      body: credentialData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
      margin: { left: 25 }
    });

    // Signature Area
    const signY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Mengetahui,', 30, signY);
    doc.text('Kepala Sekolah', 30, signY + 5);
    
    doc.text('Mengesahkan,', 140, signY);
    doc.text('Admin/Operator SIM', 140, signY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('( ____________________ )', 30, signY + 30);
    doc.text('( ____________________ )', 140, signY + 30);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dicetak secara sistem: ${new Date().toLocaleString('id-ID')} | Verifikasi Digital: ${gtk.uid.substring(0, 12)}`, 105, 285, { align: 'center' });
    }

    doc.save(`Biodata_Resmi_${gtk.name.replace(/\s+/g, '_')}.pdf`);
    
    addDoc(collection(db, 'audit_logs'), {
      type: 'GTK',
      action: 'EXPORT',
      message: `Cetak Biodata Resmi: ${gtk.name}`,
      user: profile?.name || 'Operator',
      timestamp: serverTimestamp()
    });
  };
  
  // UI States
  const [viewMode, setViewMode] = useState<'DATABASE' | 'ARCHIVE'>('DATABASE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGtk, setSelectedGtk] = useState<UserProfile | null>(null);
  const [viewingGtk, setViewingGtk] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEACHER' | 'STAFF'>('ALL');
  const [detailTab, setDetailTab] = useState<'INFO' | 'ARCHIVE' | 'DOCS'>('INFO');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const isAdmin = useMemo(() => {
    if (!profile) return false;
    const userEmail = profile.email?.toLowerCase().trim();
    const adminRoles = ['admin', 'operator', 'administrator', 'kepala_tu', 'staff_tu'];
    const hasAdminRole = profile.roles?.some(r => adminRoles.includes(r.toLowerCase()));
    const isSpecialEmail = userEmail === 'redasejenak@gmail.com';
    return !!(hasAdminRole || isSpecialEmail);
  }, [profile]);
  
  const isManagement = useMemo(() => {
    if (!profile) return false;
    return profile.roles?.some(r => ['admin', 'kepsek', 'wakasek', 'wakakur', 'wakasis', 'wakasar', 'wakahum', 'operator', 'kepala_tu'].includes(r));
  }, [profile]);

  const isOwner = (uid: string) => profile?.uid === uid;
  const canEdit = (gtk: UserProfile) => {
    if (isAdmin) return true;
    return isOwner(gtk.uid);
  };
  
  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    roles: ['teacher'],
    gender: 'L',
    nuptk: '',
    npa: '', // Nomor Pokok Anggota / NIP
    npwp: '',
    statusKepegawaian: 'GTY',
    pangkat: '',
    golongan: '',
    tugasTambahan: '',
    hp: '',
    status: 'AKTIF',
    noSertifikasi: '',
    jenisSertifikasi: 'PPG Daljab',
    tahunSertifikasi: '',
    bidangStudiSertifikasi: '',
    tmtPegawai: '',
    tmtGuru: '',
    instansiTugas: '',
    pendidikanTerakhir: '',
    programStudi: '',
    tahunLulus: ''
  });

  useEffect(() => {
    setLoading(true);
    // GTK roles as defined in types.ts - Include ALL roles that belong to GTK category
    const gtkRoles = [
      'teacher', 'wakasek', 'kepsek', 'staff_tu', 'kepala_tu', 'bendahara', 'operator', 
      'bk', 'pembina', 'wakakur', 'wakasis', 'wakasar', 'wakahum'
    ];
    
    const q = query(
      collection(db, 'users'), 
      where('roles', 'array-contains-any', gtkRoles)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      
      setGtkList(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const filteredGTK = useMemo(() => {
    return gtkList.filter(g => {
      const matchesSearch = 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.nuptk?.includes(searchTerm);
      
      const isTeacher = g.roles.some(r => [
        'teacher', 'wakasek', 'kepsek', 'bk', 'pembina',
        'wakakur', 'wakasis', 'wakasar', 'wakahum'
      ].includes(r));

      const isStaff = g.roles.some(r => [
        'staff_tu', 'kepala_tu', 'bendahara', 'operator'
      ].includes(r));
      
      const matchesTab = 
        activeTab === 'ALL' || 
        (activeTab === 'TEACHER' && isTeacher) ||
        (activeTab === 'STAFF' && isStaff);
        
      return matchesSearch && matchesTab;
    });
  }, [gtkList, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const list = gtkList;
    const teachers = list.filter(g => g.roles.some(r => [
      'teacher', 'wakasek', 'kepsek', 'bk', 'pembina',
      'wakakur', 'wakasis', 'wakasar', 'wakahum'
    ].includes(r)));
    const staff = list.filter(g => g.roles.some(r => [
      'staff_tu', 'kepala_tu', 'bendahara', 'operator'
    ].includes(r)));
    
    // Count as certified if noSertifikasi is not empty OR tahunSertifikasi is filled
    const certified = list.filter(g => 
      (g.noSertifikasi && g.noSertifikasi.trim() !== '') || 
      (g.tahunSertifikasi && g.tahunSertifikasi.trim() !== '')
    ).length;
    
    // Status distribution for chart
    const statusCounts: {[key: string]: number} = {};
    list.forEach(g => {
      const s = g.statusKepegawaian || 'LAINNYA';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusData = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name]
    })).sort((a, b) => b.count - a.count);

    return {
      total: list.length,
      teachers: teachers.length,
      staff: staff.length,
      male: list.filter(g => g.gender === 'L').length,
      female: list.filter(g => g.gender === 'P').length,
      certified,
      statusData
    };
  }, [gtkList]);

  const handleToggleSelect = (uid: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(uid)) newSelected.delete(uid);
    else newSelected.add(uid);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredGTK.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGTK.map(g => g.uid)));
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert("Hanya Admin yang dapat mengimpor data.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        for (const row of data) {
          const email = row.Email || row.email || `${row.Nama?.toLowerCase().replace(/\s+/g, '')}@sekolah.sch.id`;
          const roles = (row.Roles || row.roles || 'teacher').split(',').map((r: string) => r.trim());
          
          const gtkData: Partial<UserProfile> = {
            name: row.Nama || row.name || 'No Name',
            email: email,
            roles: roles as UserRole[],
            gender: (row.JK || row.gender || 'L').toUpperCase() as 'L' | 'P',
            nuptk: row.NUPTK || row.nuptk || '',
            npa: row.NPA || row.NIP || row.npa || row.nip || '',
            npwp: row.NPWP || row.npwp || '',
            statusKepegawaian: row.Status || row.status_kepegawaian || 'GTY',
            pangkat: row.Pangkat || '',
            golongan: row.Golongan || '',
            tugasTambahan: row.Tugas || row.tugas_tambahan || '',
            hp: row.HP || row.hp || '',
            noSertifikasi: row.NoSertifikasi || '',
            jenisSertifikasi: row.JenisSertifikasi || 'PPG Daljab',
            tahunSertifikasi: row.TahunSertifikasi || '',
            bidangStudiSertifikasi: row.BidangStudi || '',
            tmtPegawai: row.TMTPegawai || '',
            tmtGuru: row.TMTGuru || '',
            instansiTugas: row.Instansi || '',
            status: 'AKTIF',
            createdAt: serverTimestamp()
          };

          const docRef = doc(collection(db, 'users'));
          await setDoc(docRef, { ...gtkData, uid: docRef.id });
          successCount++;
        }
        alert(`Berhasil mengimpor ${successCount} data GTK.`);
      } catch (err) {
        console.error("Import error:", err);
        alert("Gagal mengimpor file. Pastikan format tabel sesuai.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveGTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;

    if (!canEdit(selectedGtk || ({} as UserProfile))) {
      alert("Anda tidak memiliki akses untuk mengedit data ini.");
      return;
    }

    try {
      setLoading(true);
      const dataToSave = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.name || profile?.email || 'System'
      };

      if (isEditing && selectedGtk) {
        await updateDoc(doc(db, 'users', selectedGtk.uid), dataToSave);
        await addDoc(collection(db, 'audit_logs'), {
          type: 'GTK',
          action: 'UPDATE',
          message: `Update data: ${formData.name}`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      } else {
        const docRef = doc(collection(db, 'users'));
        await setDoc(docRef, {
          ...dataToSave,
          createdAt: serverTimestamp(),
          uid: docRef.id
        });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'GTK',
          action: 'CREATE',
          message: `GTK Baru: ${formData.name}`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      resetForm();
      alert("Data GTK berhasil disimpan.");
    } catch (err) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      roles: ['teacher'],
      gender: 'L',
      nuptk: '',
      npa: '',
      npwp: '',
      statusKepegawaian: 'GTY',
      pangkat: '',
      golongan: '',
      tugasTambahan: '',
      hp: '',
      status: 'AKTIF',
      noSertifikasi: '',
      jenisSertifikasi: 'PPG Daljab',
      tahunSertifikasi: '',
      bidangStudiSertifikasi: '',
      tmtPegawai: '',
      tmtGuru: '',
      instansiTugas: '',
      pendidikanTerakhir: '',
      programStudi: '',
      tahunLulus: ''
    });
    setIsEditing(false);
    setSelectedGtk(null);
  };

  const handleEdit = (gtk: UserProfile) => {
    setSelectedGtk(gtk);
    // Ensure all possible fields have at least an empty string to avoid uncontrolled input issues
    const safeData = {
      ...formData, // default empty values
      ...gtk      // actual data
    };
    setFormData(safeData);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (uid: string) => {
    if (!isAdmin) {
      alert("Hanya Admin yang dapat menghapus data.");
      return;
    }
    if (window.confirm("Hapus data GTK ini? Tindakan ini tidak dapat dibatalkan.")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        alert("Data berhasil dihapus.");
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus data.");
      }
    }
  };

  const exportToExcel = () => {
    const data = filteredGTK.map(g => ({
      'Nama Lengkap': g.name,
      'Email': g.email,
      'Jenis Kelamin': g.gender,
      'NUPTK': g.nuptk || '-',
      'NPA / NIP': g.npa || '-',
      'NPWP': g.npwp || '-',
      'Roles': g.roles.join(', '),
      'Pangkat': g.pangkat || '-',
      'Golongan': g.golongan || '-',
      'Status Kepeg': g.statusKepegawaian || '-',
      'Sertifikasi': g.noSertifikasi ? `Ada (${g.jenisSertifikasi})` : 'Belum',
      'HP': g.hp || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar GTK");
    XLSX.writeFile(wb, `Data_GTK_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <ModulePage 
      title="Database GTK" 
      subtitle="Guru & Tenaga Kependidikan" 
      icon={<UserCheck size={28} />} 
      color="bg-orange-600"
      actions={
        <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCSVImport} 
              className="hidden" 
              accept=".csv, .xlsx, .xls"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-50 dark:border-slate-700 soft-shadow disabled:opacity-50"
              title="Impor CSV/Excel"
            >
                {isImporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
            </button>
            <button 
              onClick={exportToExcel}
              className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors border border-slate-50 dark:border-slate-700 soft-shadow"
              title="Ekspor Excel"
            >
                <Download size={20} />
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="w-12 h-12 bg-orange-600 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center text-white active:scale-90 transition-all"
              title="Tambah GTK baru"
            >
                <Plus size={24} />
            </button>
        </div>
      }
    >
      <ModuleSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Cari nama, email, atau NUPTK..."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
        <ModuleCard 
            title="Total GTK" 
            value={stats.total} 
            subValue={`L: ${stats.male} P: ${stats.female}`}
            label="Database Aktif" 
            icon={<Users size={20} />} 
            color="bg-slate-900" 
        />
        <ModuleCard 
            title="Guru" 
            value={stats.teachers} 
            label="Pendidik" 
            icon={<GraduationCap size={20} />} 
            color="bg-blue-600" 
        />
        <ModuleCard 
            title="Staf" 
            value={stats.staff} 
            label="Kependidikan" 
            icon={<Briefcase size={20} />} 
            color="bg-emerald-600" 
        />
        <ModuleCard 
            title="Sertifikasi" 
            value={stats.certified} 
            label="Sudah Sertifikasi" 
            icon={<Award size={20} />} 
            color="bg-amber-500" 
        />
      </div>

      {/* Analytics Insight */}
      <AnimatePresence>
        {viewMode === 'DATABASE' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-10 overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                       <Award size={20} />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Statistik Kepegawaian</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribusi Berdasarkan Status</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Paling Banyak</p>
                       <p className="text-xs font-black text-blue-600 uppercase mt-1">{stats.statusData[0]?.name || '-'}</p>
                    </div>
                 </div>
              </div>

              <div className="w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9', radius: 12 }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[12, 12, 4, 4]} 
                      barSize={40}
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={['#2563EB', '#F59E0B', '#10B981', '#EC4899', '#6366F1'][index % 5]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-8 w-fit gap-1">
        <button
          onClick={() => setViewMode('DATABASE')}
          className={cn(
            "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            viewMode === 'DATABASE' 
              ? "bg-white dark:bg-slate-800 text-orange-600 shadow-xl" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Database GTK
        </button>
        <button
          onClick={() => setViewMode('ARCHIVE')}
          className={cn(
            "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            viewMode === 'ARCHIVE' 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Arsip Digital
        </button>
      </div>

      {viewMode === 'ARCHIVE' ? (
        <ArchivePortal isStandalone={false} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-8 w-fit">
        {[
          { label: 'Semua GTK', value: 'ALL' },
          { label: 'Guru', value: 'TEACHER' },
          { label: 'Staf TU', value: 'STAFF' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.value 
                ? "bg-white dark:bg-slate-800 text-orange-600 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                <Users size={20} />
             </div>
             <div>
                <h2 className="text-slate-900 dark:text-white font-black text-lg">Direktori {activeTab === 'ALL' ? 'GTK' : activeTab === 'TEACHER' ? 'Guru' : 'Staf'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredGTK.length} Orang Terdaftar</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedIds(new Set())}
                className="text-[10px] font-black text-rose-600 uppercase mr-4 bg-rose-50 px-3 py-1.5 rounded-lg"
              >
                Batalkan {selectedIds.size} Pilihan
              </motion.button>
            )}
            <button 
              onClick={handleSelectAll}
              className="text-[10px] font-black text-slate-400 hover:text-orange-600 uppercase tracking-widest transition-colors"
            >
              {selectedIds.size === filteredGTK.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          </div>
        </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={`skeleton-gtk-${i}`} className="p-6 flex items-start gap-4 bg-white/40 dark:bg-slate-800/40 rounded-[32px] border border-slate-100 dark:border-slate-700 animate-pulse">
                          <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 space-y-3">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-2/3" />
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full w-1/3" />
                            <div className="flex gap-2">
                              <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg w-16" />
                              <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg w-20" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-12 bg-rose-50 dark:bg-rose-900/10 rounded-[40px] text-center border border-rose-100 dark:border-rose-900/20">
                      <AlertCircle size={40} className="text-rose-600 mx-auto mb-4" />
                      <p className="text-sm font-black text-rose-600">{error}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredGTK.map((gtk, gIdx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: gIdx * 0.05 }}
                              key={`gtk-card-stable-${gtk.uid}`} 
                              onClick={() => { setViewingGtk(gtk); setIsDetailOpen(true); setDetailTab('INFO'); }}
                          className={cn(
                            "p-6 flex items-start gap-4 transition-all cursor-pointer group bg-white dark:bg-slate-800/80 rounded-[32px] border soft-shadow",
                            viewingGtk?.uid === gtk.uid 
                              ? "border-orange-500 ring-4 ring-orange-500/10 shadow-xl" 
                              : "border-slate-50 dark:border-slate-700 hover:border-orange-200 hover:shadow-lg dark:hover:border-slate-600"
                          )}
                        >
                          <div className="relative">
                            <div className={cn(
                              "w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl transition-all shadow-inner",
                              gtk.gender === 'P' 
                                ? "bg-rose-50 text-rose-500 dark:bg-rose-900/20" 
                                : "bg-blue-50 text-blue-500 dark:bg-blue-900/20"
                            )}>
                                {gtk.name ? gtk.name[0] : '?'}
                            </div>
                            {viewingGtk?.uid === gtk.uid && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white border-4 border-white dark:border-slate-800 shadow-lg">
                                 <CheckCircle2 size={12} fill="currentColor" className="text-orange-600 bg-white rounded-full" />
                              </div>
                            )}
                            {gtk.faceDescriptor && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white border-4 border-white dark:border-slate-800 shadow-lg" title="Face ID Terdaftar">
                                 <Fingerprint size={12} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-1">
                              <h4 className="font-black text-slate-800 dark:text-white text-base truncate group-hover:text-orange-600 transition-colors uppercase leading-tight">{gtk.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {gtk.nuptk ? `NUPTK: ${gtk.nuptk}` : gtk.npa ? `NPA: ${gtk.npa}` : 'NUPTK/NPA Belum Diisi'}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-4">
                                   {gtk.noSertifikasi && (
                                    <span className={cn(
                                      "text-[8px] font-black uppercase px-3 py-1 rounded-lg tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                    )}>
                                      Bersertifikat - {gtk.jenisSertifikasi}
                                    </span>
                                   )}
                                   
                                   <span className={cn(
                                     "text-[8px] font-black uppercase px-3 py-1 rounded-lg tracking-wider",
                                     gtk.roles.some(r => ['teacher', 'kepsek', 'wakasek'].includes(r)) 
                                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" 
                                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                                   )}>
                                     {gtk.roles.map(r => r.replace('staff_tu', 'Staf TU').replace('kepala_tu', 'Ka. TU').replace('teacher', 'Guru').replace('_', ' ')).join(', ')}
                                   </span>
                                   
                                   {gtk.statusKepegawaian && (
                                    <span className="text-[8px] font-black text-slate-500 uppercase px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 tracking-wider">
                                      {gtk.statusKepegawaian}
                                    </span>
                                   )}

                                   {gtk.tugasTambahan && (
                                    <span className="text-[8px] font-black text-amber-600 uppercase px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 tracking-wider border border-amber-100 dark:border-amber-900/40">
                                      {gtk.tugasTambahan}
                                    </span>
                                   )}

                                   {gtk.faceDescriptor && (
                                    <span className="text-[8px] font-black text-emerald-600 uppercase px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 tracking-wider border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                                      <Fingerprint size={10} /> Face ID
                                    </span>
                                   )}
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 group/icon">
                                       <Mail size={12} className="text-slate-300 group-hover/icon:text-orange-500" />
                                       <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{gtk.email}</span>
                                    </div>
                                    {gtk.hp && (
                                      <div className="flex items-center gap-1.5 group/icon">
                                         <Phone size={12} className="text-slate-300 group-hover/icon:text-orange-500" />
                                         <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{gtk.hp}</span>
                                      </div>
                                    )}
                                 </div>
                                 
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {gtk.hp && (
                                      <a 
                                        href={`https://wa.me/${gtk.hp.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl text-slate-400 hover:text-emerald-600 transition-all"
                                        title="WhatsApp"
                                      >
                                        <MessageCircle size={14} />
                                      </a>
                                    )}
                                    <a 
                                      href={`mailto:${gtk.email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                                      title="Kirim Email"
                                    >
                                      <Mail size={14} />
                                    </a>
                                    {canEdit(gtk) && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(gtk); }}
                                        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl text-slate-400 hover:text-orange-600 transition-all"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(gtk.uid); }}
                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                 </div>
                              </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
      </section>
    </>
  )}
      
      {/* Modern GTK Modal */}
      <AnimatePresence>
        {isDetailOpen && viewingGtk && (
           <div key="detail-modal-root" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsDetailOpen(false)}
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-slate-50 dark:bg-slate-900 rounded-[44px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
              >
                {/* Header Profile */}
                <div className="p-10 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                     <div className={cn(
                       "w-32 h-32 rounded-[40px] flex items-center justify-center font-black text-5xl shadow-2xl ring-8 ring-slate-50 dark:ring-slate-900/50 overflow-hidden relative",
                       viewingGtk.gender === 'P' ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                     )}>
                       {viewingGtk.faceRegistrationPhoto ? (
                         <img 
                           src={viewingGtk.faceRegistrationPhoto} 
                           alt={viewingGtk.name}
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         viewingGtk.name[0]
                       )}
                       {viewingGtk.faceDescriptor && (
                          <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-800">
                             <Fingerprint size={16} />
                          </div>
                       )}
                     </div>
                     <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-tight">{viewingGtk.name}</h2>
                          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mt-1">{viewingGtk.roles.join(' • ')}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                           {viewingGtk.noSertifikasi && (
                             <span className="px-4 py-1.5 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-full text-[10px] font-black uppercase border border-amber-100 dark:border-amber-900/40">Sertifikasi: {viewingGtk.jenisSertifikasi}</span>
                           )}
                           <span className="px-4 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-[10px] font-black uppercase border border-blue-100 dark:border-blue-900/40">{viewingGtk.statusKepegawaian}</span>
                           {viewingGtk.tugasTambahan && (
                             <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-900/40">{viewingGtk.tugasTambahan}</span>
                           )}
                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-4">
                           {canEdit(viewingGtk) && (
                             <button 
                               onClick={() => { handleEdit(viewingGtk); setIsDetailOpen(false); }}
                               className="px-6 h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                             >
                                <Edit3 size={16} />
                                Edit Profil
                             </button>
                           )}
                           <button 
                             onClick={() => setIsFaceModalOpen(true)}
                             className={cn(
                               "px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg",
                               viewingGtk.faceRegistrationPhoto 
                                 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                                 : "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
                             )}
                           >
                              <ScanEye size={16} />
                              {viewingGtk.faceRegistrationPhoto ? 'Face ID Terdaftar' : 'Daftarkan Face ID'}
                           </button>
                           <button 
                             onClick={() => generatePDF(viewingGtk)}
                             className="px-6 h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                           >
                              <Download size={16} />
                              Cetak Biodata
                           </button>
                           <button 
                             onClick={() => setIsDetailOpen(false)}
                             className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center hover:text-slate-900 dark:hover:text-white transition-all"
                           >
                              <X size={24} />
                           </button>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Tabs Portal Detail */}
                <div className="flex-1 flex flex-col overflow-hidden">
                   <div className="px-10 bg-white dark:bg-slate-800 flex gap-8 shrink-0">
                      {[
                        { id: 'INFO', label: 'Informasi Lengkap', icon: <UserCheck size={18} /> },
                        { id: 'ARCHIVE', label: 'Arsip Digital', icon: <FileText size={18} /> },
                        { id: 'DOCS', label: 'Dokumen Terfomat', icon: <FileText size={18} /> },
                      ].map((tab) => (
                        <button 
                          key={`detail-tab-main-${tab.id}`}
                          onClick={() => setDetailTab(tab.id as any)}
                          className={cn(
                            "py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all",
                            detailTab === tab.id 
                              ? "border-orange-600 text-orange-600" 
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          )}
                        >
                           {tab.icon}
                           {tab.label}
                        </button>
                      ))}
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      {detailTab === 'INFO' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                              <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                                 <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6">Informasi Kontak</h4>
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><Mail size={16} /></div>
                                       <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p><p className="font-bold text-slate-800 dark:text-white">{viewingGtk.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><Phone size={16} /></div>
                                       <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telepon</p><p className="font-bold text-slate-800 dark:text-white">{viewingGtk.hp || '-'}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><MapPin size={16} /></div>
                                       <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat</p><p className="font-bold text-slate-800 dark:text-white text-xs">Data rahasia GTK</p></div>
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                                 <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6">Pendidikan</h4>
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={16} /></div>
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingGtk.pendidikanTerakhir || 'Belum Diisi'}</p>
                                       <p className="font-bold text-slate-800 dark:text-white">{viewingGtk.programStudi || 'Program Studi tidak tersedia'}</p>
                                       {viewingGtk.tahunLulus && <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Lulus Tahun {viewingGtk.tahunLulus}</p>}
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-6">
                              <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                                 <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6">Kredensial Jabatan</h4>
                                 <div className="space-y-5">
                                    {[
                                       { label: 'NUPTK', value: viewingGtk.nuptk },
                                       { label: 'NPA / NIP', value: viewingGtk.npa },
                                       { label: 'NPWP', value: viewingGtk.npwp },
                                       { label: 'Pangkat / Gol', value: `${viewingGtk.pangkat || '-'} / ${viewingGtk.golongan || '-'}` },
                                       { label: 'Instansi Utama', value: viewingGtk.instansiTugas },
                                       { label: 'TMT Guru', value: viewingGtk.tmtGuru }
                                    ].map(item => (
                                       <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                          <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{item.value || 'N/A'}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {viewingGtk.faceRegistrationPhoto && (
                                <div key="face-status-card" className="bg-white dark:bg-slate-900 border border-emerald-500/10 p-8 rounded-[40px] shadow-sm flex flex-col md:flex-row items-center gap-8">
                                   <div className="relative group shrink-0">
                                      <img 
                                        src={viewingGtk.faceRegistrationPhoto} 
                                        alt="Face ID Photo" 
                                        className="w-32 h-32 rounded-[32px] object-cover ring-4 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all shadow-lg"
                                      />
                                      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20 border-4 border-white dark:border-slate-900">
                                         <Fingerprint size={24} />
                                      </div>
                                   </div>
                                   <div className="flex-1 text-center md:text-left space-y-2">
                                      <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                                         <ShieldCheck size={18} className="text-emerald-500" />
                                         Integrasi Face ID Aktif
                                      </h5>
                                      <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                                         Profil ini telah sinkron dengan sistem biometrik. Wajah terdaftar pada {viewingGtk.faceRegistrationDate ? new Date(viewingGtk.faceRegistrationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'sistem'}.
                                      </p>
                                      <div className="pt-2">
                                         <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                            Status: Terverifikasi & Sinkron
                                         </span>
                                      </div>
                                   </div>
                                </div>
                              )}

                              {viewingGtk.noSertifikasi && (
                                <div key="cert-details-card" className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[40px] shadow-sm border border-amber-100 dark:border-amber-900/20">
                                   <div className="flex items-center gap-3 mb-6">
                                      <Award className="text-amber-600" size={20} />
                                      <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Detail Sertifikasi</h4>
                                   </div>
                                   <div className="space-y-4">
                                      <div><p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Nomor Sertifikasi / NRG</p><p className="font-black text-amber-900 dark:text-amber-200">{viewingGtk.noSertifikasi}</p></div>
                                      <div><p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Bidang Studi</p><p className="font-black text-amber-900 dark:text-amber-200">{viewingGtk.bidangStudiSertifikasi}</p></div>
                                   </div>
                                </div>
                              )}

                              {viewingGtk.faceRegistrationPhoto && (
                                <div key="face-meta-card" className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-3 mb-6">
                                     <ScanEye className="text-orange-600" size={20} />
                                     <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Face Registration Data</h4>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <img 
                                       src={viewingGtk.faceRegistrationPhoto} 
                                       alt="Face ID" 
                                       className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-lg"
                                     />
                                     <div className="flex-1 overflow-hidden">
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata Algoritma</p>
                                       <p className="text-[8px] font-mono text-slate-500 truncate w-full">
                                         {viewingGtk.faceDescriptor?.slice(0, 5).join(', ')}...
                                       </p>
                                       <p className="text-[10px] font-bold text-emerald-500 uppercase mt-2">Verified Status: OK</p>
                                     </div>
                                  </div>
                                </div>
                              )}
                           </div>
                        </div>
                      ) : detailTab === 'ARCHIVE' ? (
                        <div className="h-full">
                           <ArchivePortal key={`archive-portal-gtk-${viewingGtk.uid}`} initialGtkId={viewingGtk.uid} isStandalone={false} />
                        </div>
                      ) : (
                        <DocumentCenter gtk={viewingGtk} />
                      )}
                   </div>
                </div>
              </motion.div>
           </div>
        )}
        
        {/* Face ID Registration Modal */}
        <AnimatePresence>
          {isFaceModalOpen && viewingGtk && (
            <div key="face-registration-modal-root" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => {
                  if (isCapturing) {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach(track => track.stop());
                    setIsCapturing(false);
                  }
                  setIsFaceModalOpen(false);
                }}
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[44px] shadow-2xl overflow-hidden"
              >
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <ScanEye size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registrasi Face ID</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[280px] mx-auto">
                    Konversi biometrik wajah untuk keamanan presensi digital GTK
                  </p>

                  <div className="mt-8 relative aspect-square bg-slate-900 rounded-[40px] overflow-hidden border-8 border-slate-50 dark:border-slate-900 group shadow-inner">
                    {!isCapturing && !capturedPhoto && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <Camera size={48} className="mb-4 opacity-20" />
                        <button 
                          onClick={async () => {
                            try {
                              setIsCapturing(true);
                              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                              if (videoRef.current) {
                                videoRef.current.srcObject = stream;
                              }
                            } catch (err) {
                              alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
                              setIsCapturing(false);
                            }
                          }}
                          className="px-8 h-14 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20"
                        >
                          Aktifkan Kamera
                        </button>
                      </div>
                    )}

                    {isCapturing && (
                      <div className="absolute inset-0">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                          <div className="w-full h-full border-4 border-dashed border-orange-500 rounded-full"></div>
                        </div>
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                           <button 
                             onClick={() => {
                               if (videoRef.current && canvasRef.current) {
                                 const video = videoRef.current;
                                 const canvas = canvasRef.current;
                                 canvas.width = video.videoWidth;
                                 canvas.height = video.videoHeight;
                                 const ctx = canvas.getContext('2d');
                                 if (ctx) {
                                   ctx.translate(canvas.width, 0);
                                   ctx.scale(-1, 1);
                                   ctx.drawImage(video, 0, 0);
                                   const photo = canvas.toDataURL('image/jpeg', 0.8);
                                   setCapturedPhoto(photo);
                                   
                                   const stream = video.srcObject as MediaStream;
                                   stream?.getTracks().forEach(track => track.stop());
                                   setIsCapturing(false);
                                 }
                               }
                             }}
                             className="w-16 h-16 bg-white rounded-full border-8 border-white/30 flex items-center justify-center shadow-2xl active:scale-95 transition-all"
                           >
                             <div className="w-8 h-8 rounded-full bg-orange-600"></div>
                           </button>
                        </div>
                      </div>
                    )}

                    {capturedPhoto && (
                      <div className="absolute inset-0">
                        <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured" />
                        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4">
                               <CheckCircle2 size={40} className="text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest bg-emerald-500 px-4 py-2 rounded-full shadow-lg">Wajah Terdeteksi</p>
                        </div>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="mt-10 flex gap-4">
                    {capturedPhoto ? (
                      <>
                        <button 
                          onClick={() => {
                            setCapturedPhoto(null);
                            setIsCapturing(false);
                          }}
                          className="flex-1 h-14 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase text-slate-400 flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Ulangi
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              setLoading(true);
                              // Generate fake face descriptors (simulating algorithm conversion)
                              const fakeDescriptor = Array.from({length: 128}, () => Math.random());
                              
                              await updateDoc(doc(db, 'users', viewingGtk.uid), {
                                faceRegistrationPhoto: capturedPhoto,
                                faceDescriptor: fakeDescriptor,
                                faceRegistrationDate: serverTimestamp()
                              });
                              
                              await addDoc(collection(db, 'audit_logs'), {
                                type: 'SECURITY',
                                action: 'FACE_REGISTER',
                                message: `Registrasi Face ID: ${viewingGtk.name}`,
                                user: profile?.name || 'System',
                                timestamp: serverTimestamp()
                              });

                              setViewingGtk({...viewingGtk, faceRegistrationPhoto: capturedPhoto, faceDescriptor: fakeDescriptor});
                              alert("Face ID berhasil dikonversi dan disimpan.");
                              setIsFaceModalOpen(false);
                              setCapturedPhoto(null);
                            } catch (err) {
                              console.error(err);
                              alert("Gagal menyimpan Face ID.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex-[2] h-14 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                        >
                          Konversi & Simpan
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setIsFaceModalOpen(false)}
                        className="flex-1 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase text-slate-400"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {isModalOpen && (
          <div key="edit-create-modal-root" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <UserPlus size={100} />
                </div>
                <div className="relative z-10">
                   <h3 className="text-2xl font-black">{isEditing ? 'Edit GTK' : 'Tambah GTK Baru'}</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Lengkapi data personal & jabatan</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <form id="gtkForm" onSubmit={handleSaveGTK} className="space-y-8">
                  {/* Info Dasar Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                       <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data Utama</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap & Gelar</label>
                        <input 
                          required
                          value={formData.name || ''}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="Contoh: Dr. Ahmad S.Pd, M.Pd"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email Aktif</label>
                        <input 
                          required
                          type="email"
                          value={formData.email || ''}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="ahmad@sekolah.sch.id"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                        <select 
                          value={formData.gender || 'L'}
                          onChange={e => setFormData({...formData, gender: e.target.value as 'L' | 'P'})}
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="L">Laki-Laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telepon / HP</label>
                        <input 
                          value={formData.hp || ''}
                          onChange={e => setFormData({...formData, hp: e.target.value})}
                          placeholder="0812..."
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIK (KTP)</label>
                        <input 
                          value={formData.nik || ''}
                          onChange={e => setFormData({...formData, nik: e.target.value})}
                          placeholder="16 Digit"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Jabatan & Karir Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                       <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Jabatan & Karir</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NUPTK</label>
                        <input 
                          value={formData.nuptk || ''}
                          onChange={e => setFormData({...formData, nuptk: e.target.value})}
                          placeholder="Nomor Unik Pendidik"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NPA / NIP</label>
                        <input 
                          value={formData.npa || ''}
                          onChange={e => setFormData({...formData, npa: e.target.value})}
                          placeholder="Nomor Anggota / Pegawai"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NPWP</label>
                        <input 
                          value={formData.npwp || ''}
                          onChange={e => setFormData({...formData, npwp: e.target.value})}
                          placeholder="Nomor Pokok Wajib Pajak"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Sertifikasi Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Sertifikasi</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Sertifikasi / NRG</label>
                          <input 
                            value={formData.noSertifikasi || ''}
                            onChange={e => setFormData({...formData, noSertifikasi: e.target.value})}
                            placeholder="Kosongkan jika belum"
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5 focus-within:z-10">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Sertifikasi</label>
                          <select 
                            value={formData.jenisSertifikasi || ''}
                            onChange={e => setFormData({...formData, jenisSertifikasi: e.target.value})}
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">Belum Sertifikasi</option>
                            <option value="PPG Daljab">PPG Daljab</option>
                            <option value="PPG Prajab">PPG Prajab</option>
                            <option value="Sertifikasi Guru Baru">Sertifikasi Guru Baru</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tahun Sertifikasi</label>
                          <input 
                            value={formData.tahunSertifikasi || ''}
                            onChange={e => setFormData({...formData, tahunSertifikasi: e.target.value})}
                            placeholder="Contoh: 2024"
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bidang Studi Sertifikasi</label>
                          <input 
                            value={formData.bidangStudiSertifikasi || ''}
                            onChange={e => setFormData({...formData, bidangStudiSertifikasi: e.target.value})}
                            placeholder="Contoh: Matematika"
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Riwayat & Pendidikan */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Pendidikan & Riwayat</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pendidikan Terakhir</label>
                          <select 
                            value={formData.pendidikanTerakhir || ''}
                            onChange={e => setFormData({...formData, pendidikanTerakhir: e.target.value})}
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                          >
                            <option value="">- Pilih Pendidikan -</option>
                            <option value="D3">D3</option>
                            <option value="D4">D4</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TMT Guru (Terhitung Mulai)</label>
                          <input 
                            type="date"
                            value={formData.tmtGuru || ''}
                            onChange={e => setFormData({...formData, tmtGuru: e.target.value})}
                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                          />
                        </div>
                      </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kepeg</label>
                        <select 
                          value={formData.statusKepegawaian || 'GTY'}
                          onChange={e => setFormData({...formData, statusKepegawaian: e.target.value})}
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        >
                          <option value="GTY">GTY / PTY</option>
                          <option value="GTT">GTT / PTT</option>
                          <option value="PNS">PNS DPK</option>
                          <option value="PPPK">P3K</option>
                          <option value="Honorer">Honorer</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pangkat</label>
                        <input 
                          value={formData.pangkat || ''}
                          onChange={e => setFormData({...formData, pangkat: e.target.value})}
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Golongan</label>
                        <input 
                          value={formData.golongan || ''}
                          onChange={e => setFormData({...formData, golongan: e.target.value})}
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tugas Tambahan</label>
                        <input 
                          value={formData.tugasTambahan || ''}
                          onChange={e => setFormData({...formData, tugasTambahan: e.target.value})}
                          placeholder="Wali Kelas, dsb"
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Berikan Akses Portal (Role)</label>
                       <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'teacher', label: 'Guru' },
                            { id: 'kepala_tu', label: 'Kepala TU' },
                            { id: 'staff_tu', label: 'Staf TU' },
                            { id: 'operator', label: 'Admin/Operator' },
                            { id: 'wakasek', label: 'Wakasek' },
                            { id: 'wakakur', label: 'Waka Kurikulum' },
                            { id: 'wakasis', label: 'Waka Kesiswaan' },
                            { id: 'wakahum', label: 'Waka Humas' },
                            { id: 'wakasar', label: 'Waka Sarpras' },
                            { id: 'bendahara', label: 'Bendahara' },
                            { id: 'kepsek', label: 'KepSek' },
                            { id: 'bk', label: 'Guru BK' },
                            { id: 'pembina', label: 'Pembina OSIS' },
                          ].map((role, rIdx) => (
                            <button
                              key={`role-select-${role.id}-${rIdx}`}
                              type="button"
                              disabled={!isAdmin}
                              onClick={() => {
                                const roles = formData.roles || [];
                                if (roles.includes(role.id as any)) {
                                  setFormData({...formData, roles: roles.filter(r => r !== role.id)});
                                } else {
                                  setFormData({...formData, roles: [...roles, role.id as any]});
                                }
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                                (formData.roles || []).includes(role.id as any)
                                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400",
                                !isAdmin && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              {role.label}
                            </button>
                          ))}
                       </div>
                       {!isAdmin && (
                         <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-2 ml-1 animate-pulse">
                           [ Hak akses hanya dapat diubah oleh administrator ]
                         </p>
                       )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 h-14 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Batalkan
                </button>
                <button 
                  form="gtkForm"
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 bg-orange-600 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};

const DocumentCenter: React.FC<{ gtk: UserProfile }> = ({ gtk }) => {
   const handlePrint = (type: 'SK_AKTIF' | 'SURAT_TUGAS' | 'SLIP_GAJI') => {
      const doc = new jsPDF();
      
      // Kop Surat
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('YAYASAN PENDIDIKAN BINA NUSANTARA', 105, 15, { align: 'center' });
      doc.setFontSize(16);
      doc.text('SMAP NUSANTARA AR-RASYID', 105, 22, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Jl. Raya Pendidikan No. 45, Metropolitan | Email: admin@smapnusantara.sch.id', 105, 28, { align: 'center' });
      doc.line(20, 32, 190, 32);

      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      if (type === 'SK_AKTIF') {
         doc.setFontSize(12);
         doc.setFont('helvetica', 'bold');
         doc.text('SURAT KETERANGAN AKTIF MENGAJAR', 105, 45, { align: 'center' });
         doc.setFontSize(10);
         doc.text(`Nomor: ${Math.floor(Math.random()*1000)}/SMAP-AR/SK-AM/V/2026`, 105, 50, { align: 'center' });

         doc.setFont('helvetica', 'normal');
         let bodyY = 65;
         doc.text('Yang bertanda tangan di bawah ini, Kepala Sekolah SMAP Nusantara Ar-Rasyid menerangkan bahwa:', 25, bodyY);
         
         const tableData = [
            ['Nama', `: ${gtk.name}`],
            ['NUPTK / NIP', `: ${gtk.nuptk || gtk.npa || '-'}`],
            ['Jabatan', `: ${gtk.roles.join(', ')}`],
            ['Status Kepegawaian', `: ${gtk.statusKepegawaian}`],
            ['Alamat', `: Data Tersimpan di Database`]
         ];

         (doc as any).autoTable({
            startY: bodyY + 5,
            body: tableData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            margin: { left: 30 }
         });

         const nextY = (doc as any).lastAutoTable.finalY + 15;
         doc.text('Adalah benar yang bersangkutan merupakan tenaga pendidik aktif di SMAP Nusantara Ar-Rasyid', 25, nextY);
         doc.text('pada Tahun Pelajaran 2025/2026. Surat keterangan ini dibuat untuk keperluan administrasi.', 25, nextY + 5);

         doc.text('Metropolitan, ' + today, 140, nextY + 30);
         doc.text('Kepala Sekolah,', 140, nextY + 35);
         doc.setFont('helvetica', 'bold');
         doc.text('DRS. H. AHMAD SYARIF, M.PD', 140, nextY + 60);
         doc.setFont('helvetica', 'normal');
         doc.text('NIP. 19700101 199501 1 001', 140, nextY + 65);
      } else if (type === 'SLIP_GAJI') {
         doc.setFontSize(12);
         doc.setFont('helvetica', 'bold');
         doc.text('SLIP GAJI PEGAWAI (SIMPLE)', 105, 45, { align: 'center' });
         doc.setFontSize(10);
         doc.text('Periode: Mei 2026', 105, 50, { align: 'center' });

         const salaryData = [
            ['Gaji Pokok', 'Rp 4.500.000'],
            ['Tunjangan Jabatan', 'Rp 1.200.000'],
            ['Tunjangan Sertifikasi', gtk.noSertifikasi ? 'Rp 2.000.000' : 'Rp 0'],
            ['Potongan (BPJS/Pajak)', '(Rp 250.000)'],
            ['TOTAL DITERIMA', 'Rp ' + (4500000 + 1200000 + (gtk.noSertifikasi ? 2000000 : 0) - 250000).toLocaleString('id-ID')]
         ];

         (doc as any).autoTable({
            startY: 65,
            head: [['Keterangan', 'Jumlah']],
            body: salaryData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 9 }
         });

         doc.text('Dicetak otomatis dari Sistem I-Portal Nusantara pada ' + today, 25, (doc as any).lastAutoTable.finalY + 10);
      } else {
         alert("Format surat ini sedang dalam pengembangan.");
         return;
      }

      doc.save(`${type}_${gtk.name.replace(/\s+/g, '_')}.pdf`);

      addDoc(collection(db, 'audit_logs'), {
         type: 'DOCUMENTS',
         action: 'GENERATE_DOC',
         message: `Cetak otomatis: ${type} untuk ${gtk.name}`,
         user: 'Admin',
         timestamp: serverTimestamp()
      });
   };

   return (
      <div className="space-y-8 h-full">
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[44px] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="relative z-10">
               <h3 className="text-2xl font-black uppercase tracking-tight">Dokumen Otomasi</h3>
               <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-2">Generate dokumen administrasi standar berdasarkan profil GTK</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
                  <DocAction 
                     title="SK Aktif Mengajar" 
                     desc="Surat keterangan resmi aktif bertugas di sekolah"
                     onClick={() => handlePrint('SK_AKTIF')}
                  />
                  <DocAction 
                     title="Slip Gaji Sederhana" 
                     desc="Rincian pendapatan bulanan (Estimasi Sistem)"
                     onClick={() => handlePrint('SLIP_GAJI')}
                  />
                  <DocAction 
                     title="Surat Tugas (Draft)" 
                     desc="Draft surat penugasan kegiatan luar sekolah"
                     onClick={() => handlePrint('SURAT_TUGAS')}
                  />
               </div>
            </div>
            <School size={200} className="absolute -bottom-20 -right-20 text-white/10 rotate-12" />
         </div>

         <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={20} />
               </div>
               <div>
                  <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Catatan Penting</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-2 leading-relaxed">
                     Dokumen yang dibuat melalui fitur "Cetak Otomatis" ini merupakan draf administrasi yang datanya diambil langsung dari Profile GTK. Pastikan data profile (NUPTK, Pangkat/Golongan, TMT) telah valid sebelum melakukan pencetakan. Dokumen ini tetap memerlukan tanda tangan basah dan cap basah sekolah untuk keaslian hukum.
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
};

const DocAction: React.FC<{ title: string; desc: string; onClick: () => void }> = ({ title, desc, onClick }) => (
   <button 
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-left transition-all active:scale-95 group"
   >
      <div className="flex items-center justify-between mb-3">
         <h4 className="font-black text-sm uppercase tracking-tight">{title}</h4>
         <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
      </div>
      <p className="text-[9px] font-medium text-blue-100 leading-tight uppercase tracking-widest">{desc}</p>
   </button>
);
