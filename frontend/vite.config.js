import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  return defineConfig({
    plugins: [react(), tailwindcss()],
    base: '/',
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
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild', 
      target: 'es2022',
      // Remove rollupOptions.manualChunks entirely
    },  
    worker: {
      format: 'es', // Compiles the worker as an ES module
      plugins: () => []
    }
  })
}
