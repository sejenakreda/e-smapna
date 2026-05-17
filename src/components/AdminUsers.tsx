import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserRole, UserProfile } from '../types';
import { 
  Search, 
  Shield, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  Mail, 
  Fingerprint, 
  Users, 
  User as UserIcon, 
  ShieldCheck, 
  ArrowLeft,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  UserCog,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ModulePage, ModuleSearch, ModuleCard } from './ModuleLayout';

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrator', color: 'bg-blue-600' },
  { value: 'kepsek', label: 'Kepala Sekolah', color: 'bg-purple-600' },
  { value: 'waka_kurikulum', label: 'Waka Kurikulum', color: 'bg-indigo-600' },
  { value: 'waka_kesiswaan', label: 'Waka Kesiswaan', color: 'bg-rose-600' },
  { value: 'waka_sarpras', label: 'Waka Sarpras', color: 'bg-teal-600' },
  { value: 'waka_humas', label: 'Waka Humas', color: 'bg-amber-600' },
  { value: 'teacher', label: 'Guru / PTK', color: 'bg-emerald-600' },
  { value: 'student', label: 'Siswa', color: 'bg-indigo-600' },
  { value: 'parent', label: 'Orang Tua', color: 'bg-pink-600' },
  { value: 'staff_tu', label: 'Staf TU', color: 'bg-slate-600' },
  { value: 'kepala_tu', label: 'Kepala TU', color: 'bg-slate-800' },
  { value: 'bendahara', label: 'Bendahara', color: 'bg-emerald-500' },
  { value: 'operator', label: 'Operator', color: 'bg-orange-600' },
  { value: 'bk', label: 'Guru BK', color: 'bg-cyan-600' },
  { value: 'pembina', label: 'Pembina OSIS/Ekskul', color: 'bg-violet-600' },
];

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'gtk' | 'siswa'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: ['student'] as UserRole[],
  });
  const [error, setError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

    const handleSyncToAuth = async () => {
        if (!window.confirm("Sinkronkan semua user di database ke sistem Authentikasi Firebase? Ini akan membuat akun login untuk user yang belum memilikinya.")) return;
        
        setIsSyncing(true);
        setSyncProgress("Menghubungkan ke server...");
        try {
            const response = await fetch('/api/admin/sync-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users })
            });
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Non-JSON response from sync-users:", text);
                throw new Error("Server mengembalikan respon tidak valid (bukan JSON). Pastikan Service Account sudah benar.");
            }

            const results = await response.json();
            
            if (!response.ok) {
                throw new Error(results.error || "Gagal sinkronisasi");
            }

            const created = results.filter((r: any) => r.status === 'created').length;
            const existing = results.filter((r: any) => r.status === 'exists').length;
            const errors = results.filter((r: any) => r.status === 'error');

            let message = `Sinkronisasi Selesai!\n\n- Akun Baru: ${created}\n- Sudah Ada: ${existing}`;
            if (errors.length > 0) {
                message += `\n- Gagal: ${errors.length}\n\nDetail Error pertama: ${errors[0].message}`;
            }
            
            alert(message);
            
            if (created > 0) {
                fetchUsers();
            }
        } catch (err: any) {
            console.error("Sync UI Error:", err);
            alert("Kesalahan Sinkronisasi: " + err.message);
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'users'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const userData = doc.data();
        const roles = userData.roles || (userData.role ? [userData.role] : ['student']);
        return { ...userData, uid: doc.id, roles } as UserProfile;
      });
      setUsers(data);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userEmail = formData.email.includes('@') ? formData.email : `${formData.email}@e-smapna.sch.id`;
      
      const payload = {
        name: formData.name,
        email: userEmail,
        roles: formData.roles,
        updatedAt: new Date().toISOString()
      };

      if (editingUser) {
        try {
          await updateDoc(doc(db, 'users', editingUser.uid), payload);
          
          // Optionally sync to Auth if email changed
          if (editingUser.email !== userEmail) {
             console.log("Email changed, suggesting sync...");
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.uid}`);
        }
      } else {
        // Create in Firebase Auth via Backend API
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            password: 'smapna123',
            displayName: formData.name,
            roles: formData.roles
          })
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response from create-user:", text);
            throw new Error("Server mengembalikan respon tidak valid (HTML). Cek log server.");
        }

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || "Gagal membuat akun di Firebase Auth");
        }

        const uid = resData.uid;
        
        try {
          await setDoc(doc(db, 'users', uid), {
            ...payload,
            uid,
            email: userEmail,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }
      fetchUsers();
      closeModal();
    } catch (err: any) {
      console.error("Save User Error:", err);
      let errorMessage = err?.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {}
      alert(`Gagal menyimpan data: ${errorMessage}`);
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setIsDeleting(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
  };

  const openModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name, 
        email: user.email, 
        roles: user.roles || ['student'] 
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', roles: ['student'] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const toggleRole = (role: UserRole) => {
    setFormData(prev => {
      const isSelected = prev.roles.includes(role);
      const newRoles = isSelected 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      
      // Don't allow empty roles
      if (newRoles.length === 0) return prev;
      
      return { ...prev, roles: newRoles };
    });
  };

  const handleSyncSingleUser = async (user: UserProfile) => {
    setIsSyncing(true);
    setSyncProgress(`Sinkronisasi ${user.name}...`);
    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [user] })
      });
      const results = await response.json();
      if (results[0]?.status === 'error') {
        alert("Gagal: " + results[0].message);
      } else {
        alert(`Berhasil sinkronisasi ${user.name}! Sekarang bisa login.`);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'gtk') {
      return u.roles?.some(r => ['teacher', 'kepsek', 'staff_tu', 'kepala_tu', 'bendahara', 'operator', 'bk', 'pembina', 'waka_kurikulum', 'waka_kesiswaan', 'waka_sarpras', 'waka_humas', 'guru'].includes(r));
    }
    if (filterTab === 'siswa') {
      return u.roles?.includes('student') || u.roles?.includes('parent');
    }
    
    return true;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.roles?.includes('admin')).length,
    teachers: users.filter(u => u.roles?.some(r => ['teacher', 'kepsek', 'wakasek'].includes(r))).length,
    students: users.filter(u => u.roles?.includes('student')).length,
  };

  return (
    <ModulePage 
      title="Manajemen Pengguna" 
      subtitle="Hak Akses & Role" 
      icon={<UserCog size={28} />} 
      color="bg-blue-600"
      actions={
        <div className="flex gap-2">
          <button 
            onClick={handleSyncToAuth}
            disabled={isSyncing || loading}
            title="Sinkronkan Semua ke Auth"
            className="h-12 px-6 bg-amber-500 rounded-2xl flex items-center gap-3 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sinkronkan Login"}
          </button>
          <button 
            onClick={() => openModal()}
            className="w-12 h-12 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white active:scale-90 transition-all"
          >
            <UserPlus size={24} />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4 mb-8">
        <ModuleCard 
          title="Total User" 
          value={stats.total} 
          label="Akun Terdaftar" 
          icon={<Users size={20} />} 
          color="bg-slate-800" 
        />
        <ModuleCard 
          title="Privilege" 
          value={stats.admins} 
          label="Administrator" 
          icon={<Shield size={20} />} 
          color="bg-blue-600" 
        />
      </div>

      <ModuleSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Cari nama atau email..."
        extraFilters={
          <button className="w-14 h-14 glass dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400 soft-shadow border-white/20 dark:border-slate-700/50">
            <Filter size={20} />
          </button>
        }
      />

      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[24px] mb-8 border border-white/10">
        <button 
          onClick={() => setFilterTab('all')}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
            filterTab === 'all' ? "bg-white dark:bg-slate-800 text-blue-600 soft-shadow" : "text-slate-400"
          )}
        >
          Semua User
        </button>
        <button 
          onClick={() => setFilterTab('gtk')}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
            filterTab === 'gtk' ? "bg-white dark:bg-slate-800 text-blue-600 soft-shadow" : "text-slate-400"
          )}
        >
          User GTK
        </button>
        <button 
          onClick={() => setFilterTab('siswa')}
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
            filterTab === 'siswa' ? "bg-white dark:bg-slate-800 text-blue-600 soft-shadow" : "text-slate-400"
          )}
        >
          User Siswa
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-[32px] text-center border border-rose-100 dark:border-rose-800">
            <ShieldAlert size={32} className="text-rose-500 mx-auto mb-4" />
            <h3 className="font-black text-rose-800 dark:text-rose-400">Terjadi Kesalahan</h3>
            <p className="text-xs text-rose-500/70 mt-2">{error}</p>
            <button 
              onClick={fetchUsers}
              className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 p-12 rounded-[48px] text-center soft-shadow border border-slate-50 dark:border-slate-700">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-slate-200" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-white">Tidak Ada Data</h3>
            <p className="text-xs text-slate-400 mt-2">Coba gunakan kata kunci pencarian lain.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user, idx) => (
              <motion.div 
                key={user.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-800/80 p-5 rounded-[32px] soft-shadow border border-slate-50 dark:border-slate-700 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                    user.roles?.includes('admin') ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-400"
                  )}>
                    {user.roles?.includes('admin') ? <ShieldCheck size={28} /> : <UserIcon size={28} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 dark:text-white text-[14px] truncate">{user.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                       {user.roles?.map(role => (
                         <span key={role} className={cn(
                            "text-[7px] font-black uppercase px-2 py-0.5 rounded-md",
                            ROLES.find(r => r.value === role)?.color || "bg-slate-500",
                            "text-white shadow-sm"
                          )}>
                            {ROLES.find(r => r.value === role)?.label || role}
                          </span>
                       ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSyncSingleUser(user)}
                    title="Sinkronkan Login"
                    className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <RefreshCw size={16} className={isSyncing && syncProgress?.includes(user.name) ? "animate-spin" : ""} />
                  </button>
                  <button 
                    onClick={() => openModal(user)}
                    className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setIsDeleting(user.uid)}
                    className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-[40px] shadow-2xl relative overflow-hidden text-slate-900 dark:text-white"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
                  <button onClick={closeModal} className="text-slate-400 hover:text-rose-500">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl px-4 font-bold text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan nama..."
                    />
                  </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">User ID / Email</label>
                      <input 
                        type="text" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl px-4 font-bold text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="username atau email@smapna.sh.id"
                      />
                      {editingUser && (
                        <p className="text-[9px] text-amber-600 font-bold mt-2 uppercase tracking-tight">
                          * Mengubah email mungkin memerlukan sinkronisasi ulang agar user bisa login.
                        </p>
                      )}
                    </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Role / Hak Akses (Bisa Pilih Banyak)</label>
                    <div className="grid grid-cols-2 gap-2">
                       {ROLES.map(role => (
                         <button
                           key={role.value}
                           type="button"
                           onClick={() => toggleRole(role.value)}
                           className={cn(
                             "h-12 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                             formData.roles.includes(role.value) 
                               ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                               : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                           )}
                         >
                           {role.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full h-16 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-900/10 active:scale-95 transition-all mt-4"
                  >
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-8 rounded-[40px] max-w-sm w-full text-center relative z-10"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hapus Pengguna?</h3>
              <p className="text-slate-400 text-sm mb-8">Tindakan ini tidak dapat dibatalkan. Seluruh data profil akan hilang.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleting(null)}
                  className="flex-1 h-14 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleDelete(isDeleting)}
                  className="flex-1 h-14 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-rose-500/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};
