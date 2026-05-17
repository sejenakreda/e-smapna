import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB limit
        },
        manifest: {
          id: 'com.smapna.hub',
          start_url: '/',
          name: 'E-SMAPNA HUB',
          short_name: 'SMAPNA',
          description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'https://sekolah.data.kemdikbud.go.id/index.php/chome/get_foto_sekolah/SMAS%20PGRI%20NARINGGUL/30',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://sekolah.data.kemdikbud.go.id/index.php/chome/get_foto_sekolah/SMAS%20PGRI%20NARINGGUL/30',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://sekolah.data.kemdikbud.go.id/index.php/chome/get_foto_sekolah/SMAS%20PGRI%20NARINGGUL/30',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
