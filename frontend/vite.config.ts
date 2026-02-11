import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-markdown': ['react-markdown', 'react-syntax-highlighter'],
          'vendor-mermaid': ['mermaid'],
        },
      },
    },
  },
})
