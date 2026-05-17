import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  File, 
  Plus, 
  Search, 
  ChevronRight, 
  MoreVertical, 
  Download, 
  Trash2, 
  Upload,
  FolderPlus,
  ArrowLeft,
  Filter,
  FileText,
  Image as ImageIcon,
  FileArchive,
  MoreHorizontal,
  Loader2,
  X,
  User,
  History,
  Link as LinkIcon,
  Save,
  Pencil
} from 'lucide-react';
import { ModulePage, ModuleSearch } from './ModuleLayout';
import { useConfig } from '../context/ConfigContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ArchiveItem, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ArchivePortalProps {
  initialGtkId?: string;
  isStandalone?: boolean;
}

export const ArchivePortal: React.FC<ArchivePortalProps> = ({ initialGtkId, isStandalone = true }) => {
  const { profile } = useConfig();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  
  const [activeCategory, setActiveCategory] = useState<string | 'ALL'>('ALL');
  const [activeGtkFilter, setActiveGtkFilter] = useState<string | null>(null);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ArchiveItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [modalType, setModalType] = useState<'FOLDER' | 'FILE'>('FOLDER');
  const [gtkList, setGtkList] = useState<UserProfile[]>([]);
  
  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gtkId: initialGtkId || '',
    category: 'GTK' as ArchiveItem['category'],
    url: ''
  });

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'archives'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as ArchiveItem[];
      setItems(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'archives');
    });

    // Fetch GTK list for assignment
    const gtkQ = query(collection(db, 'users'));
    onSnapshot(gtkQ, (snapshot) => {
      setGtkList(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as UserProfile[]);
    });

    return () => unsubscribe();
  }, []);

  const currentItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = activeGtkFilter ? true : (item.parentId === currentFolderId);
      const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
      const matchesGtk = !activeGtkFilter || item.gtkId === activeGtkFilter;
      
      return matchesSearch && matchesFolder && matchesCategory && matchesGtk;
    });
  }, [items, searchTerm, currentFolderId, activeCategory, activeGtkFilter]);

  const handleNavigate = (folder: ArchiveItem | null) => {
    if (!folder) {
      setCurrentFolderId(null);
      setFolderPath([{id: null, name: 'Root'}]);
    } else {
      setCurrentFolderId(folder.uid);
      setFolderPath(prev => [...prev, {id: folder.uid, name: folder.name}]);
    }
  };

  const handleBack = () => {
    if (folderPath.length > 1) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length === 0) return;

    try {
      setLoading(true);
      for (const file of files) {
        // Simulating upload - In real app use firebase storage
        // We use a blob URL to simulate immediate availability
        const simulatedUrl = URL.createObjectURL(file);
        
        const docRef = doc(collection(db, 'archives'));
        const itemData: any = {
          uid: docRef.id,
          name: file.name,
          type: 'file',
          category: 'LAINNYA',
          mimeType: file.type,
          size: file.size,
          url: simulatedUrl,
          parentId: currentFolderId,
          createdAt: serverTimestamp(),
          createdBy: profile?.name || 'System',
          gtkId: initialGtkId || null
        };

        // Automatic synchronization logic for SK
        if (file.name.toUpperCase().includes('SK') || file.name.toUpperCase().includes('PANGKAT')) {
          itemData.category = 'SK';
        }

        await setDoc(docRef, itemData);

        await addDoc(collection(db, 'audit_logs'), {
          type: 'ARCHIVE',
          action: 'CREATE',
          message: `Otomatis Unggah: ${file.name} (Kategori: ${itemData.category})`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });

        // If it's an SK and assigned to GTK, log a special synchronisation event
        if (itemData.category === 'SK' && itemData.gtkId) {
          await addDoc(collection(db, 'audit_logs'), {
            type: 'GTK',
            action: 'SYNC_ARCHIVE',
            message: `Arsip SK Baru tertaut ke profil: ${file.name}`,
            user: 'SYSTEM_SYNC',
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'archives');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setIsSaving(true);
      
      const itemData: any = {
        name: formData.name,
        description: formData.description,
        type: modalType === 'FOLDER' ? 'folder' : 'file',
        parentId: currentFolderId,
        category: formData.category,
        url: modalType === 'FOLDER' ? '' : formData.url,
        updatedAt: serverTimestamp(),
      };

      if (formData.gtkId && modalType === 'FILE') {
        itemData.gtkId = formData.gtkId;
      }

      if (isEditing && selectedItem) {
        await setDoc(doc(db, 'archives', selectedItem.uid), { ...itemData }, { merge: true });
        await addDoc(collection(db, 'audit_logs'), {
          type: 'ARCHIVE',
          action: 'UPDATE',
          message: `Update arsip: ${formData.name}`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      } else {
        const docRef = doc(collection(db, 'archives'));
        await setDoc(docRef, { 
          ...itemData, 
          uid: docRef.id,
          createdAt: serverTimestamp(),
          createdBy: profile?.name || 'System'
        });
        
        // Sync logic for manual create too
        if (itemData.category === 'SK' && itemData.gtkId) {
          await addDoc(collection(db, 'audit_logs'), {
            type: 'GTK',
            action: 'SYNC_ARCHIVE',
            message: `Arsip SK Baru tertaut ke profil via input manual: ${formData.name}`,
            user: 'SYSTEM_SYNC',
            timestamp: serverTimestamp()
          });
        }

        await addDoc(collection(db, 'audit_logs'), {
          type: 'ARCHIVE',
          action: 'CREATE',
          message: `Arsip baru: ${formData.name} (${itemData.type})`,
          user: profile?.name || 'Operator',
          timestamp: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({ name: '', description: '', gtkId: initialGtkId || '', category: 'GTK', url: '' });
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'archives');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: ArchiveItem) => {
    setSelectedItem(item);
    setIsEditing(true);
    setModalType(item.type === 'folder' ? 'FOLDER' : 'FILE');
    setFormData({
      name: item.name,
      description: item.description || '',
      gtkId: item.gtkId || '',
      category: item.category || 'GTK',
      url: item.url || ''
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = (item: ArchiveItem) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Tautan berhasil disalin ke clipboard!");
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsDeleting(true);
      
      const itemName = selectedItem.name;
      // Recursive delete logic
      const deleteRecursive = async (itemId: string, itemType: string) => {
        if (itemType === 'folder') {
          const children = items.filter(i => i.parentId === itemId);
          for (const child of children) {
            await deleteRecursive(child.uid, child.type);
          }
        }
        await deleteDoc(doc(db, 'archives', itemId));
      };

      await deleteRecursive(selectedItem.uid, selectedItem.type);
      
      await addDoc(collection(db, 'audit_logs'), {
        type: 'ARCHIVE',
        action: 'DELETE',
        message: `Hapus arsip/folder: ${itemName}`,
        user: profile?.name || 'Operator',
        timestamp: serverTimestamp()
      });

      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `archives/${selectedItem.uid}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreview = (item: ArchiveItem) => {
    if (item.type === 'file') {
      setPreviewItem(item);
      setIsPreviewOpen(true);
    }
  };

  const getFileIcon = (mime?: string) => {
    if (mime?.includes('image')) return <ImageIcon size={20} />;
    if (mime?.includes('pdf') || mime?.includes('document')) return <FileText size={20} />;
    if (mime?.includes('zip') || mime?.includes('rar')) return <FileArchive size={20} />;
    return <File size={20} />;
  };

  const content = (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleFileDrop}
      className={cn("space-y-6 relative", isDragging && "bg-blue-50/50 dark:bg-blue-900/10 rounded-[40px] p-4")}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center border-4 border-dashed border-blue-500 rounded-[40px] pointer-events-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 border border-slate-100 dark:border-slate-700">
             <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center animate-bounce shadow-xl shadow-blue-500/20">
                <Download size={40} />
             </div>
             <p className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Lepas untuk Unggah</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Simulasi Cloud Storage</p>
          </div>
        </div>
      )}

      {/* breadcrumbs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {folderPath.map((path, i) => (
          <React.Fragment key={path.id || 'root'}>
            {i > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
            <button 
              onClick={() => {
                const index = folderPath.findIndex(p => p.id === path.id);
                const newPath = folderPath.slice(0, index + 1);
                setFolderPath(newPath);
                setCurrentFolderId(path.id);
              }}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-4 h-10 rounded-xl transition-all flex items-center justify-center",
                path.id === currentFolderId 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" 
                  : "bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              {path.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md group">
            <ModuleSearch 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder="Cari file atau folder..."
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => { setModalType('FOLDER'); setIsModalOpen(true); }}
              className="flex-1 md:flex-none h-12 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 soft-shadow flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-all"
            >
              <FolderPlus size={18} />
              <span>Folder</span>
            </button>
            <button 
              onClick={() => { setModalType('FILE'); setIsModalOpen(true); }}
              className="flex-1 md:flex-none h-12 px-6 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Upload size={18} />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {activeGtkFilter && (
            <button 
              onClick={() => setActiveGtkFilter(null)}
              className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-2"
            >
              <X size={14} />
              <span>GTK Filter: {gtkList.find(g => g.uid === activeGtkFilter)?.name}</span>
            </button>
          )}
          {['ALL', 'GTK', 'SK', 'SISWA', 'KEUANGAN', 'LAINNYA'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105" 
                  : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 hover:text-slate-600"
              )}
            >
              {cat === 'ALL' ? 'Semua' : cat === 'SK' ? 'SK / Legalitas' : cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-slate-200 mb-4" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Arsip...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
             {searchTerm ? <Search size={32} /> : (activeCategory !== 'ALL' ? <Filter size={32} /> : <Folder size={32} />)}
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-8">
             {searchTerm 
               ? `Tidak ditemukan hasil untuk "${searchTerm}"` 
               : (activeCategory !== 'ALL' 
                   ? `Tidak ada item dengan kategori ${activeCategory}` 
                   : "Folder ini masih kosong"
                 )
             }
           </p>
           {(searchTerm || activeCategory !== 'ALL') && (
             <button 
               onClick={() => { setSearchTerm(''); setActiveCategory('ALL'); }}
               className="mt-4 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
             >
               Reset Filter
             </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {currentItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.uid}
                onClick={() => {
                  if (item.type === 'folder') {
                    handleNavigate(item);
                  } else {
                    handlePreview(item);
                  }
                }}
                className={cn(
                  "p-5 rounded-[28px] border transition-all cursor-pointer group relative",
                  item.type === 'folder'
                    ? "bg-amber-50/50 dark:bg-amber-900/5 border-amber-100/50 dark:border-amber-900/20 hover:bg-amber-100/50 hover:shadow-xl"
                    : "bg-white dark:bg-slate-800/80 border-slate-50 dark:border-slate-700 hover:border-blue-200 hover:shadow-xl dark:hover:border-slate-600"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                    item.type === 'folder' 
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" 
                      : "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                  )}>
                    {item.type === 'folder' ? <Folder size={24} fill="currentColor" className="opacity-20" /> : getFileIcon(item.mimeType)}
                  </div>
                  
                  <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        e.preventDefault();
                        handleConfirmDelete(item); 
                      }}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {item.type === 'file' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handlePreview(item); }}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        title="Lihat Cepat"
                      >
                        <Search size={14} />
                      </button>
                    )}
                    {item.type === 'file' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(item.url || ''); }}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        title="Salin Tautan"
                      >
                        <LinkIcon size={14} />
                      </button>
                    )}
                    {item.type === 'file' && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                      item.type === 'folder' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {item.type === 'folder' ? 'Folder' : item.category}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.type === 'file' ? `${Math.round((item.size || 0) / 1024)} KB` : `${items.filter(i => i.parentId === item.uid).length} Items`}
                    </span>
                  </div>
                  
                  {item.gtkId && (
                     <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                           <User size={10} />
                        </div>
                        <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             setActiveGtkFilter(item.gtkId as string); 
                           }}
                           className="text-[8px] font-black uppercase text-slate-500 tracking-widest truncate hover:text-blue-600 transition-colors"
                        >
                           {gtkList.find(g => g.uid === item.gtkId)?.name || 'Unknown GTK'}
                        </button>
                     </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modern Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setIsEditing(false); setSelectedItem(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center",
                     modalType === 'FOLDER' ? "bg-amber-500" : "bg-blue-600"
                   )}>
                      {modalType === 'FOLDER' ? <FolderPlus size={24} /> : <Upload size={24} />}
                   </div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">
                        {isEditing ? 'Edit ' : (modalType === 'FOLDER' ? 'Buat ' : 'Unggah ')}
                        {modalType === 'FOLDER' ? 'Folder' : 'Dokumen'}
                      </h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Lokasi: {folderPath[folderPath.length - 1].name}</p>
                   </div>
                </div>
                <button 
                  onClick={() => { setIsModalOpen(false); setIsEditing(false); setSelectedItem(null); }}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama {modalType === 'FOLDER' ? 'Folder' : 'File'}</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Contoh: SK Pengangkatan 2024"
                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                    />
                  </div>

                  <div className={cn("grid gap-4", modalType === 'FILE' ? "grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                      >
                        <option value="GTK">GTK</option>
                        <option value="SK">SK / Legitas</option>
                        <option value="SISWA">Siswa</option>
                        <option value="KEUANGAN">Keuangan</option>
                        <option value="LAINNYA">Lainnya</option>
                      </select>
                    </div>
                    {modalType === 'FILE' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hubungkan ke GTK (Opsional)</label>
                        <select 
                          value={formData.gtkId}
                          onChange={e => setFormData({...formData, gtkId: e.target.value})}
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        >
                          <option value="">- Pilih GTK -</option>
                          {gtkList.map(g => (
                            <option key={g.uid} value={g.uid}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {modalType === 'FILE' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL File / Storage Link</label>
                      <div className="relative">
                        <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          required
                          value={formData.url}
                          onChange={e => setFormData({...formData, url: e.target.value})}
                          placeholder="https://storage.google.com/..."
                          className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl pl-12 pr-4 text-sm font-bold border border-slate-100 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Tambahan</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Opsional..."
                      className="w-full h-32 bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-sm font-bold border border-slate-100 dark:border-slate-700 resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsDeleteModalOpen(false); setSelectedItem(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                Hapus {selectedItem?.type === 'folder' ? 'Folder' : 'Item'}?
              </h3>
              <p className="text-slate-500 text-sm mb-8">
                {selectedItem?.type === 'folder' 
                  ? `Menghapus folder "${selectedItem?.name}" juga akan menghapus semua file di dalamnya secara permanen.`
                  : `Apakah Anda yakin ingin menghapus "${selectedItem?.name}"?`
                }
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => { setIsDeleteModalOpen(false); setSelectedItem(null); }}
                   className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200 transition-all"
                 >
                    Batal
                 </button>
                 <button 
                   disabled={isDeleting}
                   onClick={handleDelete}
                   className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Ya, Hapus
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Look / Preview Modal */}
        {isPreviewOpen && previewItem && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsPreviewOpen(false); setPreviewItem(null); }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    {getFileIcon(previewItem.mimeType)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm uppercase tracking-tight">{previewItem.name}</h4>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest">{previewItem.category} • {Math.round((previewItem.size || 0) / 1024)} KB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={previewItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <Download size={16} />
                    Unduh
                  </a>
                  <button 
                    onClick={() => { setIsPreviewOpen(false); setPreviewItem(null); }}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 relative overflow-hidden">
                {previewItem.url && (
                  (() => {
                    const url = previewItem.url.toLowerCase();
                    const name = previewItem.name.toLowerCase();
                    const isImg = url.match(/\.(jpg|jpeg|png|gif|webp)$/) || name.match(/\.(jpg|jpeg|png|gif|webp)$/) || previewItem.mimeType?.includes('image');
                    const isPdf = url.match(/\.pdf$/) || name.match(/\.pdf$/) || previewItem.mimeType?.includes('pdf');
                    
                    if (isImg) {
                      return (
                        <div className="w-full h-full flex items-center justify-center p-4">
                           <img 
                            src={previewItem.url} 
                            alt={previewItem.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                          />
                        </div>
                      );
                    }
                    
                    if (isPdf) {
                      return (
                        <iframe 
                          src={`${previewItem.url}#toolbar=0`}
                          className="w-full h-full border-none"
                          title={previewItem.name}
                        />
                      );
                    }

                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[32px] flex items-center justify-center text-slate-400 mb-6">
                           <FileText size={48} />
                        </div>
                        <h5 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-2">Pratinjau Tidak Tersedia</h5>
                        <p className="text-slate-400 text-sm max-w-sm">Format file ini belum didukung untuk Quick Look. Silakan unduh file untuk melihat konten lengkapnya.</p>
                        <a 
                          href={previewItem.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-8 px-8 h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Download size={16} />
                          Unduh File Sekarang
                        </a>
                      </div>
                    );
                  })()
                )}
                {!previewItem.url && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <p className="text-[10px] font-black uppercase tracking-widest">Tautan file tidak tersedia</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return isStandalone ? (
    <ModulePage 
      title="Portal Kearsipan" 
      subtitle="Arsip & Dokumentasi Sekolah" 
      icon={<FileArchive size={28} />} 
      color="bg-slate-900"
    >
      {content}
    </ModulePage>
  ) : content;
};
