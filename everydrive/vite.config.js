import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: {
                name: 'everyDrive',
                short_name: 'everyDrive',
                description: 'Elite Combined Cloud Media Browser',
                theme_color: '#0b0f1a',
                background_color: '#0b0f1a',
                display: 'standalone',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    server: {
        proxy: {
            '/pcloud-us': {
                target: 'https://api.pcloud.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/pcloud-us/, '')
            },
            '/pcloud-eu': {
                target: 'https://eapi.pcloud.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/pcloud-eu/, '')
            }
        }
    }
});
