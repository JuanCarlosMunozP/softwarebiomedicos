import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    // Proxy hacia Django: así el navegador solo habla con 127.0.0.1:5173
    // (un único origen) y nunca hace un request cross-origin real hacia
    // :8000. Esto es necesario porque el backend entrega el access/refresh
    // token como cookies httpOnly — con dos puertos distintos, algunos
    // navegadores (Edge con "Tracking Prevention", por ejemplo) bloquean
    // esas cookies aunque técnicamente sean "same-site". Reproduce en dev
    // el mismo esquema que ya usa producción (nginx sirviendo /api/ bajo el
    // mismo origen que el frontend — ver FrontEquiposBiometricos/.env.production).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
  // Declaramos explícitamente las dependencias a pre-bundlear para que el
  // dep-scan de Rolldown no tenga que crawlear todo el grafo de imports en
  // el primer arranque. Esto evita el aviso "Your build spent significant
  // time in plugin externalize-deps" y los errores
  // "The server is being restarted or closed. Request is outdated" que
  // aparecen cuando el scan se interrumpe.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'axios',
      'clsx',
      'lucide-react',
      'recharts',
    ],
  },
})
