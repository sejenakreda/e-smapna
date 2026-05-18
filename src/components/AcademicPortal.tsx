import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  Award, 
  Plus, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  History,
  Info,
  Trash2,
  Save,
  X,
  TrendingUp,
  MapPin,
  Users,
  Loader2
} from 'lucide-react';
import { ModulePage, ModuleSearch } from './ModuleLayout';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firebase';

import { AcademicCalendar } from './AcademicCalendar';

interface Subject {
  uid: string;
  name: string;
  code: string;
}

interface Schedule {
  uid: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  classId: string;
  teacherId: string;
}

interface TeachingJournal {
  uid: string;
  date: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  topic: string;
  summary: string;
  attendanceCount: number;
  createdAt: any;
}

export const AcademicPortal: React.FC = () => {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [gtkList, setGtkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'OVERVIEW' | 'SUBJECTS' | 'SCHEDULE' | 'JOURNALS' | 'CALENDAR'>('OVERVIEW');

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      setSubjects(snap.docs.map(d => ({ ...d.data(), uid: d.id })) as Subject[]);
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
      setSchedules(snap.docs.map(d => ({ ...d.data(), uid: d.id })) as Schedule[]);
    });

    const unsubJournals = onSnapshot(query(collection(db, 'teaching_journals'), orderBy('createdAt', 'desc')), (snap) => {
      setJournals(snap.docs.map(d => ({ ...d.data(), uid: d.id })) as TeachingJournal[]);
    });

    const unsubEvents = onSnapshot(query(collection(db, 'academic_events'), orderBy('date', 'asc')), (snap) => {
      setEvents(snap.docs.map(d => ({ ...d.data(), uid: d.id })));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(d => ({ ...d.data(), uid: d.id })));
    });

    const unsubGtk = onSnapshot(query(collection(db, 'users'), where('roles', 'array-contains', 'teacher')), (snap) => {
      setGtkList(snap.docs.map(d => ({ ...d.data(), uid: d.id })));
    });

    setLoading(false);
    return () => {
      unsubSubjects();
      unsubSchedules();
      unsubJournals();
      unsubEvents();
      unsubClasses();
      unsubGtk();
    };
  }, []);

  const [activeSession, setActiveSession] = useState<Schedule | null>(null);

  useEffect(() => {
    const checkActiveSession = () => {
      const now = new Date();
      const currentDay = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const active = schedules.find(s => {
        if (s.day !== currentDay) return false;
        const [startH, startM] = s.startTime.split(':').map(Number);
        const [endH, endM] = s.endTime.split(':').map(Number);
        const start = startH * 60 + startM;
        const end = endH * 60 + endM;
        return currentTime >= start && currentTime <= end;
      });
      setActiveSession(active || null);
    };

    checkActiveSession();
    const interval = setInterval(checkActiveSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [schedules]);

  const currentDay = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
  const todaySchedules = schedules.filter(s => s.day === currentDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <ModulePage 
      title="Portal Akademik" 
      subtitle="Kurikulum & KBM" 
      icon={<BookOpen size={28} />} 
      color="bg-indigo-600"
      actions={
        <div className="flex gap-2">
           <button 
             onClick={() => setViewMode('OVERVIEW')}
             className={cn("px-4 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'OVERVIEW' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
           >
             Dashboard
           </button>
           <button 
             onClick={() => setViewMode('SUBJECTS')}
             className={cn("px-4 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'SUBJECTS' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
           >
             Mapel
           </button>
           <button 
             onClick={() => setViewMode('SCHEDULE')}
             className={cn("px-4 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'SCHEDULE' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
           >
             Jadwal
           </button>
           <button 
             onClick={() => setViewMode('JOURNALS')}
             className={cn("px-4 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'JOURNALS' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
           >
             Jurnal
           </button>
           <button 
             onClick={() => setViewMode('CALENDAR')}
             className={cn("px-4 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'CALENDAR' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
           >
             Kalender
           </button>
           <button 
             onClick={() => {
               if (viewMode === 'SUBJECTS') setIsSubjectModalOpen(true);
               else if (viewMode === 'SCHEDULE') setIsScheduleModalOpen(true);
               else if (viewMode === 'CALENDAR') { /* No modal for calendar here */ }
               else setIsJournalModalOpen(true);
             }}
             className="w-12 h-12 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white active:scale-95 transition-all"
           >
             <Plus size={24} />
           </button>
        </div>
      }
    >
      <ModuleSearch placeholder="Cari mata pelajaran, guru, atau jurnal..." />

      <motion.div 
        key={viewMode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-10"
      >
        {viewMode === 'OVERVIEW' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem title="Mata Pelajaran" value={subjects.length} color="bg-blue-500" />
              <StatItem title="Jadwal Hari Ini" value={todaySchedules.length} color="bg-orange-500" />
              <StatItem title="Jurnal Terisi" value={journals.length} color="bg-emerald-500" />
              <StatItem title="Total Rombel" value={classes.length} color="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <section className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-slate-900 dark:text-white font-black text-lg italic uppercase tracking-tight">Sesi Aktif & Jadwal Hari Ini</h2>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">LIVE TRACKER</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {todaySchedules.length > 0 ? todaySchedules.map(s => {
                      const subject = subjects.find(sub => sub.uid === s.subjectId);
                      const teacher = gtkList.find(g => g.uid === s.teacherId);
                      const isActive = activeSession?.uid === s.uid;
                      
                      return (
                        <SubjectCard 
                          key={s.uid}
                          title={subject?.name || 'Unknown'} 
                          teacher={teacher?.name || 'Unknown'} 
                          schedule={`${s.startTime} - ${s.endTime}`} 
                          status={s.classId}
                          isActive={isActive}
                          icon={<BookOpen size={20} />}
                          color={isActive ? "bg-indigo-600" : "bg-slate-100"}
                        />
                      );
                    }) : (
                      <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] text-center border-2 border-dashed border-slate-100 dark:border-slate-700">
                        <Calendar size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tidak ada jadwal untuk hari ini ({currentDay})</p>
                      </div>
                    )}
                  </div>
               </section>

               <section className="space-y-6">
                  <h2 className="text-slate-900 dark:text-white font-black text-lg italic uppercase tracking-tight">Kalender Akademik</h2>
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 soft-shadow">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulan Ini</h4>
                           <h3 className="text-xl font-black text-slate-800 dark:text-white">{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}</h3>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center">
                           <Calendar size={24} />
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        {events.length === 0 ? (
                           <p className="text-[10px] font-black text-slate-300 uppercase py-4">Belum ada agenda</p>
                        ) : events.filter(e => {
                           const d = new Date(e.date);
                           const now = new Date();
                           return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }).slice(0, 4).map((ev, i) => (
                           <div key={i} className="flex gap-4 group cursor-pointer hover:translate-x-2 transition-transform">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-12 pt-1">{new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                              <div className="flex-1">
                                 <p className="text-xs font-bold text-slate-700 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight">{ev.title}</p>
                                 <div className={cn(
                                    "w-12 h-1 mt-1.5 rounded-full",
                                    ev.type === 'EVENT' ? "bg-blue-400" : ev.type === 'MEETING' ? "bg-orange-400" : ev.type === 'HOLIDAY' ? "bg-rose-400" : "bg-emerald-400"
                                 )} />
                              </div>
                           </div>
                        ))}
                     </div>
                     
                      <button 
                        onClick={() => setViewMode('CALENDAR')}
                        className="w-full mt-8 h-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all"
                      >
                         Lihat Agenda Lengkap
                      </button>
                  </div>
               </section>
            </div>
          </>
        )}

        {viewMode === 'SUBJECTS' && (
           <section>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Manajemen Mata Pelajaran</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {subjects.map(s => (
                   <div key={s.uid} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-50 dark:border-slate-700 soft-shadow group">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                         <BookOpen size={24} />
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-white mb-1 uppercase tracking-tight">{s.name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.code}</p>
                      <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setSelectedItem(s); setIsSubjectModalOpen(true); }} className="w-10 h-10 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-xl flex items-center justify-center hover:text-blue-600"><FileText size={18} /></button>
                         <button onClick={() => handleDelete('subjects', s.uid)} className="w-10 h-10 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-xl flex items-center justify-center hover:text-rose-600"><Trash2 size={18} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        )}

        {viewMode === 'JOURNALS' && (
           <section>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Jurnal KBM Digital</h2>
              <div className="space-y-6">
                 {journals.map(j => {
                   const subject = subjects.find(s => s.uid === j.subjectId);
                   const teacher = gtkList.find(g => g.uid === j.teacherId);
                   return (
                     <div key={j.uid} className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center">
                                 <CheckCircle2 size={28} />
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{subject?.name} - {j.classId}</h4>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{j.date} • {teacher?.name}</p>
                              </div>
                           </div>
                           <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {j.attendanceCount} Siswa
                           </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-dotted border-slate-200 dark:border-slate-700">
                           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 italic">Materi: {j.topic}</p>
                           <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{j.summary}</p>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </section>
        )}

        {viewMode === 'CALENDAR' && (
           <div className="-mt-10">
              <AcademicCalendar />
           </div>
        )}
      </motion.div>

      {/* Modals Implementation (Simplified for brevity, standard form logic applies) */}
      <AnimatePresence>
         {isSubjectModalOpen && (
           <SubjectModal 
             isOpen={isSubjectModalOpen} 
             onClose={() => { setIsSubjectModalOpen(false); setSelectedItem(null); }}
             item={selectedItem}
             onSuccess={() => setIsSubjectModalOpen(false)}
           />
         )}
         {isScheduleModalOpen && (
           <ScheduleModal 
             isOpen={isScheduleModalOpen} 
             onClose={() => { setIsScheduleModalOpen(false); setSelectedItem(null); }}
             item={selectedItem}
             subjects={subjects}
             classes={classes}
             teachers={gtkList}
             onSuccess={() => setIsScheduleModalOpen(false)}
           />
         )}
         {isJournalModalOpen && (
           <JournalModal 
             isOpen={isJournalModalOpen} 
             onClose={() => setIsJournalModalOpen(false)}
             subjects={subjects}
             classes={classes}
             profile={profile}
             onSuccess={() => setIsJournalModalOpen(false)}
           />
         )}
      </AnimatePresence>
    </ModulePage>
  );
};

const handleDelete = async (coll: string, id: string) => {
  if (!window.confirm("Hapus data ini?")) return;
  try {
    await deleteDoc(doc(db, coll, id));
    await addDoc(collection(db, 'audit_logs'), {
      type: 'ACADEMIC',
      action: 'DELETE',
      message: `Hapus dari ${coll}: ${id}`,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${coll}/${id}`);
  }
};

// --- Sub Components & Modals ---

const SubjectModal: React.FC<{ isOpen: boolean; onClose: () => void; item?: any; onSuccess: () => void }> = ({ onClose, item, onSuccess }) => {
  const [formData, setFormData] = useState({ name: item?.name || '', code: item?.code || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = item ? doc(db, 'subjects', item.uid) : doc(collection(db, 'subjects'));
      await setDoc(docRef, { ...formData, uid: docRef.id }, { merge: true });
      
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ACADEMIC',
        action: item ? 'UPDATE_SUBJECT' : 'CREATE_SUBJECT',
        message: `${item ? 'Update' : 'Tambah'} mapel: ${formData.name}`,
        timestamp: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      handleFirestoreError(err, item ? OperationType.UPDATE : OperationType.CREATE, 'subjects');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-800 rounded-[40px] p-10 w-full max-w-md shadow-2xl">
         <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">Data Mata Pelajaran</h3>
         <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Mapel</label>
               <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kode Mapel</label>
               <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button disabled={saving} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
               {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
               Simpan Data
            </button>
         </form>
      </motion.div>
    </div>
  );
};

const ScheduleModal: React.FC<{ isOpen: boolean; onClose: () => void; item?: any; subjects: Subject[]; classes: any[]; teachers: any[]; onSuccess: () => void }> = ({ onClose, subjects, classes, teachers, item, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    day: item?.day || 'Senin', 
    startTime: item?.startTime || '07:00',
    endTime: item?.endTime || '08:30',
    subjectId: item?.subjectId || '',
    classId: item?.classId || '',
    teacherId: item?.teacherId || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = item ? doc(db, 'schedules', item.uid) : doc(collection(db, 'schedules'));
      await setDoc(docRef, { ...formData, uid: docRef.id }, { merge: true });
      
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ACADEMIC',
        action: item ? 'UPDATE_SCHEDULE' : 'CREATE_SCHEDULE',
        message: `${item ? 'Update' : 'Tambah'} jadwal: ${formData.day} (${formData.startTime}-${formData.endTime})`,
        timestamp: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      handleFirestoreError(err, item ? OperationType.UPDATE : OperationType.CREATE, 'schedules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-800 rounded-[40px] p-10 w-full max-w-xl shadow-2xl">
         <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">Atur Jadwal Pelajaran</h3>
         <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hari</label>
                <select value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm focus:ring-2 focus:ring-blue-500">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mulai</label>
                  <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Selesai</label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 font-bold text-sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mata Pelajaran</label>
                  <select value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm">
                    <option value="">Pilih Mapel</option>
                    {subjects.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.code})</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rombel (Kelas)</label>
                  <select value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm">
                    <option value="">Pilih Kelas</option>
                    {classes.map(c => <option key={c.uid} value={c.uid}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Guru Pengampu</label>
                <select value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm">
                  <option value="">Pilih Guru</option>
                  {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                </select>
            </div>

            <button disabled={saving} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
               {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
               Simpan Jadwal
            </button>
         </form>
      </motion.div>
    </div>
  );
};

const JournalModal: React.FC<{ isOpen: boolean; onClose: () => void; subjects: Subject[]; classes: any[]; profile: any; onSuccess: () => void }> = ({ onClose, subjects, classes, profile, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    subjectId: '',
    classId: '',
    topic: '',
    summary: '',
    attendanceCount: 0
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'teaching_journals'), {
        ...formData,
        teacherId: profile.uid,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'audit_logs'), {
        type: 'ACADEMIC',
        action: 'CREATE_JOURNAL',
        message: `Isi jurnal: ${formData.topic} (${formData.classId})`,
        user: profile.name || 'Guru',
        timestamp: serverTimestamp()
      });

      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'teaching_journals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-800 rounded-[40px] p-10 w-full max-w-2xl shadow-2xl">
         <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">Isi Jurnal Mengajar</h3>
         <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jumlah Siswa Hadir</label>
                <input type="number" value={formData.attendanceCount} onChange={e => setFormData({...formData, attendanceCount: parseInt(e.target.value)})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mata Pelajaran</label>
                  <select value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm" required>
                    <option value="">Pilih Mapel</option>
                    {subjects.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kelas</label>
                  <select value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm" required>
                    <option value="">Pilih Kelas</option>
                    {classes.map(c => <option key={c.uid} value={c.name}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Topik Pelajaran</label>
               <input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ringkasan Materi</label>
               <textarea value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 h-32" required />
            </div>

            <button disabled={saving} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
               {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
               Kirim Jurnal
            </button>
         </form>
      </motion.div>
    </div>
  );
};


const StatItem: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
  <div className="bg-white dark:bg-slate-800/80 p-5 rounded-[32px] border border-slate-50 dark:border-slate-700 soft-shadow flex items-center gap-4">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md", color)}>
       <TrendingUp size={18} />
    </div>
    <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{value}</h3>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{title}</p>
    </div>
  </div>
);

const SubjectCard: React.FC<{ 
  title: string; 
  teacher: string; 
  schedule: string; 
  status: string;
  isActive?: boolean;
  icon: React.ReactNode;
  color: string;
}> = ({ title, teacher, schedule, status, isActive, icon, color }) => (
  <div className={cn(
    "p-5 rounded-[32px] border flex items-center gap-4 transition-all group cursor-pointer",
    isActive 
      ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-500/20 text-white" 
      : "bg-white dark:bg-slate-800/50 border-slate-50 dark:border-slate-700 soft-shadow"
  )}>
    <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
        isActive ? "bg-white/10" : color,
        isActive ? "text-white" : "text-white"
    )}>
        {icon}
    </div>
    <div className="flex-1 min-w-0">
        <h4 className={cn("font-black text-sm truncate", isActive ? "text-white" : "text-slate-800 dark:text-white")}>{title}</h4>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-0.5", isActive ? "text-blue-100" : "text-slate-400 group-hover:text-blue-500")}>{teacher}</p>
        <div className="flex items-center gap-2 mt-2">
            <Clock size={10} className={isActive ? "text-blue-200" : "text-slate-300"} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-blue-100" : "text-slate-400")}>{schedule}</span>
        </div>
    </div>
    <div className={cn(
        "px-3 py-1.5 rounded-xl flex flex-col items-center justify-center",
        isActive ? "bg-white/20" : "bg-slate-50 dark:bg-slate-900"
    )}>
        {isActive ? (
            <Activity size={14} className="text-white animate-pulse" />
        ) : status === 'Selesai' ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
        ) : (
            <AlertCircle size={14} className="text-slate-300" />
        )}
        <span className={cn("text-[7px] font-black uppercase mt-1", isActive ? "text-white" : "text-slate-400")}>{status}</span>
    </div>
  </div>
);

