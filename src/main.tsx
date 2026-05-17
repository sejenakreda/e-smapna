import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      if (confirm('Aplikasi versi baru tersedia. Refresh sekarang?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('Aplikasi siap digunakan offline');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
