import React, { useState, useEffect } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Browser detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setPlatform('ios');
      // Show prompt after 3 seconds for iOS
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    } else if (isAndroid) {
      setPlatform('android');
      
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-6 right-6 z-[9999] flex justify-center pointer-events-none"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[32px] soft-shadow p-6 border border-slate-100 dark:border-slate-800 pointer-events-auto max-w-md w-full relative">
          <button 
            onClick={() => setShowPrompt(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
              <Smartphone size={24} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                Instal Aplikasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Instal E-SMAPNA di layar beranda untuk akses lebih cepat dan fitur lengkap.
              </p>

              {platform === 'ios' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    <div className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center soft-shadow">
                      <Share size={12} className="text-blue-600" />
                    </div>
                    <span>1. Ketuk tombol 'Share' atau 'Bagikan'</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    <div className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center soft-shadow">
                      <PlusSquare size={12} className="text-blue-600" />
                    </div>
                    <span>2. Pilih 'Tambah ke Layar Utama'</span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Instal Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
