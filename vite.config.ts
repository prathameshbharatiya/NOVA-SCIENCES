import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // API_KEY is handled by the execution context environment
  },
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});