import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight,
  Loader2,
  Trash2,
  Edit3,
  Download,
  X,
  Save,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';

interface MailRecord {
  uid: string;
  type: 'IN' | 'OUT';
  noSurat: string;
  perihal: string;
  pengirim: string;
  penerima: string;
  tanggal: string;
  keterangan?: string;
  kategori: string;
  fileUrl?: string;
}

export const BukuAgenda: React.FC = () => {
  const { profile } = useConfig();
  const [mails, setMails] = useState<MailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getTodayWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  
  const [formData, setFormData] = useState<Partial<MailRecord>>({
    type: 'IN',
    noSurat: '',
    perihal: '',
    pengirim: '',
    penerima: 'Kepala Sekolah',
    tanggal: getTodayWIB(),
    kategori: 'PENTING',
    keterangan: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'mail_agenda'), orderBy('tanggal', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMails(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as MailRecord));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mail_agenda');
    });
    return () => unsubscribe();
  }, []);

  const filteredMails = mails.filter(m => {
    const matchesSearch = m.perihal.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.noSurat.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = activeType === 'ALL' || m.type === activeType;
    return matchesSearch && matchesType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.name || 'System'
      };

      if (isEditing && selectedMail) {
        await updateDoc(doc(db, 'mail_agenda', selectedMail.uid), data);
        await addDoc(collection(db, 'audit_logs'), {
          type: 'AGENDA',
          action: 'UPDATE',
          message: `Update agenda: ${formData.noSurat}`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'mail_agenda'), {
          ...data,
          createdAt: serverTimestamp()
        });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'AGENDA',
          action: 'CREATE',
          message: `Agenda baru: ${formData.noSurat} (${formData.type})`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ 
        type: 'IN', 
        noSurat: '', 
        perihal: '', 
        pengirim: '', 
        penerima: 'Kepala Sekolah', 
        tanggal: getTodayWIB(), 
        kategori: 'PENTING' 
      });
    } catch (err) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'mail_agenda');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (confirm("Hapus catatan agenda ini?")) {
      try {
        await deleteDoc(doc(db, 'mail_agenda', uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `mail_agenda/${uid}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl gap-1">
          {[
            { label: 'Semua Agenda', value: 'ALL' },
            { label: 'Surat Masuk', value: 'IN' },
            { label: 'Surat Keluar', value: 'OUT' },
          ].map(t => (
            <button 
              key={t.value}
              onClick={() => setActiveType(t.value as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeType === t.value ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xl" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
             <input 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Cari perihal/nomor..."
               className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 text-xs font-bold"
             />
          </div>
          <button 
            onClick={() => { setIsEditing(false); setIsModalOpen(true); }}
            className="h-12 px-6 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Catat Surat</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tgl / No. Surat</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Perihal / Kategori</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pengirim / Penerima</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={4} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-200" /></td></tr>
            ) : filteredMails.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase">Belum ada agenda tercatat</td></tr>
            ) : filteredMails.map((mail) => (
              <tr key={mail.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      mail.type === 'IN' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {mail.type === 'IN' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{mail.tanggal}</p>
                       <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{mail.noSurat}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mail.perihal}</p>
                   <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-black text-slate-500 uppercase rounded-md tracking-widest">{mail.kategori}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400"><span className="uppercase">DARI:</span> {mail.pengirim}</p>
                    <p className="text-[10px] font-bold text-slate-400"><span className="uppercase">UNTUK:</span> {mail.penerima}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedMail(mail); setFormData(mail); setIsEditing(true); setIsModalOpen(true); }}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                      >
                         <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(mail.uid)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl overflow-hidden p-10">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-8">{isEditing ? 'Edit Agenda' : 'Catat Agenda Baru'}</h3>
                <form onSubmit={handleSave} className="space-y-5">
                   <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl">
                      <button type="button" onClick={() => setFormData({...formData, type: 'IN'})} className={cn("py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.type === 'IN' ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-400")}>Surat Masuk</button>
                      <button type="button" onClick={() => setFormData({...formData, type: 'OUT'})} className={cn("py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.type === 'OUT' ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-400")}>Surat Keluar</button>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Surat</label>
                         <input required value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perihal Surat</label>
                         <input required value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pengirim</label>
                            <input required value={formData.pengirim} onChange={e => setFormData({...formData, pengirim: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penerima</label>
                            <input required value={formData.penerima} onChange={e => setFormData({...formData, penerima: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold" />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                            <input type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                            <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 text-xs font-bold">
                               <option value="PENTING">PENTING</option>
                               <option value="BIASA">BIASA</option>
                               <option value="RAHASIA">RAHASIA</option>
                               <option value="UNDANGAN">UNDANGAN</option>
                            </select>
                         </div>
                      </div>
                   </div>

                   <button disabled={isSaving} className="w-full h-14 bg-blue-600 text-white rounded-[20px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Simpan Agenda
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
