import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
    root: resolve(__dirname, 'dev'),
    server: {
        open: true,
    },
    plugins: [tailwindcss()],
})
