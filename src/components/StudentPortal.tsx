import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserPlus, 
  FileSpreadsheet, 
  MoreVertical,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Loader2,
  AlertCircle,
  ArrowRightLeft,
  GraduationCap,
  FileText,
  Trash2,
  Edit3,
  X,
  Wrench,
  Type,
  PieChart as PieIcon,
  BarChart3,
  CalendarDays,
  History
} from 'lucide-react';
import { ModulePage, ModuleSearch, ModuleCard } from './ModuleLayout';
import { useConfig } from '../context/ConfigContext';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProfileItem: React.FC<{ 
  label: string; 
  value?: string; 
  isEditing?: boolean; 
  onChange?: (val: string) => void;
  type?: string;
}> = ({ label, value, isEditing, onChange, type = "text" }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-50 dark:border-slate-700 shadow-sm group hover:border-cyan-200 transition-colors">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-cyan-500 transition-colors">{label}</p>
    {isEditing ? (
      <input 
        type={type}
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
      />
    ) : (
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{value && value !== '-' ? value : '-'}</p>
    )}
  </div>
);

const ProfileMiniItem: React.FC<{ 
  label: string; 
  value?: string;
  isEditing?: boolean;
  onChange?: (val: string) => void;
}> = ({ label, value, isEditing, onChange }) => (
  <div className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/50 min-h-[40px]">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">{label}</span>
    {isEditing ? (
      <input 
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        className="text-[10px] font-bold text-slate-700 dark:text-slate-200 text-right bg-transparent border-b border-cyan-500/30 outline-none w-1/2"
      />
    ) : (
      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 text-right">{value && value !== '-' && !value.includes('undefined') ? value : '-'}</span>
    )}
  </div>
);

