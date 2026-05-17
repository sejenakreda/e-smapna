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
        manifest: {
          id: 'com.smapna.hub.v1',
          name: 'E-SMAPNA HUB',
          short_name: 'SMAPNA',
          description: 'Sistem Informasi Sekolah Terpadu SMAPNA',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_balance/gradient_1000/2x/outline_account_balance_white_48dp.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_balance/gradient_1000/2x/outline_account_balance_white_48dp.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_balance/gradient_1000/2x/outline_account_balance_white_48dp.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_balance/gradient_1000/2x/outline_account_balance_white_48dp.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Beranda Aplikasi E-SMAPNA'
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
