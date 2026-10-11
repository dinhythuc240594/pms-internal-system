import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:5000' } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Gom nhóm thư viện cốt lõi
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            // Gom nhóm thư viện giao diện / biểu đồ nặng
            if (id.includes('recharts') || id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'ui';
            }
            // Các thư viện còn lại gom chung vào 1 file
            return 'modules';
          }
        }
      }
    }
  },
})
