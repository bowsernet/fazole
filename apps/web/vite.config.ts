import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  server: { port: 5040, allowedHosts: ['fazole.l'] },
  plugins: [react()],
  resolve: {
    alias: {
      '@/common': path.resolve(__dirname, '../../packages/common/src'),
      '@/config': path.resolve(__dirname, '../../packages/config/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
