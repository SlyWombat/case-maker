import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';

const DEFAULT_PORT = Number(process.env.CASEMAKER_PORT ?? 8000);

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('manifold-3d')) return 'vendor-manifold';
            if (id.includes('@react-three/drei')) return 'vendor-drei';
            if (id.includes('@react-three/fiber')) return 'vendor-r3f';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react/')) return 'vendor-react';
            if (id.includes('zustand') || id.includes('zundo') || id.includes('immer')) return 'vendor-state';
            if (id.includes('zod')) return 'vendor-zod';
          }
        },
      },
    },
  },
  server: { fs: { allow: ['..'] }, port: DEFAULT_PORT, strictPort: false },
  preview: { port: DEFAULT_PORT, strictPort: false },
});
