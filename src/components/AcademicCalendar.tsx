import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Tag, 
  X, 
  Save, 
  Trash2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ModulePage } from './ModuleLayout';
import { useAuth } from '../hooks/useAuth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  type: 'HOLIDAY' | 'EXAM' | 'MEETING' | 'EVENT';
  location?: string;
  createdBy: string;
}

export const AcademicCalendar: React.FC = () => {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SchoolEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'EVENT' as SchoolEvent['type'],
    location: ''
  });

  const isAdmin = profile?.roles?.some(r => ['admin', 'operator', 'kepsek', 'wakakur'].includes(r));

  useEffect(() => {
    const q = query(collection(db, 'academic_events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SchoolEvent[];
      setEvents(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'academic_events');
    });
    return () => unsubscribe();
  }, []);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-3xl soft-shadow flex items-center justify-center text-blue-600">
              <CalendarIcon size={28} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: id })}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{events.filter(e => isSameMonth(parseISO(e.date), currentMonth)).length} Agenda Bulan Ini</p>
           </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all soft-shadow"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-6 h-12 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all soft-shadow"
          >
            Hari Ini
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all soft-shadow"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, i) => (
          <div key={day} className={cn(
            "text-center text-[10px] font-black uppercase tracking-[0.2em]",
            i === 0 ? "text-rose-500" : "text-slate-400"
          )}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayEvents = events.filter(e => isSameDay(parseISO(e.date), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative h-32 md:h-40 border border-slate-50 dark:border-slate-800/50 p-2 transition-all cursor-pointer",
              !isSameMonth(day, monthStart) ? "bg-slate-50/50 dark:bg-slate-900/20 text-slate-300" : "bg-white dark:bg-slate-800/40 text-slate-800 dark:text-white",
              isSameDay(day, new Date()) ? "ring-2 ring-blue-500 ring-inset" : "",
              isSameDay(day, selectedDate) ? "bg-blue-50/30 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
            )}
            onClick={() => {
              setSelectedDate(cloneDay);
              setFormData({ ...formData, date: format(cloneDay, 'yyyy-MM-dd') });
            }}
          >
            <span className={cn(
               "text-[10px] font-black uppercase tracking-widest",
               i === 0 && isSameMonth(day, monthStart) ? "text-rose-500" : ""
            )}>{formattedDate}</span>
            
            <div className="mt-2 space-y-1 overflow-y-auto max-h-[80%] no-scrollbar">
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  className={cn(
                    "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tight truncate",
                    event.type === 'HOLIDAY' ? "bg-rose-100 text-rose-700" :
                    event.type === 'EXAM' ? "bg-amber-100 text-amber-700" :
                    event.type === 'MEETING' ? "bg-blue-100 text-blue-700" :
                    "bg-emerald-100 text-emerald-700"
                  )}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-[40px] overflow-hidden border border-slate-100 dark:border-slate-700 soft-shadow">{rows}</div>;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    try {
      setLoading(true);
      const data = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (isEditing && selectedItem) {
        await setDoc(doc(db, 'academic_events', selectedItem.id), data, { merge: true });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'ACADEMIC',
          action: 'UPDATE',
          message: `Update agenda: ${formData.title}`,
          user: profile?.name || 'Admin',
          timestamp: serverTimestamp()
        });
      } else {
        const docRef = doc(collection(db, 'academic_events'));
        await setDoc(docRef, {
          ...data,
          createdBy: profile?.name || 'Admin',
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'audit_logs'), {
          type: 'ACADEMIC',
          action: 'CREATE',
          message: `Agenda baru: ${formData.title} pada ${formData.date}`,
          user: profile?.name || 'Admin',
          timestamp: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ title: '', description: '', date: format(selectedDate, 'yyyy-MM-dd'), type: 'EVENT', location: '' });
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'academic_events');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: SchoolEvent) => {
    setSelectedItem(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      type: event.type,
      location: event.location || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm('Hapus agenda ini?')) return;
    try {
      await deleteDoc(doc(db, 'academic_events', id));
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ACADEMIC',
        action: 'DELETE',
        message: `Hapus agenda: ${title}`,
        user: profile?.name || 'Admin',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `academic_events/${id}`);
    }
  };

  const selectedDateEvents = events.filter(e => isSameDay(parseISO(e.date), selectedDate));

  return (
    <ModulePage 
      title="Kalender Akademik" 
      subtitle="Agenda & Program Sekolah" 
      icon={<CalendarIcon size={28} />} 
      color="bg-blue-600"
      actions={isAdmin && (
        <button 
          onClick={() => { setIsEditing(false); setIsModalOpen(true); }}
          className="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
        <div className="xl:col-span-3">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>

        <div className="space-y-8 pt-2">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-50 dark:border-slate-700 soft-shadow">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                     <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Agenda Terpilih</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(selectedDate, 'd MMMM yyyy', { locale: id })}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {selectedDateEvents.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[32px]">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Tidak Ada Agenda</p>
                    </div>
                  ) : selectedDateEvents.map(event => (
                    <div key={event.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 group relative">
                       <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            event.type === 'HOLIDAY' ? "bg-rose-100 text-rose-700" :
                            event.type === 'EXAM' ? "bg-amber-100 text-amber-700" :
                            event.type === 'MEETING' ? "bg-blue-100 text-blue-700" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {event.type}
                          </span>
                          {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => handleEdit(event)} className="text-slate-400 hover:text-blue-500 hover:scale-110 transition-all">
                                <Tag size={14} />
                              </button>
                              <button onClick={() => handleDelete(event.id, event.title)} className="text-rose-500 hover:scale-110 transition-all">
                                 <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                       </div>
                       <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase mb-1">{event.title}</h4>
                       <p className="text-slate-500 text-[10px] leading-relaxed mb-4">{event.description}</p>
                       {event.location && (
                         <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{event.location}</span>
                         </div>
                       )}
                    </div>
                  ))}

                  {isAdmin && (
                    <button 
                      onClick={() => { setIsEditing(false); setIsModalOpen(true); }}
                      className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                       <Plus size={16} />
                       Tambah Agenda
                    </button>
                  )}
               </div>
            </div>

            {/* Upcoming Summary */}
            <div className="p-8 bg-blue-600 rounded-[40px] text-white shadow-xl shadow-blue-600/20">
               <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Mendatang</h4>
               <div className="space-y-6">
                  {events.filter(e => parseISO(e.date) > new Date()).slice(0, 3).map(e => (
                    <div key={`upcoming-${e.id}`} className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-black leading-none">{format(parseISO(e.date), 'd')}</span>
                          <span className="text-[7px] font-black uppercase">{format(parseISO(e.date), 'MMM')}</span>
                       </div>
                       <div className="min-w-0">
                          <p className="font-bold text-xs uppercase truncate">{e.title}</p>
                          <p className="text-[9px] font-black uppercase opacity-60 mt-0.5">{format(parseISO(e.date), 'EEEE', { locale: id })}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[44px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                     <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{isEditing ? 'Edit Agenda' : 'Ketik Agenda Baru'}</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{format(selectedDate, 'd MMMM yyyy', { locale: id })}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Agenda</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Contoh: Rapat Pleno Guru"
                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    >
                      <option value="EVENT">Agenda Umum</option>
                      <option value="EXAM">Ujian / Tes</option>
                      <option value="MEETING">Rapat / Dinas</option>
                      <option value="HOLIDAY">Hari Libur</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasi (Opsional)</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="Contoh: Aula Sekolah"
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl pl-14 pr-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Singkat</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Opsional..."
                    className="w-full h-32 bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 text-sm font-bold border border-slate-100 dark:border-slate-700 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  {isEditing ? 'Update Agenda' : 'Simpan Agenda'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};
