import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react-window', 'react-virtualized-auto-sizer'],
  },
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
