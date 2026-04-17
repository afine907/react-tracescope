import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite Configuration for TraceScope
 * Supports both library build and demo development
 */
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  
  // Set root to project root for demo
  root: '.',
  
  // Build configuration (for library mode)
  build: command === 'build' ? {
    lib: {
      entry: path.resolve(__dirname, 'src/adapters/react/index.ts'),
      name: 'TraceScope',
      fileName: (format) => `tracescope.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'marked', 'highlight.js', '@tanstack/react-virtual', 'dompurify'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          marked: 'marked',
          'highlight.js': 'hljs',
          '@tanstack/react-virtual': 'useVirtualizer',
          dompurify: 'DOMPurify',
        },
      },
    },
  } : undefined,
  
  // Resolve configuration
  resolve: {
    alias: {
      '@tracescope': path.resolve(__dirname, 'src'),
    },
  },
  
  // Server configuration for demo
  server: {
    port: 5173,
    proxy: {
      '/stream': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  
  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
}));