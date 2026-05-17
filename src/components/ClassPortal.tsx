import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowRightLeft, 
  LayoutGrid, 
  ChevronRight,
  TrendingUp,
  School,
  ArrowRight,
  Loader2,
  Filter,
  CheckCircle2,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { ModulePage, ModuleCard } from './ModuleLayout';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export const ClassPortal: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Selection for bulk move
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetClass, setTargetClass] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), where('roles', 'array-contains', 'student'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setStudents(studentList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Derived data
  const classes = Array.from(new Set(students.map(s => s.classId).filter(Boolean))) as string[];
  classes.sort();
  
  const classStats = classes.map(cls => ({
    name: cls || 'Tanpa Kelas',
    total: students.filter(s => s.classId === cls).length,
    male: students.filter(s => s.classId === cls && s.gender === 'L').length,
    female: students.filter(s => s.classId === cls && s.gender === 'P').length,
  }));

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.nisn && s.nisn.includes(searchTerm));
      const matchesClass = selectedClass ? s.classId === selectedClass : true;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

  const handleBulkMove = async () => {
    if (!targetClass || selectedStudentIds.length === 0) return;
    
    setLoading(true);
    try {
      const promises = selectedStudentIds.map(id => {
        const studentRef = doc(db, 'users', id);
        return updateDoc(studentRef, {
          classId: targetClass.toUpperCase(),
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(promises);
      alert(`Berhasil memindahkan ${selectedStudentIds.length} siswa ke kelas ${targetClass}`);
      setSelectedStudentIds([]);
      setIsMoveModalOpen(false);
      setTargetClass('');
    } catch (err) {
      console.error(err);
      alert("Gagal memindahkan siswa.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <ModulePage 
      title="Manajemen Rombel" 
      subtitle="Pengaturan Kelas & Penempatan" 
      icon={<School size={28} />} 
      color="bg-indigo-600"
      actions={
        <div className="flex gap-2">
            <button 
              disabled={selectedStudentIds.length === 0}
              onClick={() => setIsMoveModalOpen(true)}
              className={cn(
                "h-12 px-6 rounded-2xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                selectedStudentIds.length > 0 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <ArrowRightLeft size={16} />
              Pindah Massal ({selectedStudentIds.length})
            </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Class List */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Daftar Rombel</h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{classes.length} Kelas</span>
          </div>

          <div className="space-y-3">
             <button 
                onClick={() => setSelectedClass(null)}
                className={cn(
                  "w-full p-5 rounded-[24px] flex items-center justify-between transition-all border",
                  selectedClass === null 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-600 hover:border-indigo-200"
                )}
             >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedClass === null ? "bg-white/20" : "bg-indigo-50 text-indigo-600")}>
                    <LayoutGrid size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Semua Siswa</p>
                    <p className={cn("text-[9px] font-bold", selectedClass === null ? "text-indigo-100" : "text-slate-400")}>{students.length} Total</p>
                  </div>
                </div>
                <ChevronRight size={16} className={selectedClass === null ? "text-white" : "text-slate-300"} />
             </button>

             {classStats.map((cls) => (
                <button 
                  key={cls.name}
                  onClick={() => setSelectedClass(cls.name)}
                  className={cn(
                    "w-full p-5 rounded-[24px] flex items-center justify-between transition-all border",
                    selectedClass === cls.name 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-600 hover:border-indigo-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", selectedClass === cls.name ? "bg-white/20" : "bg-slate-50 dark:bg-slate-700 text-indigo-600")}>
                      {cls.name.split('-')[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">{cls.name}</p>
                      <p className={cn("text-[9px] font-bold", selectedClass === cls.name ? "text-indigo-100" : "text-slate-400")}>
                        {cls.total} Siswa (L:{cls.male} P:{cls.female})
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={selectedClass === cls.name ? "text-white" : "text-slate-300"} />
                </button>
             ))}
          </div>

          <div className="p-6 bg-slate-900 rounded-[32px] text-white">
             <TrendingUp size={32} className="text-indigo-400 mb-4" />
             <h4 className="text-sm font-black mb-2">Penempatan Siswa</h4>
             <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed mb-6">Gunakan fitur pindah massal untuk mengatur rombel baru di awal tahun ajaran.</p>
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-400">
                <span>Rata-rata / Kelas</span>
                <span>{Math.round(students.length / (classes.length || 1))} Siswa</span>
             </div>
          </div>
        </div>

        {/* Right Column: Student List in Selected Class */}
        <div className="lg:col-span-2 space-y-6">
           <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NISN..."
                className="w-full h-14 bg-white dark:bg-slate-800 rounded-2xl pl-12 pr-12 text-sm font-bold border border-slate-50 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 soft-shadow transition-all"
              />
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="absolute inset-y-0 right-4 flex items-center text-indigo-600 hover:text-indigo-700"
                title={sortOrder === 'asc' ? "Sortir Z to A" : "Sortir A to Z"}
              >
                {sortOrder === 'asc' ? <TrendingUp size={20} className="rotate-0" /> : <TrendingUp size={20} className="scale-y-[-1]" />}
              </button>
           </div>

           <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-50 dark:border-slate-700 soft-shadow overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                         onChange={() => {
                           if (selectedStudentIds.length === filteredStudents.length) {
                             setSelectedStudentIds([]);
                           } else {
                             setSelectedStudentIds(filteredStudents.map(s => s.uid));
                           }
                         }}
                         className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                       />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Semua</span>
                    </div>
                 </div>
                 <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {selectedClass || 'Semua'} • {filteredStudents.length} Siswa
                 </div>
              </div>

              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={32} className="text-indigo-600 animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat database...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-20 text-center">
                  <p className="text-sm font-bold text-slate-400">Tidak ada data penempatan ditemukan.</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {filteredStudents.map((student, i) => (
                    <div 
                      key={student.uid}
                      onClick={() => toggleStudentSelection(student.uid)}
                      className={cn(
                        "p-4 flex items-center gap-4 cursor-pointer transition-colors group",
                        selectedStudentIds.includes(student.uid) ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-700/50",
                        i !== filteredStudents.length - 1 && "border-b border-slate-50 dark:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            selectedStudentIds.includes(student.uid) 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-white border-slate-200"
                          )}>
                             {selectedStudentIds.includes(student.uid) && <CheckCircle2 size={12} />}
                          </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-400">
                        {student.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-700 dark:text-white truncate">{student.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.nisn} • {student.gender === 'L' ? 'L' : 'P'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                          {student.classId || 'BELUM ADA'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Move Class Modal */}
      <AnimatePresence>
        {isMoveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMoveModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/10">
                <h3 className="text-xl font-black text-indigo-600">Pindah Kelas Massal</h3>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                  Memindahkan {selectedStudentIds.length} siswa terpilih
                </p>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Rombel Tujuan</label>
                    <input 
                      placeholder="Contoh: XI-MIPA-1"
                      value={targetClass}
                      onChange={e => setTargetClass(e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>

                 <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                    <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Peringatan</h5>
                    <p className="text-[10px] text-orange-400 font-bold leading-relaxed">
                      Perubahan ini akan langsung mendaftarkan siswa ke Rombel baru di database utama.
                    </p>
                 </div>

                 <div className="flex gap-4">
                  <button 
                    onClick={() => setIsMoveModalOpen(false)}
                    className="flex-1 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleBulkMove}
                    disabled={!targetClass}
                    className="flex-1 h-16 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Eksekusi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};
