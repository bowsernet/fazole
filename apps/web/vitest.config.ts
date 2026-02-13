import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@/common': path.resolve(__dirname, '../../packages/common/src'),
      '@/config': path.resolve(__dirname, '../../packages/config/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
