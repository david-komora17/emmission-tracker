import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  return defineConfig({
    plugins: [react(), tailwindcss()],
    base: '/',  // Changed from '/static/' to '/'
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsDir: 'assets',
      // Add chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Better code splitting to reduce chunk sizes
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'map-vendor': ['maplibre-gl', '@turf/turf'],
            'ui-vendor': ['lucide-react', 'react-hot-toast']
          }
        }
      }
    },
  })
}