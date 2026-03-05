import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'pGallery',
                short_name: 'pGallery',
                description: 'No nonsense pCloud Media Browser',
                theme_color: '#000000',
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
            // US region pCloud API
            '/pcloud-us': {
                target: 'https://api.pcloud.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/pcloud-us/, '')
            },
            // EU region pCloud API
            '/pcloud-eu': {
                target: 'https://eapi.pcloud.com',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/pcloud-eu/, '')
            }
        }
    }
})

