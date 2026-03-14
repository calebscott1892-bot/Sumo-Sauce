import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const srcRoot = path.resolve(__dirname, './src')
const reactRoot = path.resolve(__dirname, './node_modules/react')
const reactDomRoot = path.resolve(__dirname, './node_modules/react-dom')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Keep API calls same-origin in dev and proxy to backend.
      '/api': {
        target: 'http://127.0.0.1:8790',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router-dom')) {
            return 'vendor-react'
          }

          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query'
          }

          if (id.includes('recharts')) {
            return 'vendor-recharts'
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }

          if (id.includes('@radix-ui/')) {
            return 'vendor-radix'
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }

          if (id.includes('cmdk') || id.includes('sonner') || id.includes('vaul')) {
            return 'vendor-ui'
          }

          return undefined
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@', replacement: srcRoot },
      { find: 'react', replacement: reactRoot },
      { find: 'react-dom', replacement: reactDomRoot },
    ],
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 
