import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Calendar, 
  User, 
  Users, 
  X, 
  Save, 
  Megaphone,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ModulePage, ModuleSearch } from './ModuleLayout';
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
  addDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: 'ALL' | 'GURU' | 'SISWA';
  author: string;
  createdAt: any;
  priority: 'NORMAL' | 'HIGH';
}

export const Announcements: React.FC = () => {
  const { profile, isAdmin: authIsAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'ALL' as Announcement['target'],
    priority: 'NORMAL' as Announcement['priority']
  });

  const isAdmin = authIsAdmin || profile?.roles?.some(r => ['admin', 'operator', 'kepsek'].includes(r));

  useEffect(() => {
    setLoading(true);
    // Determine which announcements to show based on role
    let q;
    if (isAdmin) {
      q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    } else {
      const targetFilter = profile?.roles?.includes('teacher') ? 'GURU' : 'SISWA';
      q = query(
        collection(db, 'announcements'), 
        where('target', 'in', ['ALL', targetFilter]),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Announcement[];
      setAnnouncements(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, isAdmin]);

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    try {
      setLoading(true);
      const data = {
        ...formData,
        author: profile?.name || 'Admin',
        updatedAt: serverTimestamp()
      };

      if (isEditing && selectedItem) {
        await setDoc(doc(db, 'announcements', selectedItem.id), data, { merge: true });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'ANNOUNCEMENT',
          action: 'UPDATE',
          message: `Update pengumuman: ${formData.title}`,
          user: profile?.name || 'Admin',
          timestamp: serverTimestamp()
        });
      } else {
        const docRef = doc(collection(db, 'announcements'));
        await setDoc(docRef, {
          ...data,
          createdAt: serverTimestamp()
        });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'ANNOUNCEMENT',
          action: 'CREATE',
          message: `Pengumuman baru: ${formData.title}`,
          user: profile?.name || 'Admin',
          timestamp: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ title: '', content: '', target: 'ALL', priority: 'NORMAL' });
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ann: Announcement) => {
    setSelectedItem(ann);
    setFormData({
      title: ann.title,
      content: ann.content,
      target: ann.target,
      priority: ann.priority
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm('Hapus pengumuman ini?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ANNOUNCEMENT',
        action: 'DELETE',
        message: `Hapus pengumuman: ${title}`,
        user: profile?.name || 'Admin',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  return (
    <ModulePage 
      title="Pusat Informasi" 
      subtitle="Pengumuman & Berita Sekolah" 
      icon={<Megaphone size={28} />} 
      color="bg-indigo-600"
      actions={isAdmin && (
        <button 
          onClick={() => { setIsEditing(false); setIsModalOpen(true); }}
          className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
    >
      <ModuleSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Cari pengumuman..."
      />

      <div className="space-y-6 mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-200 mb-4" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Memuat Informasi...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white/40 dark:bg-slate-800/40 p-20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-700 text-center">
             <Bell size={48} className="text-slate-200 dark:text-slate-700 mx-auto mb-6" />
             <p className="text-slate-400 font-bold">Belum ada pengumuman saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAnnouncements.map((ann, idx) => (
              <motion.div 
                key={ann.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "bg-white dark:bg-slate-800 p-8 rounded-[40px] soft-shadow border-l-8 transition-all group relative",
                  ann.priority === 'HIGH' ? "border-rose-500 shadow-rose-500/5" : "border-indigo-500 shadow-indigo-500/5"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        ann.target === 'ALL' ? "bg-slate-100 text-slate-600" :
                        ann.target === 'GURU' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        Target: {ann.target}
                      </span>
                      {ann.priority === 'HIGH' && (
                        <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse">
                          Penting
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock size={12} />
                        {ann.createdAt?.toDate ? new Date(ann.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Baru saja'}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                      {ann.title}
                    </h3>
                    
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                    
                    <div className="pt-4 flex items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Ditulis oleh {ann.author}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <button 
                        onClick={() => handleEdit(ann)}
                        className="w-10 h-10 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 rounded-xl transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ann.id, ann.title)}
                        className="w-10 h-10 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-600 rounded-xl transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[44px] shadow-2xl overflow-hidden shadow-indigo-500/10"
            >
              <div className="p-10 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                     <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{isEditing ? 'Edit Info' : 'Buat Info Baru'}</h3>
                    <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Penyiaran Terpusat</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-10 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Pengumuman</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Contoh: Jadwal Ujian Akhir Semester"
                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori Target</label>
                    <select 
                      value={formData.target}
                      onChange={e => setFormData({...formData, target: e.target.value as any})}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    >
                      <option value="ALL">Semua Warga</option>
                      <option value="GURU">Khusus Guru</option>
                      <option value="SISWA">Khusus Siswa</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioritas</label>
                    <select 
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Tinggi (Penting)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konten Pengumuman</label>
                  <textarea 
                    required
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="Tulis detail informasi di sini..."
                    className="w-full h-40 bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 text-sm font-bold border border-slate-100 dark:border-slate-700 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Publikasikan Sekarang
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};
