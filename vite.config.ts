
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This bridges the build-time environment variable to the client-side code.
    // It replaces all instances of process.env.API_KEY in your source code with the actual value.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
