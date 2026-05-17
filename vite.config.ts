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
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true
        },
        manifestFilename: 'manifest.json',
        manifest: {
          id: 'com.smapna.hub.app.v1',
          name: 'E-SMAPNA',
          short_name: 'SMAPNA',
          description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: '/icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Beranda Aplikasi E-SMAPNA'
            }
          ],
          shortcuts: [
            {
              name: 'E-SMAPNA',
              short_name: 'Sistem Informasi Sekolah Terpadu SMAPNA',
              description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
              url: '/',
              icons: [{ src: '/icon.png', sizes: '192x192' }]
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
