import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  cacheDir: '.vite-cache',
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', 'react-split', '@monaco-editor/react'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false
  }
});
