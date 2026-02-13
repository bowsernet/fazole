import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/common': path.resolve(__dirname, '../../packages/common/src'),
      '@/config': path.resolve(__dirname, '../../packages/config/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
