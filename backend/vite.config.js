import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5174,
        strictPort: true,
        origin: 'http://localhost:5174',
        hmr: {
            host: 'localhost',
            protocol: 'ws',
            port: 5174,
            clientPort: 5174,
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