export const StudentPortal: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('AKTIF');
  
  const TABS = [
    { id: 'AKTIF', label: 'SISWA AKTIF' },
    { id: 'Lulus', label: 'SISWA LULUS' },
    { id: 'Mutasi Keluar', label: 'MUTASI KELUAR' },
    { id: 'Mutasi Pindah', label: 'MUTASI PINDAH' },
    { id: 'Mengundurkan Diri', label: 'MENGUNDURKAN DIRI' },
    { id: 'Putus Sekolah', label: 'PUTUS SEKOLAH' },
  ];
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Advanced Filter State
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>('SEMUA');
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');
  const [showStats, setShowStats] = useState(false);
  
  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMutationOpen, setIsMutationOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [mutationType, setMutationType] = useState('Mutasi Keluar');
  const [mutationReason, setMutationReason] = useState('');
  const [mutationDate, setMutationDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSchool, setTargetSchool] = useState('');
  
  // Mutasi History State
  const [mutations, setMutations] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});

  const handleStartEdit = () => {
    if (!selectedStudent) return;
    setEditData({ ...selectedStudent });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.uid || (selectedStudent as any).id;
    if (!studentId) {
      window.alert("ID Siswa tidak ditemukan.");
      return;
    }
    
    setIsImporting(true);
    try {
      const updatePayload: any = {
        ...editData,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.name || profile?.email || 'System'
      };
      
      await updateDoc(doc(db, 'users', studentId), updatePayload);
      setSelectedStudent({ ...selectedStudent, ...editData, updatedBy: updatePayload.updatedBy } as UserProfile);
      setIsEditing(false);
      window.alert("Data berhasil diperbarui.");
    } catch (err: any) {
      console.error(err);
      window.alert("Gagal memperbarui data: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCetakRapor = () => {
    if (!selectedStudent) return;
    
    const doc = new jsPDF();
    const s = selectedStudent;
    
    // Header
    doc.setFontSize(18);
    doc.text("RAPOR SEMENTARA / BIODATA SISWA", 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text("SMAS PGRI NARINGGUL", 105, 22, { align: 'center' });
    doc.line(20, 25, 190, 25);

    // Basic Info
    doc.setFontSize(12);
    doc.text("IDENTITAS PESERTA DIDIK", 20, 35);
    
    const basicData = [
      ["Nama Lengkap", s.name.toUpperCase()],
      ["NISN", s.nisn || "-"],
      ["NIPD", s.nipd || "-"],
      ["Tempat, Tgl Lahir", `${s.pob || "-"}, ${s.dob || "-"}`],
      ["Jenis Kelamin", s.gender === "L" ? "Laki-laki" : "Perempuan"],
      ["Agama", s.agama || "-"],
      ["Kelas / Rombel", s.classId || "-"],
      ["Status", s.status || "AKTIF"],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Kategori', 'Keterangan']],
      body: basicData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Family Info
    const familyStartY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("DATA KELUARGA", 20, familyStartY);
    
    const familyData = [
      ["Nama Ayah Kandung", s.fatherName || "-"],
      ["Pekerjaan Ayah", s.fatherJob || "-"],
      ["Nama Ibu Kandung", s.motherName || "-"],
      ["Pekerjaan Ibu", s.motherJob || "-"],
      ["Nama Wali", s.guardianName || "-"],
    ];

    autoTable(doc, {
      startY: familyStartY + 5,
      body: familyData,
      theme: 'plain',
      styles: { fontSize: 10 }
    });

    // Address
    const addressStartY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("ALAMAT DOMISILI", 20, addressStartY);
    doc.setFontSize(10);
    doc.text(s.address || "Data alamat tidak tersedia.", 20, addressStartY + 7);

    // Footer
    const footerY = 270;
    doc.line(20, footerY - 5, 190, footerY - 5);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 20, footerY);
    doc.text("Halaman 1 / 1", 190, footerY, { align: 'right' });

    doc.save(`Rapor_Sementara_${s.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteStudent = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const studentId = selectedStudent?.uid || (selectedStudent as any)?.id;
    
    if (!selectedStudent || !studentId) {
      window.alert("ID Siswa tidak ditemukan atau tidak terpilih.");
      return;
    }

    if (deleteConfirmId !== studentId) {
      setDeleteConfirmId(studentId);
      // Reset after 4 seconds
      setTimeout(() => setDeleteConfirmId(prev => prev === studentId ? null : prev), 4000);
      return;
    }
    
    setIsImporting(true);
    setImportProgress(10);

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: studentId })
      });
      
      setImportProgress(50);
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || resData.message || "Gagal menghapus dari server.");
      }
      
      setIsProfileOpen(false);
      setSelectedStudent(null);
      setDeleteConfirmId(null);
      setImportProgress(100);
      
      setTimeout(() => {
        window.alert("Siswa berhasil dihapus.");
      }, 100);
    } catch (err: any) {
      console.error("Delete error:", err);
      window.alert("Gagal menghapus: " + (err.message || "Kesalahan tidak diketahui"));
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'users'), 
      where('roles', 'array-contains', 'student')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      
      setStudents(studentList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Gagal memuat data siswa. Pastikan Anda memiliki hak akses.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return students
      .filter(s => {
        const nameMatch = s.name.toLowerCase().includes(search) || 
                         (s.nisn && s.nisn.toString().toLowerCase().includes(search));
        
        const studentClass = (s.classId || '-').toUpperCase();
        const classMatch = selectedClass === 'SEMUA' || studentClass === selectedClass;
        
        const studentAngkatan = s.angkatan || '-';
        const angkatanMatch = selectedAngkatan === 'SEMUA' || studentAngkatan === selectedAngkatan;

        const studentStatus = (s.status || 'AKTIF').toUpperCase();
        const statusMatch = studentStatus === activeTab.toUpperCase();

        return nameMatch && classMatch && angkatanMatch && statusMatch;
      })
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
  }, [students, searchTerm, selectedClass, selectedAngkatan, sortOrder, activeTab]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.classId) set.add(s.classId.toUpperCase());
    });
    return Array.from(set).sort();
  }, [students]);

  const uniqueAngkatanList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.angkatan) set.add(s.angkatan);
    });
    return Array.from(set).sort().reverse();
  }, [students]);

  const genderData = useMemo(() => {
    const l = students.filter(s => s.gender === 'L').length;
    const p = students.filter(s => s.gender === 'P').length;
    return [
      { name: 'Laki-laki', value: l },
      { name: 'Perempuan', value: p }
    ];
  }, [students]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => {
      const st = s.status || 'AKTIF';
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [students]);

  const statsDetail = useMemo(() => {
    const categories = ['AKTIF', 'LULUS', 'MUTASI KELUAR', 'MUTASI PINDAH', 'MENGUNDURKAN DIRI', 'PUTUS SEKOLAH'];
    const result: Record<string, { total: number; sub: string }> = {};
    
    categories.forEach(cat => {
      const list = students.filter(s => (s.status || 'AKTIF').toUpperCase() === cat.toUpperCase());
      result[cat] = {
        total: list.length,
        sub: `L: ${list.filter(s => s.gender === 'L').length} P: ${list.filter(s => s.gender === 'P').length}`
      };
    });

    const totalActiveList = students.filter(s => (s.status || 'AKTIF').toUpperCase() === 'AKTIF');
    const totalSub = `L: ${totalActiveList.filter(s => s.gender === 'L').length} P: ${totalActiveList.filter(s => s.gender === 'P').length}`;

    return { ...result, TOTAL: { total: totalActiveList.length, sub: totalSub } };
  }, [students]);

  const handleApplyMutation = async () => {
    if (!selectedStudent && selectedIds.size === 0) return;
    
    setIsImporting(true);
    let successCount = 0;
    try {
      const studentIds = selectedStudent ? [selectedStudent.uid] : Array.from(selectedIds);
      
      for (const studentId of studentIds) {
        const student = students.find(s => s.uid === studentId);
        if (!student) continue;

        const studentRef = doc(db, 'users', studentId!);
        
        await updateDoc(studentRef, {
          status: mutationType,
          targetSchool: mutationType === 'Mutasi Pindah' ? targetSchool : null,
          updatedAt: serverTimestamp(),
          updatedBy: profile?.name || profile?.email || 'System'
        });

        // Log mutation
        await addDoc(collection(db, 'system_logs'), {
          type: 'mutation',
          studentId,
          studentName: student.name,
          mutationType,
          reason: mutationReason,
          targetSchool: mutationType === 'Mutasi Pindah' ? targetSchool : null,
          mutationDate,
          timestamp: serverTimestamp(),
          performedBy: profile?.name || profile?.email || 'System'
        });
        successCount++;
      }

      setIsMutationOpen(false);
      setSelectedStudent(null);
      setSelectedIds(new Set());
      setMutationReason('');
      setTargetSchool('');
      alert(`${successCount} Siswa berhasil dimutasi.`);
    } catch (err) {
      console.error("Mutation failed:", err);
      window.alert("Gagal melakukan mutasi.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetStatus = async (studentId: string) => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        status: 'AKTIF',
        updatedAt: serverTimestamp()
      });
      window.alert("Status siswa dikembalikan ke AKTIF.");
    } catch (err) {
      console.error(err);
      window.alert("Gagal merubah status.");
    }
  };

  const handleBulkDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedIds.size === 0) {
      window.alert("Tidak ada siswa yang dipilih.");
      return;
    }
    
    // Use a unique ID for bulk delete confirmation
    const bulkId = 'BULK_DELETE_ACTION';
    if (deleteConfirmId !== bulkId) {
      setDeleteConfirmId(bulkId);
      setTimeout(() => setDeleteConfirmId(prev => prev === bulkId ? null : prev), 4000);
      return;
    }
    
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = "";

    try {
      const ids = Array.from(selectedIds);
      
      for (const id of ids) {
        try {
          const res = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: id })
          });
          
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json();
            failCount++;
            lastError = data.error;
          }
        } catch (e: any) {
          failCount++;
          lastError = e.message;
        }
        setImportProgress(Math.round(((successCount + failCount) / ids.length) * 100));
      }
      
      setSelectedIds(new Set());
      setDeleteConfirmId(null);
      
      let finalMsg = `${successCount} data berhasil dihapus.`;
      if (failCount > 0) {
        finalMsg += `\n${failCount} data gagal dihapus.\nCatatan: ${lastError}`;
      }
      window.alert(finalMsg);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      window.alert("Terjadi kesalahan sistem saat menghapus massal.");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.uid!)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isCleaningOpen, setIsCleaningOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    nisn: '',
    nipd: '',
    gender: 'L',
    classId: '',
    address: '',
    pob: '',
    dob: '',
    motherName: '',
    nik: '',
    agama: 'Islam',
    rt: '',
    rw: '',
    dusun: '',
    kelurahan: '',
    kecamatan: 'Naringgul',
    kodePos: '43274',
    noKK: '',
    angkatan: new Date().getFullYear().toString()
  });

  const resetNewStudent = () => {
    setNewStudent({
      name: '', nisn: '', nipd: '', gender: 'L', classId: '', address: '',
      pob: '', dob: '', motherName: '', nik: '', agama: 'Islam',
      rt: '', rw: '', dusun: '', kelurahan: '', kecamatan: 'Naringgul',
      kodePos: '43274', noKK: ''
    });
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Siswa');

    const headersRow1 = [
      'No', 'Nama', 'NIPD', 'JK', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'NIK', 'Agama', 'Alamat', 
      'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kode Pos', 'Jenis Tinggal', 'Alat Transportasi', 
      'Telepon', 'HP', 'E-Mail', 'SKHUN', 'Penerima KPS', 'No. KPS', 
      'Data Ayah', '', '', '', '', '', 
      'Data Ibu', '', '', '', '', '', 
      'Data Wali', '', '', '', '', '',
      'Rombel Saat Ini', 'No Peserta Ujian Nasional', 'No Seri Ijazah', 'Penerima KIP', 'Nomor KIP', 
      'Nama di KIP', 'Nomor KKS', 'No Registrasi Akta Lahir', 'Bank', 'Nomor Rekening Bank', 
      'Rekening Atas Nama', 'Layak PIP (usulan dari sekolah)', 'Alasan Layak PIP', 'Kebutuhan Khusus', 
      'Sekolah Asal', 'Anak ke-berapa', 'Lintang', 'Bujur', 'No KK', 'Berat Badan', 'Tinggi Badan', 
      'Lingkar Kepala', 'Jml. Saudara Kandung', 'Jarak Rumah ke Sekolah (KM)'
    ];

    const headersRow2 = new Array(headersRow1.length).fill('');
    // Sub-headers for Data Ayah (Index 24-29: Y to AD)
    headersRow2[24] = 'Nama';
    headersRow2[25] = 'Tahun Lahir';
    headersRow2[26] = 'Jenjang Pendidikan';
    headersRow2[27] = 'Pekerjaan';
    headersRow2[28] = 'Penghasilan';
    headersRow2[29] = 'NIK';

    // Sub-headers for Data Ibu (Index 30-35: AE to AJ)
    headersRow2[30] = 'Nama';
    headersRow2[31] = 'Tahun Lahir';
    headersRow2[32] = 'Jenjang Pendidikan';
    headersRow2[33] = 'Pekerjaan';
    headersRow2[34] = 'Penghasilan';
    headersRow2[35] = 'NIK';

    // Sub-headers for Data Wali (Index 36-41: AK to AP)
    headersRow2[36] = 'Nama';
    headersRow2[37] = 'Tahun Lahir';
    headersRow2[38] = 'Jenjang Pendidikan';
    headersRow2[39] = 'Pekerjaan';
    headersRow2[40] = 'Penghasilan';
    headersRow2[41] = 'NIK';

    worksheet.addRow(headersRow1);
    worksheet.addRow(headersRow2);

    // Merge Cells for individual columns (Vertical Merge)
    const columnsToMerge = [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
      'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN'
    ];
    columnsToMerge.forEach(col => {
      worksheet.mergeCells(`${col}1:${col}2`);
    });

    // Horizontal Merges for Data Ayah, Ibu, Wali
    worksheet.mergeCells('Y1:AD1'); // Data Ayah
    worksheet.mergeCells('AE1:AJ1'); // Data Ibu
    worksheet.mergeCells('AK1:AP1'); // Data Wali

    // Apply Styles to Headers
    worksheet.getRow(1).height = 30;
    worksheet.getRow(2).height = 25;

    [1, 2].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: '000000' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'BFDBFE' } // Light Blue
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit column widths (basic approximation)
    worksheet.columns.forEach(column => {
      column.width = 18;
    });
    worksheet.getColumn('A').width = 5;
    worksheet.getColumn('B').width = 25;

    // Add Sample Row
    const sampleRow = new Array(headersRow1.length).fill('');
    sampleRow[0] = 1;
    sampleRow[1] = 'Asep Saepuloh';
    sampleRow[2] = '2024001';
    sampleRow[3] = 'L';
    sampleRow[4] = '0123456789';
    sampleRow[5] = 'Cianjur';
    sampleRow[6] = '2008-01-01';
    sampleRow[7] = '3201010101010001';
    sampleRow[42] = 'X-MIPA-1'; // Rombel (AQ)
    
    worksheet.addRow(sampleRow);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'template_import_siswa_dapodik.xlsx');
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.nisn) return;
    
    setIsImporting(true);
    setImportProgress(0);
    try {
      const email = `${newStudent.nisn}@e-smapna.sch.id`;
      
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          displayName: newStudent.name,
          password: 'smapna123'
        })
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal membuat akun.");
      const { uid } = resData;
      
      setImportProgress(50);
      
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name: newStudent.name,
        roles: ['student'],
        nisn: newStudent.nisn,
        nik: newStudent.nik,
        nipd: newStudent.nipd,
        gender: newStudent.gender,
        classId: newStudent.classId,
        angkatan: newStudent.angkatan,
        address: newStudent.address,
        pob: newStudent.pob,
        dob: newStudent.dob,
        motherName: newStudent.motherName,
        agama: newStudent.agama,
        rt: newStudent.rt,
        rw: newStudent.rw,
        dusun: newStudent.dusun,
        kelurahan: newStudent.kelurahan,
        kecamatan: newStudent.kecamatan,
        kodePos: newStudent.kodePos,
        noKK: newStudent.noKK,
        status: 'AKTIF',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile?.name || profile?.email || 'System'
      });
      
      setImportProgress(100);
      setIsAddModalOpen(false);
      resetNewStudent();
      setTimeout(() => window.alert("Siswa berhasil ditambahkan!"), 100);
    } catch (err: any) {
      console.error(err);
      window.alert(`Gagal menambahkan siswa: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          const studentData = aoa.slice(2).map(row => {
          if (!row || row.length < 5) return null;
          
          const toProper = (str: any) => {
            if (!str || str.toString().trim() === '-') return '-';
            const val = str.toString().trim();
            if (!val) return '-';
            return val.toLowerCase().split(/\s+/).filter(Boolean).map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          };

          const name = toProper(row[1]); 
          const nipd = row[2]?.toString().trim() || '-';
          const jk = row[3]?.toString().trim().toUpperCase(); 
          const nisn = row[4]?.toString().trim(); 
          const pob = toProper(row[5]); 
          const dob = row[6]?.toString().trim() || '-'; 
          const nik = row[7]?.toString().trim() || '-'; 
          const agama = row[8]?.toString().trim() || 'Islam';
          const address = toProper(row[9]); 
          const rt = row[10]?.toString().trim() || '-';
          const rw = row[11]?.toString().trim() || '-';
          const dusun = toProper(row[12]);
          const kelurahan = toProper(row[13]);
          const kecamatan = row[14]?.toString().trim() || 'Naringgul';
          const kodePos = row[15]?.toString().trim() || '-';
          const jenisTinggal = toProper(row[16]);
          const alatTransportasi = toProper(row[17]);
          const telepon = row[18]?.toString().trim() || '-';
          const hp = row[19]?.toString().trim() || '-';
          const emailInput = row[20]?.toString().trim() || '';
          const skhun = row[21]?.toString().trim() || '-';
          const penerimaKPS = row[22]?.toString().trim() || '-';
          const noKPS = row[23]?.toString().trim() || '-';
          
          // Data Ayah (24-29)
          const fatherName = toProper(row[24]);
          const fatherBirthYear = row[25]?.toString().trim() || '-';
          const fatherEducation = row[26]?.toString().trim() || '-';
          const fatherJob = row[27]?.toString().trim() || '-';
          const fatherIncome = row[28]?.toString().trim() || '-';
          const fatherNIK = row[29]?.toString().trim() || '-';

          // Data Ibu (30-35)
          const motherName = toProper(row[30]);
          const motherBirthYear = row[31]?.toString().trim() || '-';
          const motherEducation = row[32]?.toString().trim() || '-';
          const motherJob = row[33]?.toString().trim() || '-';
          const motherIncome = row[34]?.toString().trim() || '-';
          const motherNIK = row[35]?.toString().trim() || '-';

          // Data Wali (36-41)
          const guardianName = toProper(row[36]);
          const guardianBirthYear = row[37]?.toString().trim() || '-';
          const guardianEducation = row[38]?.toString().trim() || '-';
          const guardianJob = row[39]?.toString().trim() || '-';
          const guardianIncome = row[40]?.toString().trim() || '-';
          const guardianNIK = row[41]?.toString().trim() || '-';

          const classId = row[42]?.toString().trim().toUpperCase() || '-'; 
          const noPesertaUN = row[43]?.toString().trim() || '-';
          const noSeriIjazah = row[44]?.toString().trim() || '-';
          const penerimaKIP = row[45]?.toString().trim() || '-';
          const noKIP = row[46]?.toString().trim() || '-';
          const namaKIP = row[47]?.toString().trim() || '-';
          const noKKS = row[48]?.toString().trim() || '-';
          const noRegAktaLahir = row[49]?.toString().trim() || '-';
          const bank = row[50]?.toString().trim() || '-';
          const noRekening = row[51]?.toString().trim() || '-';
          const rekeningAtasNama = row[52]?.toString().trim() || '-';
          const layakPIP = row[53]?.toString().trim() || '-';
          const alasanLayakPIP = row[54]?.toString().trim() || '-';
          const kebutuhanKhusus = row[55]?.toString().trim() || '-';
          const sekolahAsal = toProper(row[56]);
          const anakKe = row[57]?.toString().trim() || '-';
          const lintang = row[58]?.toString().trim() || '-';
          const bujur = row[59]?.toString().trim() || '-';
          const noKK = row[60]?.toString().trim() || '-';
          const beratBadan = row[61]?.toString().trim() || '-';
          const tinggiBadan = row[62]?.toString().trim() || '-';
          const lingkarKepala = row[63]?.toString().trim() || '-';
          const jmlSaudaraKandung = row[64]?.toString().trim() || '-';
          const jarakSekolah = row[65]?.toString().trim() || '-';

          if (!name || !nisn) return null;

          return {
            nisn,
            name,
            nik,
            nipd,
            gender: jk === 'L' || jk === 'LAKI-LAKI' ? 'L' : 'P',
            pob,
            dob,
            agama,
            address,
            rt,
            rw,
            dusun,
            kelurahan,
            kecamatan,
            kodePos,
            jenisTinggal,
            alatTransportasi,
            telepon,
            hp,
            skhun,
            penerimaKPS,
            noKPS,
            fatherName,
            fatherBirthYear,
            fatherEducation,
            fatherJob,
            fatherIncome,
            fatherNIK,
            motherName,
            motherBirthYear,
            motherEducation,
            motherJob,
            motherIncome,
            motherNIK,
            guardianName,
            guardianBirthYear,
            guardianEducation,
            guardianJob,
            guardianIncome,
            guardianNIK,
            classId,
            noPesertaUN,
            noSeriIjazah,
            penerimaKIP,
            noKIP,
            namaKIP,
            noKKS,
            noRegAktaLahir,
            bank,
            noRekening,
            rekeningAtasNama,
            layakPIP,
            alasanLayakPIP,
            kebutuhanKhusus,
            sekolahAsal,
            anakKe,
            lintang,
            bujur,
            noKK,
            beratBadan,
            tinggiBadan,
            lingkarKepala,
            jmlSaudaraKandung,
            jarakSekolah,
            email: emailInput || `${nisn}@e-smapna.sch.id`,
            roles: ['student']
          };
        }).filter(Boolean);

        if (studentData.length === 0) {
          throw new Error("Tidak ada data siswa yang valid ditemukan.");
        }

        let successCount = 0;
        let errorCount = 0;

        // Chunking for large imports (20 per batch)
        const chunkSize = 20; 
        for (let i = 0; i < studentData.length; i += chunkSize) {
          const chunk = studentData.slice(i, i + chunkSize);
          const progressValue = Math.round((i / studentData.length) * 100);
          setImportProgress(progressValue);
          
          const res = await fetch('/api/admin/sync-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: chunk })
          });
          
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Gagal sinkronisasi data ke server.");
          }

          const results = await res.json();
          
          for (const item of results) {
            if (item.status === 'error') {
              errorCount++;
              continue;
            }
            
            successCount++;
            const original = studentData.find(d => d && d.email === item.email);
            if (original && item.uid) {
              await setDoc(doc(db, 'users', item.uid), {
                ...original,
                updatedAt: serverTimestamp(),
                updatedBy: profile?.name || profile?.email || 'System'
              }, { merge: true });
            }
          }
        }

        setImportProgress(100);
        if (errorCount > 0) {
          window.alert(`Import selesai dengan beberapa catatan:\n- Berhasil: ${successCount}\n- Gagal: ${errorCount}\n\nSilakan cek konsol browser atau log server untuk detail kesalahan.`);
        } else {
          window.alert(`Berhasil mengimpor ${successCount} siswa!`);
        }
      } catch (err: any) {
        console.error(err);
        alert(`Gagal mengimpor data: ${err.message}`);
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const cleanupDuplicates = async () => {
    console.log("Searching for NISN duplicates...");
    setIsImporting(true);
    try {
      const q = query(collection(db, 'users'), where('roles', 'array-contains', 'student'));
      const snapshot = await getDocs(q);
      const allStudents = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];

      // Group by NISN
      const nisnGroups = new Map<string, UserProfile[]>();
      allStudents.forEach(s => {
        const nisnValue = s.nisn ? s.nisn.trim() : 'N/A';
        if (nisnValue === 'N/A' || nisnValue === '-' || nisnValue === '') return;
        
        const list = nisnGroups.get(nisnValue) || [];
        list.push(s);
        nisnGroups.set(nisnValue, list);
      });

      const dups: any[] = [];
      nisnGroups.forEach((list, nisn) => {
        if (list.length > 1) {
          dups.push({ nisn, students: list });
        }
      });

      if (dups.length === 0) {
        window.alert("Tidak ditemukan data duplikat berdasarkan NISN.");
      } else {
        setDuplicates(dups);
        setIsDuplicateModalOpen(true);
      }
    } catch (err: any) {
      console.error("Cleanup scan failed:", err);
      window.alert("Gagal memindai data: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const deleteDuplicateRecord = async (uid: string, nisn: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!uid) return;
    
    if (deleteConfirmId !== uid) {
      setDeleteConfirmId(uid);
      setTimeout(() => setDeleteConfirmId(prev => prev === uid ? null : prev), 4000);
      return;
    }
    
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || resData.message || "Gagal menghapus dari server.");
      }
      
      setDeleteConfirmId(null);
      // Update local state
      setDuplicates(prev => prev.map(group => {
        if (group.nisn === nisn) {
          return { ...group, students: group.students.filter((s: any) => s.uid !== uid) };
        }
        return group;
      }).filter(group => group.students.length > 1));
      
      window.alert("Data berhasil dihapus.");
    } catch (err: any) {
      console.error("Delete error:", err);
      window.alert("Gagal menghapus: " + (err.message || "Kesalahan server."));
    }
  };

  const toProperCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const toUpperCase = (str: string) => {
    if (!str) return '';
    return str.toUpperCase();
  };

  const bulkFormatting = async (type: 'proper' | 'upper') => {
    if (!window.confirm(`Ubah format teks SEMUA siswa menjadi ${type === 'proper' ? 'Proper Case' : 'UPPERCASE'}?`)) {
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const q = query(collection(db, 'users'), where('roles', 'array-contains', 'student'));
      const snapshot = await getDocs(q);
      const total = snapshot.docs.length;
      
      const toProper = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };

      const toUpper = (str: string) => str ? str.toUpperCase() : '';
      
      const docs = snapshot.docs;
      const batchSize = 10; // Batch size for parallel updates
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        const promises = batch.map(studentDoc => {
          const data = studentDoc.data();
          const update: any = { updatedAt: serverTimestamp() };
          
          if (type === 'proper') {
            update.name = toProper(data.name);
            if (data.pob) update.pob = toProper(data.pob);
            if (data.address) update.address = toProper(data.address);
          } else {
            update.name = toUpper(data.name);
            if (data.pob) update.pob = toUpper(data.pob);
            if (data.address) update.address = toUpper(data.address);
          }
          
          return updateDoc(doc(db, 'users', studentDoc.id), update);
        });
        
        await Promise.all(promises);
        setImportProgress(Math.round(((i + batch.length) / total) * 100));
      }
      
      window.alert(`Berhasil merapikan ${total} data siswa!`);
      setIsCleaningOpen(false);
    } catch (err) {
      console.error(err);
      window.alert("Gagal merapikan data.");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <ModulePage 
      title="Induk Siswa" 
      subtitle="Data Center Kesiswaan" 
      icon={<Users size={28} />} 
      color="bg-cyan-600"
      actions={
        <div className="flex gap-2">
            <button 
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border soft-shadow",
                showStats 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-400 hover:text-indigo-600"
              )}
              onClick={() => setShowStats(!showStats)}
              title="Statistik Visual Siswa"
            >
                <TrendingUp size={20} />
            </button>
            <button 
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border soft-shadow",
                isCleaningOpen 
                  ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/30" 
                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-400 hover:text-cyan-600"
              )}
              onClick={() => setIsCleaningOpen(!isCleaningOpen)}
              title="Rapikan Data (Proper Case / Upper Case)"
            >
                <Type size={20} />
            </button>
            <button 
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border soft-shadow",
                selectedIds.size > 0
                  ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/30" 
                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-400 hover:text-amber-600"
              )}
              onClick={() => {
                if (selectedIds.size > 0) {
                  setSelectedStudent(null); // Clear selected single student
                  setIsMutationOpen(true);
                }
              }}
              title={selectedIds.size > 0 ? `Mutasikan ${selectedIds.size} Siswa` : "Mutasi (Pilih siswa dulu)"}
            >
                <ArrowRightLeft size={20} />
            </button>
            <button 
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border soft-shadow",
                selectedIds.size > 0
                  ? deleteConfirmId === 'BULK_DELETE_ACTION' ? "bg-rose-700 border-rose-800 text-white animate-pulse shadow-xl" : "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30"
                  : isImporting && !isEditing
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-400 hover:text-rose-600"
              )}
              onClick={(e) => selectedIds.size > 0 ? handleBulkDelete(e) : cleanupDuplicates()}
              disabled={isImporting}
              title={selectedIds.size > 0 ? (deleteConfirmId === 'BULK_DELETE_ACTION' ? 'KONFIRMASI Hapus Massal' : `Hapus ${selectedIds.size} Terpilih`) : "Cari Duplikat (NISN)"}
            >
                {isImporting && !isEditing ? <Loader2 size={20} className="animate-spin" /> : deleteConfirmId === 'BULK_DELETE_ACTION' ? <AlertCircle size={20} /> : <Trash2 size={20} />}
            </button>
            <button 
              className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-50 dark:border-slate-700 hover:soft-shadow"
              onClick={downloadTemplate}
              title="Download Template Excel (.xlsx)"
            >
                <FileSpreadsheet size={20} />
            </button>
            <label className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-cyan-600 transition-colors border border-slate-50 dark:border-slate-700 cursor-pointer hover:soft-shadow">
                <Plus size={20} />
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
            </label>
            <button 
              className="w-12 h-12 bg-cyan-600 rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center text-white active:scale-95 transition-all font-black"
              onClick={() => setIsAddModalOpen(true)}
              title="Tambah Siswa Baru"
            >
                <UserPlus size={24} />
            </button>
        </div>
      }
    >
      {/* Visual Statistics Dashboard */}
      <AnimatePresence>
        {showStats && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <PieIcon size={14} className="text-cyan-500" />
                    Komposisi Jenis Kelamin
                  </h4>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : '#f43f5e'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={14} className="text-rose-500" />
                    Statistik Status Siswa
                  </h4>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsProfileOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-50 dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-6 right-6 z-20 flex gap-2">
                {!isEditing ? (
                  <>
                    <button 
                      onClick={handleStartEdit}
                      className="p-3 text-cyan-600 hover:bg-cyan-50 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                      title="Edit Data Siswa"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button 
                      onClick={handleCetakRapor}
                      className="p-3 text-blue-600 hover:bg-blue-50 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                      title="Cetak Rapor Sementara"
                    >
                      <FileText size={20} />
                    </button>
                    <button 
                      onClick={handleDeleteStudent}
                      className={cn(
                        "p-3 transition-all rounded-2xl border shadow-sm",
                        deleteConfirmId === (selectedStudent.uid || (selectedStudent as any).id)
                          ? "bg-rose-600 border-rose-700 text-white animate-pulse"
                          : "text-rose-600 hover:bg-rose-50 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                      )}
                      title={deleteConfirmId === (selectedStudent.uid || (selectedStudent as any).id) ? "Klik lagi untuk KONFIRMASI hapus" : "Hapus Siswa"}
                    >
                      {deleteConfirmId === (selectedStudent.uid || (selectedStudent as any).id) ? <AlertCircle size={20} /> : <Trash2 size={20} />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsMutationOpen(true);
                      }}
                      className="p-3 text-amber-600 hover:bg-amber-50 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                      title="Mutasi Siswa"
                    >
                      <ArrowRightLeft size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleSaveEdit}
                      disabled={isImporting}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                      title="Simpan Perubahan"
                    >
                      {isImporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-3 text-slate-400 hover:bg-slate-50 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                      title="Batal"
                    >
                      <X size={20} />
                    </button>
                  </>
                )}
                {!isEditing && (
                  <button 
                    onClick={() => setIsProfileOpen(false)}
                    className="p-3 text-slate-400 hover:text-slate-600 transition-colors bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Profile Header */}
              <div className="p-8 lg:p-12 bg-cyan-600 text-white shrink-0">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="w-32 h-32 rounded-[40px] bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black shadow-inner">
                    {selectedStudent.name[0]}
                  </div>
                  <div className="text-center lg:text-left flex-1">
                    {isEditing ? (
                      <input 
                        value={editData.name || ''} 
                        onChange={e => setEditData({...editData, name: e.target.value})}
                        className="text-3xl lg:text-4xl font-black tracking-tight bg-white/20 border-b-2 border-white/40 focus:border-white outline-none w-full max-w-xl"
                      />
                    ) : (
                      <h3 className="text-3xl lg:text-4xl font-black tracking-tight">{selectedStudent.name}</h3>
                    )}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-4">
                       <span className="px-4 py-1.5 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                         {selectedStudent.status || 'Aktif'}
                       </span>
                       <span className="px-4 py-1.5 bg-cyan-700/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                         NISN: {isEditing ? (
                           <input 
                            value={editData.nisn || ''} 
                            onChange={e => setEditData({...editData, nisn: e.target.value})}
                            className="bg-transparent border-b border-white outline-none w-24"
                           />
                         ) : selectedStudent.nisn}
                       </span>
                       <span className="px-4 py-1.5 bg-cyan-700/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                         KELAS: {isEditing ? (
                           <input 
                            value={editData.classId || ''} 
                            onChange={e => setEditData({...editData, classId: e.target.value.toUpperCase()})}
                            className="bg-transparent border-b border-white outline-none w-20"
                           />
                         ) : (selectedStudent.classId || 'BELUM ADA')}
                       </span>
                       <span className="px-4 py-1.5 bg-cyan-700/50 rounded-xl text-[10px] font-black uppercase tracking-widest">
                         {isEditing ? (
                           <select 
                            value={editData.gender || 'L'} 
                            onChange={e => setEditData({...editData, gender: e.target.value})}
                            className="bg-cyan-800 text-white border-none outline-none cursor-pointer"
                           >
                             <option value="L">LAKI-LAKI</option>
                             <option value="P">PEREMPUAN</option>
                           </select>
                         ) : (selectedStudent.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN')}
                       </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Content - Bento Grid */}
              <div className="p-8 lg:p-12 overflow-y-auto custom-scrollbar space-y-8 bg-white dark:bg-slate-800">
                
                {/* Section: Identitas Pokok */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <UserCheck size={18} className="text-cyan-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Identitas Dasar & Akademik</h4>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <ProfileItem label="NIPD" value={isEditing ? editData.nipd : selectedStudent.nipd} isEditing={isEditing} onChange={val => setEditData({...editData, nipd: val})} />
                    <ProfileItem label="NISN" value={isEditing ? editData.nisn : selectedStudent.nisn} isEditing={isEditing} onChange={val => setEditData({...editData, nisn: val})} />
                    <ProfileItem label="Angkatan" value={isEditing ? (editData as any).angkatan : (selectedStudent as any).angkatan} isEditing={isEditing} onChange={val => setEditData({...editData, angkatan: val})} />
                    <ProfileItem label="NIK" value={isEditing ? editData.nik : selectedStudent.nik} isEditing={isEditing} onChange={val => setEditData({...editData, nik: val})} />
                    <ProfileItem label="No KK" value={isEditing ? editData.noKK : selectedStudent.noKK} isEditing={isEditing} onChange={val => setEditData({...editData, noKK: val})} />
                    <ProfileItem label="Tempat Lahir" value={isEditing ? editData.pob : selectedStudent.pob} isEditing={isEditing} onChange={val => setEditData({...editData, pob: val})} />
                    <ProfileItem label="Tanggal Lahir" value={isEditing ? editData.dob : selectedStudent.dob} isEditing={isEditing} onChange={val => setEditData({...editData, dob: val})} type="date" />
                    <ProfileItem label="Agama" value={isEditing ? editData.agama : selectedStudent.agama} isEditing={isEditing} onChange={val => setEditData({...editData, agama: val})} />
                    <ProfileItem label="Akta Lahir" value={isEditing ? editData.noRegAktaLahir : selectedStudent.noRegAktaLahir} isEditing={isEditing} onChange={val => setEditData({...editData, noRegAktaLahir: val})} />
                    <ProfileItem label="Sekolah Asal" value={isEditing ? editData.sekolahAsal : selectedStudent.sekolahAsal} isEditing={isEditing} onChange={val => setEditData({...editData, sekolahAsal: val})} />
                    <ProfileItem label="No Peserta UN" value={isEditing ? editData.noPesertaUN : selectedStudent.noPesertaUN} isEditing={isEditing} onChange={val => setEditData({...editData, noPesertaUN: val})} />
                    <ProfileItem label="No Seri Ijazah" value={isEditing ? editData.noSeriIjazah : selectedStudent.noSeriIjazah} isEditing={isEditing} onChange={val => setEditData({...editData, noSeriIjazah: val})} />
                    <ProfileItem label="SKHUN" value={isEditing ? editData.skhun : selectedStudent.skhun} isEditing={isEditing} onChange={val => setEditData({...editData, skhun: val})} />
                  </div>
                </div>

                {/* Section: Data Orang Tua / Wali */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="flex items-center gap-2 px-2">
                    <Users size={18} className="text-rose-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Data Keluarga</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ayah */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700">
                      <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Ayah Kandung <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        <ProfileMiniItem label="Nama" value={isEditing ? editData.fatherName : selectedStudent.fatherName} isEditing={isEditing} onChange={val => setEditData({...editData, fatherName: val})} />
                        <ProfileMiniItem label="NIK" value={isEditing ? editData.fatherNIK : selectedStudent.fatherNIK} isEditing={isEditing} onChange={val => setEditData({...editData, fatherNIK: val})} />
                        <ProfileMiniItem label="Tahun Lahir" value={isEditing ? editData.fatherBirthYear : selectedStudent.fatherBirthYear} isEditing={isEditing} onChange={val => setEditData({...editData, fatherBirthYear: val})} />
                        <ProfileMiniItem label="Pendidikan" value={isEditing ? editData.fatherEducation : selectedStudent.fatherEducation} isEditing={isEditing} onChange={val => setEditData({...editData, fatherEducation: val})} />
                        <ProfileMiniItem label="Pekerjaan" value={isEditing ? editData.fatherJob : selectedStudent.fatherJob} isEditing={isEditing} onChange={val => setEditData({...editData, fatherJob: val})} />
                        <ProfileMiniItem label="Penghasilan" value={isEditing ? editData.fatherIncome : selectedStudent.fatherIncome} isEditing={isEditing} onChange={val => setEditData({...editData, fatherIncome: val})} />
                      </div>
                    </div>
                    {/* Ibu */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700">
                      <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Ibu Kandung <div className="w-2 h-2 rounded-full bg-rose-500" />
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        <ProfileMiniItem label="Nama" value={isEditing ? editData.motherName : selectedStudent.motherName} isEditing={isEditing} onChange={val => setEditData({...editData, motherName: val})} />
                        <ProfileMiniItem label="NIK" value={isEditing ? editData.motherNIK : selectedStudent.motherNIK} isEditing={isEditing} onChange={val => setEditData({...editData, motherNIK: val})} />
                        <ProfileMiniItem label="Tahun Lahir" value={isEditing ? editData.motherBirthYear : selectedStudent.motherBirthYear} isEditing={isEditing} onChange={val => setEditData({...editData, motherBirthYear: val})} />
                        <ProfileMiniItem label="Pendidikan" value={isEditing ? editData.motherEducation : selectedStudent.motherEducation} isEditing={isEditing} onChange={val => setEditData({...editData, motherEducation: val})} />
                        <ProfileMiniItem label="Pekerjaan" value={isEditing ? editData.motherJob : selectedStudent.motherJob} isEditing={isEditing} onChange={val => setEditData({...editData, motherJob: val})} />
                        <ProfileMiniItem label="Penghasilan" value={isEditing ? editData.motherIncome : selectedStudent.motherIncome} isEditing={isEditing} onChange={val => setEditData({...editData, motherIncome: val})} />
                      </div>
                    </div>
                    {/* Wali */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700">
                      <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Wali <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        <ProfileMiniItem label="Nama" value={isEditing ? editData.guardianName : selectedStudent.guardianName} isEditing={isEditing} onChange={val => setEditData({...editData, guardianName: val})} />
                        <ProfileMiniItem label="NIK" value={isEditing ? editData.guardianNIK : selectedStudent.guardianNIK} isEditing={isEditing} onChange={val => setEditData({...editData, guardianNIK: val})} />
                        <ProfileMiniItem label="Tahun Lahir" value={isEditing ? editData.guardianBirthYear : selectedStudent.guardianBirthYear} isEditing={isEditing} onChange={val => setEditData({...editData, guardianBirthYear: val})} />
                        <ProfileMiniItem label="Pendidikan" value={isEditing ? editData.guardianEducation : selectedStudent.guardianEducation} isEditing={isEditing} onChange={val => setEditData({...editData, guardianEducation: val})} />
                        <ProfileMiniItem label="Pekerjaan" value={isEditing ? editData.guardianJob : selectedStudent.guardianJob} isEditing={isEditing} onChange={val => setEditData({...editData, guardianJob: val})} />
                        <ProfileMiniItem label="Penghasilan" value={isEditing ? editData.guardianIncome : selectedStudent.guardianIncome} isEditing={isEditing} onChange={val => setEditData({...editData, guardianIncome: val})} />
                      </div>
                    </div>
                  </div>
                  {/* Additional Family Info */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                    <ProfileItem label="Anak Ke-" value={isEditing ? editData.anakKe : selectedStudent.anakKe} isEditing={isEditing} onChange={val => setEditData({...editData, anakKe: val})} />
                    <ProfileItem label="Saudara Kandung" value={isEditing ? editData.jmlSaudaraKandung : selectedStudent.jmlSaudaraKandung} isEditing={isEditing} onChange={val => setEditData({...editData, jmlSaudaraKandung: val})} />
                  </div>
                </div>

                {/* Section: Audit Trail */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="flex items-center gap-2 px-2">
                    <History size={18} className="text-slate-400" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Audit & Riwayat Perubahan</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Perubahan Terakhir</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                        {selectedStudent.updatedAt ? new Date((selectedStudent as any).updatedAt.seconds * 1000).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Petugas Terakhir</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                        {(selectedStudent as any).updatedBy || (selectedStudent as any).createdBy || 'System'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Alamat & Kontak */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="flex items-center gap-2 px-2">
                    <Filter size={18} className="text-emerald-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Kordinat, Alamat & Kontak</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat Lengkap</p>
                        {isEditing ? (
                          <div className="space-y-2">
                             <textarea 
                                value={editData.address || ''} 
                                onChange={e => setEditData({...editData, address: e.target.value})}
                                className="w-full text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border p-2 rounded-xl outline-none"
                             />
                             <div className="grid grid-cols-2 gap-2">
                               <ProfileMiniItem label="RT" value={editData.rt} isEditing={true} onChange={val => setEditData({...editData, rt: val})} />
                               <ProfileMiniItem label="RW" value={editData.rw} isEditing={true} onChange={val => setEditData({...editData, rw: val})} />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                               <ProfileMiniItem label="DUSUN" value={editData.dusun} isEditing={true} onChange={val => setEditData({...editData, dusun: val})} />
                               <ProfileMiniItem label="KEL" value={editData.kelurahan} isEditing={true} onChange={val => setEditData({...editData, kelurahan: val})} />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                               <ProfileMiniItem label="KEC" value={editData.kecamatan} isEditing={true} onChange={val => setEditData({...editData, kecamatan: val})} />
                               <ProfileMiniItem label="POS" value={editData.kodePos} isEditing={true} onChange={val => setEditData({...editData, kodePos: val})} />
                             </div>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed uppercase">
                            {selectedStudent.address}<br/>
                            RT {selectedStudent.rt} / RW {selectedStudent.rw} • DUSUN {selectedStudent.dusun}<br/>
                            KEL. {selectedStudent.kelurahan}, KEC. {selectedStudent.kecamatan}<br/>
                            KODE POS {selectedStudent.kodePos}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <ProfileItem label="Lintang" value={isEditing ? editData.lintang : selectedStudent.lintang} isEditing={isEditing} onChange={val => setEditData({...editData, lintang: val})} />
                         <ProfileItem label="Bujur" value={isEditing ? editData.bujur : selectedStudent.bujur} isEditing={isEditing} onChange={val => setEditData({...editData, bujur: val})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileItem label="Telepon" value={isEditing ? editData.telepon : selectedStudent.telepon} isEditing={isEditing} onChange={val => setEditData({...editData, telepon: val})} />
                        <ProfileItem label="HP" value={isEditing ? editData.hp : selectedStudent.hp} isEditing={isEditing} onChange={val => setEditData({...editData, hp: val})} />
                      </div>
                      <ProfileItem label="Email Pribadi" value={isEditing ? editData.email : selectedStudent.email} isEditing={isEditing} onChange={val => setEditData({...editData, email: val})} />
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileItem label="Jenis Tinggal" value={isEditing ? editData.jenisTinggal : selectedStudent.jenisTinggal} isEditing={isEditing} onChange={val => setEditData({...editData, jenisTinggal: val})} />
                        <ProfileItem label="Transportasi" value={isEditing ? editData.alatTransportasi : selectedStudent.alatTransportasi} isEditing={isEditing} onChange={val => setEditData({...editData, alatTransportasi: val})} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Fasilitas Sosial & Kesehatan */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="flex items-center gap-2 px-2">
                    <TrendingUp size={18} className="text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Kesejahteraan & Fisik</h4>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <ProfileMiniItem label="Penerima KPS" value={isEditing ? editData.penerimaKPS : selectedStudent.penerimaKPS} isEditing={isEditing} onChange={val => setEditData({...editData, penerimaKPS: val})} />
                      <ProfileMiniItem label="No KPS" value={isEditing ? editData.noKPS : selectedStudent.noKPS} isEditing={isEditing} onChange={val => setEditData({...editData, noKPS: val})} />
                      <ProfileMiniItem label="Penerima KIP" value={isEditing ? editData.penerimaKIP : selectedStudent.penerimaKIP} isEditing={isEditing} onChange={val => setEditData({...editData, penerimaKIP: val})} />
                      <ProfileMiniItem label="No KIP" value={isEditing ? editData.noKIP : selectedStudent.noKIP} isEditing={isEditing} onChange={val => setEditData({...editData, noKIP: val})} />
                    </div>
                    <div className="space-y-4">
                      <ProfileMiniItem label="Nama di KIP" value={isEditing ? editData.namaKIP : selectedStudent.namaKIP} isEditing={isEditing} onChange={val => setEditData({...editData, namaKIP: val})} />
                      <ProfileMiniItem label="No KKS" value={isEditing ? editData.noKKS : selectedStudent.noKKS} isEditing={isEditing} onChange={val => setEditData({...editData, noKKS: val})} />
                      <ProfileMiniItem label="Layak PIP" value={isEditing ? editData.layakPIP : selectedStudent.layakPIP} isEditing={isEditing} onChange={val => setEditData({...editData, layakPIP: val})} />
                      <ProfileMiniItem label="Alasan PIP" value={isEditing ? editData.alasanLayakPIP : selectedStudent.alasanLayakPIP} isEditing={isEditing} onChange={val => setEditData({...editData, alasanLayakPIP: val})} />
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileMiniItem label="BB (Kg)" value={isEditing ? editData.beratBadan : selectedStudent.beratBadan} isEditing={isEditing} onChange={val => setEditData({...editData, beratBadan: val})} />
                        <ProfileMiniItem label="TB (Cm)" value={isEditing ? editData.tinggiBadan : selectedStudent.tinggiBadan} isEditing={isEditing} onChange={val => setEditData({...editData, tinggiBadan: val})} />
                      </div>
                      <ProfileMiniItem label="Lingkar Kepala" value={isEditing ? editData.lingkarKepala : selectedStudent.lingkarKepala} isEditing={isEditing} onChange={val => setEditData({...editData, lingkarKepala: val})} />
                      <ProfileMiniItem label="Jarak Sekolah" value={isEditing ? editData.jarakSekolah : selectedStudent.jarakSekolah} isEditing={isEditing} onChange={val => setEditData({...editData, jarakSekolah: val})} />
                    </div>
                  </div>
                </div>

                {/* Section: Bank */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="flex items-center gap-2 px-2">
                    <FileText size={18} className="text-amber-600" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Informasi Perbankan</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <ProfileItem label="Nama Bank" value={isEditing ? editData.bank : selectedStudent.bank} isEditing={isEditing} onChange={val => setEditData({...editData, bank: val})} />
                    <ProfileItem label="No Rekening" value={isEditing ? editData.noRekening : selectedStudent.noRekening} isEditing={isEditing} onChange={val => setEditData({...editData, noRekening: val})} />
                    <ProfileItem label="Atas Nama" value={isEditing ? editData.rekeningAtasNama : selectedStudent.rekeningAtasNama} isEditing={isEditing} onChange={val => setEditData({...editData, rekeningAtasNama: val})} />
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMutationOpen && (selectedStudent || selectedIds.size > 0) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMutationOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-rose-50 dark:bg-rose-900/10">
                <h3 className="text-xl font-black text-rose-600">Form Mutasi Siswa</h3>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Pencatatan Perubahan Status Siswa</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-2">
                  {selectedStudent ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Nama Siswa</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase">NISN / NIS</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedStudent.nisn} / {selectedStudent.nipd || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Kelas / TTL</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedStudent.classId || '-'} / {selectedStudent.pob}, {selectedStudent.dob}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <Users size={32} className="text-amber-500 mb-2" />
                      <p className="text-sm font-black text-slate-800 dark:text-white">{selectedIds.size} SISWA TERPILIH</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">
                        Memindahkan status untuk seluruh siswa yang telah Anda pilih di tabel.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Mutasi</label>
                    <select 
                      value={mutationType}
                      onChange={e => setMutationType(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Mutasi Pindah">Mutasi Pindah</option>
                      <option value="Mutasi Keluar">Mutasi Keluar</option>
                      <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                      <option value="Putus Sekolah">Putus Sekolah</option>
                      <option value="Lulus">Lulus</option>
                    </select>
                  </div>

                  {mutationType === 'Mutasi Pindah' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ke sekolah (Tujuan)</label>
                      <input 
                        required
                        placeholder="Contoh: SMA Negeri 1 Cianjur"
                        value={targetSchool}
                        onChange={e => setTargetSchool(e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-rose-500"
                      />
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alasan Mutasi</label>
                    <textarea 
                      placeholder="Masukkan alasan mutasi secara manual..."
                      value={mutationReason}
                      onChange={e => setMutationReason(e.target.value)}
                      className="w-full h-32 bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Mutasi</label>
                    <input 
                      type="date"
                      value={mutationDate}
                      onChange={e => setMutationDate(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsMutationOpen(false)}
                    className="flex-1 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleApplyMutation}
                    disabled={isImporting || !mutationReason}
                    className="flex-1 h-16 bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Mutasi'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-700 rounded-2xl"
              >
                <X size={20} />
              </button>
              <div className="p-10 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Tambah Siswa Baru</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lengkapi data pokok sesuai Dapodik</p>
              </div>
              <form onSubmit={handleAddStudent} className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Identity Group */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] mb-4">Data Identitas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                      <input 
                        required
                        value={newStudent.name}
                        onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                      <select 
                        value={newStudent.gender}
                        onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas (Rombel)</label>
                      <input 
                        placeholder="Contoh: X-1"
                        value={newStudent.classId}
                        onChange={e => setNewStudent({...newStudent, classId: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Angkatan</label>
                      <input 
                        placeholder={new Date().getFullYear().toString()}
                        value={newStudent.angkatan}
                        onChange={e => setNewStudent({...newStudent, angkatan: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agama</label>
                      <select 
                        value={newStudent.agama}
                        onChange={e => setNewStudent({...newStudent, agama: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Budha">Budha</option>
                        <option value="Konghucu">Konghucu</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN</label>
                      <input 
                        required
                        value={newStudent.nisn}
                        onChange={e => setNewStudent({...newStudent, nisn: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIPD</label>
                      <input 
                        value={newStudent.nipd}
                        onChange={e => setNewStudent({...newStudent, nipd: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIK</label>
                      <input 
                        value={newStudent.nik}
                        onChange={e => setNewStudent({...newStudent, nik: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Birth & Family */}
                <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4">Lahir & Keluarga</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempat Lahir</label>
                      <input 
                        value={newStudent.pob}
                        onChange={e => setNewStudent({...newStudent, pob: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Lahir</label>
                      <input 
                        type="date"
                        value={newStudent.dob}
                        onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ibu Kandung</label>
                      <input 
                        value={newStudent.motherName}
                        onChange={e => setNewStudent({...newStudent, motherName: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. KK</label>
                      <input 
                        value={newStudent.noKK}
                        onChange={e => setNewStudent({...newStudent, noKK: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Group */}
                <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Data Alamat</h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                    <textarea 
                      value={newStudent.address}
                      onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                      className="w-full h-20 bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RT</label>
                      <input 
                        value={newStudent.rt}
                        onChange={e => setNewStudent({...newStudent, rt: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RW</label>
                      <input 
                        value={newStudent.rw}
                        onChange={e => setNewStudent({...newStudent, rw: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dusun</label>
                      <input 
                        value={newStudent.dusun}
                        onChange={e => setNewStudent({...newStudent, dusun: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelurahan</label>
                      <input 
                        value={newStudent.kelurahan}
                        onChange={e => setNewStudent({...newStudent, kelurahan: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Pos</label>
                      <input 
                        value={newStudent.kodePos}
                        onChange={e => setNewStudent({...newStudent, kodePos: e.target.value})}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-slate-700 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={isImporting}
                    className="flex-1 h-16 bg-cyan-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCleaningOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-6 bg-cyan-50 dark:bg-cyan-900/10 rounded-3xl border border-cyan-100 dark:border-cyan-900/30 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <h4 className="text-sm font-black text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
                  <Wrench size={16} /> Rapikan Format Teks
                </h4>
                <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mt-1">Standarisasi Nama & Tempat Lahir</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => bulkFormatting('proper')}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 text-cyan-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:translate-y-[-2px] transition-all"
                >
                  Proper Case
                </button>
                <button 
                  onClick={() => bulkFormatting('upper')}
                  className="px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:translate-y-[-2px] transition-all"
                >
                  UPPERCASE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDuplicateModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
               onClick={() => {
                 setIsDuplicateModalOpen(false);
                 setDeleteConfirmId(null);
               }}
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-900/20">
                <div>
                   <h3 className="text-lg font-black text-rose-600">Resolusi Data Duplikat</h3>
                   <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Ditemukan {duplicates.length} NISN Ganda</p>
                </div>
                <button 
                  onClick={() => {
                    setIsDuplicateModalOpen(false);
                    setDeleteConfirmId(null);
                  }}
                  className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors"
                >
                  <X size={20} className="text-rose-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {duplicates.map((group, idx) => (
                  <div key={idx} className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                       <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg">NISN: {group.nisn}</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{group.students.length} Record Ditemukan</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {group.students.map((s: any, sIdx: number) => (
                         <div key={sIdx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50 dark:border-slate-700 group hover:border-rose-200 transition-all">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-400">
                                  {s.name ? s.name[0] : '?'}
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-700 dark:text-white uppercase">{s.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">UID: {s.uid}</p>
                                  <p className="text-[9px] font-bold text-cyan-600 uppercase">{s.email}</p>
                               </div>
                            </div>
                            <button 
                              onClick={(e) => deleteDuplicateRecord(s.uid, group.nisn, e)}
                              className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                                deleteConfirmId === s.uid 
                                  ? "bg-rose-600 text-white animate-pulse shadow-lg" 
                                  : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              )}
                              title={deleteConfirmId === s.uid ? "Klik Lagi untuk KONFIRMASI Hapus" : "Hapus Record Ini"}
                            >
                               {deleteConfirmId === s.uid ? <AlertCircle size={16} /> : <Trash2 size={16} />}
                            </button>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900">
                 <p className="text-[10px] font-medium text-slate-500 text-center italic">Tip: Gunakan tombol 'Hapus' pada record yang ingin dibuang.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(isImporting && !isAddModalOpen) && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-3 min-w-[240px]">
          <div className="flex items-center gap-4">
            <Loader2 size={20} className="text-cyan-600 animate-spin" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              {importProgress < 100 ? `Memproses ${importProgress}%` : 'Hampir Selesai...'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-600"
              initial={{ width: 0 }}
              animate={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}
      {/* Search Bar */}
      <ModuleSearch 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        placeholder={activeTab === 'AKTIF' ? "Cari NISN atau nama siswa..." : `Cari di daftar ${activeTab.toLowerCase()}...`}
        extraFilters={
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-50 dark:border-slate-700 soft-shadow min-w-[140px]">
              <CalendarDays size={14} className="text-slate-400" />
              <select 
                value={selectedAngkatan}
                onChange={e => setSelectedAngkatan(e.target.value)}
                className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-200 bg-transparent outline-none w-full cursor-pointer"
              >
                <option value="SEMUA">ANGKATAN: SEMUA</option>
                {uniqueAngkatanList.map(a => (
                  <option key={a} value={a}>TAHUN: {a}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-50 dark:border-slate-700 soft-shadow min-w-[140px]">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-200 bg-transparent outline-none w-full cursor-pointer"
              >
                <option value="SEMUA">ROMBEL: SEMUA</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>KELAS: {c}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-50 dark:border-slate-700 soft-shadow flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors"
            >
              <TrendingUp size={14} className={cn("transition-transform", sortOrder === 'desc' && "rotate-180")} />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10 text-nowrap overflow-x-auto no-scrollbar pb-2">
        <ModuleCard 
            title="Total Siswa" 
            value={statsDetail.TOTAL.total} 
            subValue={statsDetail.TOTAL.sub}
            label="Database Induk" 
            icon={<Users size={20} />} 
            color="bg-slate-900" 
        />
        <ModuleCard 
            title="Siswa Aktif" 
            value={statsDetail.AKTIF.total} 
            subValue={statsDetail.AKTIF.sub}
            label="KBM Aktif" 
            icon={<UserCheck size={20} />} 
            color="bg-emerald-500" 
        />
        <ModuleCard 
            title="Lulus" 
            value={statsDetail.LULUS.total} 
            subValue={statsDetail.LULUS.sub}
            label="Alumni" 
            icon={<GraduationCap size={20} />} 
            color="bg-blue-600" 
        />
        <ModuleCard 
            title="Mutasi Pindah" 
            value={statsDetail['MUTASI PINDAH'].total} 
            subValue={statsDetail['MUTASI PINDAH'].sub}
            label="Keluar Pindah" 
            icon={<ArrowRightLeft size={20} />} 
            color="bg-amber-500" 
        />
        <ModuleCard 
            title="Mutasi Keluar" 
            value={statsDetail['MUTASI KELUAR'].total} 
            subValue={statsDetail['MUTASI KELUAR'].sub}
            label="Keluar Lainnya" 
            icon={<ArrowRightLeft size={20} />} 
            color="bg-rose-500" 
        />
        <ModuleCard 
            title="Mundur" 
            value={statsDetail['MENGUNDURKAN DIRI'].total} 
            subValue={statsDetail['MENGUNDURKAN DIRI'].sub}
            label="Berhenti Sendiri" 
            icon={<X size={20} />} 
            color="bg-orange-600" 
        />
        <ModuleCard 
            title="Putus Sekolah" 
            value={statsDetail['PUTUS SEKOLAH'].total} 
            subValue={statsDetail['PUTUS SEKOLAH'].sub}
            label="DO" 
            icon={<AlertCircle size={20} />} 
            color="bg-red-700" 
        />
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-full lg:min-w-0">
          {TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 min-w-[140px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap px-4",
                activeTab === tab.id ? "bg-white dark:bg-slate-700 text-cyan-600 shadow-sm" : "text-slate-400 hover:text-slate-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 dark:text-white font-black text-lg">
            {activeTab === 'AKTIF' ? 'Data Induk Siswa Aktif' : `Daftar Siswa Status: ${activeTab.toUpperCase()}`}
          </h2>
          <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">SMAS PGRI Naringgul</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700">
            <Loader2 size={32} className="text-cyan-600 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-[40px] text-center border border-red-100 dark:border-red-900/20">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        ) : activeTab === 'AKTIF' ? (
          /* DAFTAR SISWA VIEW */
          <div className="bg-white dark:bg-slate-800/80 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-2 border-slate-200 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredStudents.length}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : 'Pilih Semua'}
                  </span>
              </div>
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400 text-sm font-bold">Tidak ada data siswa aktif ditemukan.</p>
                </div>
              ) : (
                filteredStudents.map((student, i, arr) => (
                    <div 
                        key={student.uid} 
                        className={cn(
                        "p-6 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group",
                        i !== arr.length - 1 && "border-b border-slate-50 dark:border-slate-700/50"
                    )}>
                        <div className="shrink-0">
                           <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            checked={selectedIds.has(student.uid!)}
                            onChange={() => toggleSelect(student.uid!)}
                          />
                        </div>
                        <div 
                          className="flex flex-1 items-center gap-4 cursor-pointer"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsProfileOpen(true);
                          }}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-900/40 flex items-center justify-center text-cyan-600 font-black text-lg group-hover:scale-110 transition-transform">
                              {student.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-800 dark:text-white text-sm truncate">{student.name}</h4>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">#{i + 1}</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {student.nisn} • {student.classId || 'Belum Ada Kelas'}
                              </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <div className="flex gap-1 mb-2">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setSelectedStudent(student);
                                    setIsMutationOpen(true);
                                  }}
                                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors" 
                                  title="Mutasi Siswa"
                                >
                                  <ArrowRightLeft size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const confirmLulus = window.confirm(`Luluskan ${student.name}?`);
                                    if (confirmLulus) {
                                      setSelectedStudent(student);
                                      setMutationType('Lulus');
                                      setMutationReason('Lulus Tahun Ajaran');
                                      handleApplyMutation();
                                    }
                                  }}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" 
                                  title="Luluskan"
                                >
                                  <GraduationCap size={14} />
                                </button>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                              student.status === 'Lulus' ? "bg-blue-50 text-blue-600" :
                              ['Keluar', 'Mutasi Keluar', 'Mutasi Pindah', 'Mengundurkan Diri', 'Putus Sekolah'].includes(student.status!) ? "bg-slate-100 text-slate-500" :
                              "bg-emerald-50 text-emerald-600"
                            )}>
                                {student.status || 'AKTIF'}
                            </span>
                        </div>
                    </div>
                ))
              )}
          </div>
        ) : (
          /* NON-AKTIF VIEWS (Lulus, Mutasi, etc) */
          <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center bg-white/50 dark:bg-slate-800/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest text-[10px]">Tidak ada data siswa {activeTab} ditemukan.</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.uid} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] soft-shadow border border-slate-50 dark:border-slate-700 flex items-center gap-5 group hover:border-cyan-200 transition-colors">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        student.status === 'Lulus' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                      )}>
                           {student.status === 'Lulus' ? <GraduationCap size={24} /> : <ArrowRightLeft size={24} />}
                      </div>
                      <div className="flex-1">
                          <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase">{student.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            NISN: {student.nisn} • STATUS: {student.status || 'AKTIF'}
                          </p>
                          {student.status === 'Mutasi Pindah' && (student as any).targetSchool && (
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-0.5">
                              Tujuan: {(student as any).targetSchool}
                            </p>
                          )}
                          {student.status === 'Lulus' && student.updatedAt ? (
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                              Tahun Lulus: {new Date((student as any).updatedAt?.seconds * 1000).getFullYear()}
                            </p>
                          ) : student.updatedAt && (
                            <p className="text-[8px] font-medium text-slate-300 uppercase mt-1">
                              Dicatat pada: {new Date((student as any).updatedAt?.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsProfileOpen(true);
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          Detail
                        </button>
                        <button 
                          onClick={() => handleResetStatus(student.uid!)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                           Aktifkan
                        </button>
                      </div>
                  </div>
                ))
              )}
          </div>
        )}
        
        {!loading && (
          <div className="mt-12 p-8 bg-gradient-to-tr from-cyan-600 to-cyan-700 rounded-[40px] text-white shadow-xl shadow-cyan-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <FileText size={40} className="mb-6 opacity-40" />
                <h3 className="text-xl font-black tracking-tight mb-2">Laporan Mutasi Cetak</h3>
                <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest mb-6">Format PDF / Spreadsheet sesuai template Dapodik</p>
                <button className="w-full py-4 bg-white text-cyan-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    Generate Laporan Mutasi
                </button>
              </div>
              <div className="absolute top-0 right-0 p-8">
                  <TrendingUp size={120} className="text-white opacity-5 -rotate-12 translate-x-8 -translate-y-8" />
              </div>
          </div>
        )}
      </section>
    </ModulePage>
  );
};

