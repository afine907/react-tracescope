/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Primary
        tracescope: {
          primary: '#6366f1',
          'primary-dark': '#4f46e5',
          text: '#1f2937',
          'text-light': '#6b7280',
          bg: '#ffffff',
          'bg-alt': '#f9fafb',
          border: '#e5e7eb',
        },
        // Node type colors - User Input
        'node-user': {
          bg: '#f3f4f6',
          border: '#9ca3af',
          label: '#6b7280',
        },
        // Node type colors - Thought
        'node-thought': {
          bg: '#faf5ff',
          border: '#a855f7',
          label: '#a855f7',
        },
        // Node type colors - Tool
        'node-tool': {
          bg: '#eff6ff',
          border: '#3b82f6',
          label: '#3b82f6',
        },
        // Node type colors - Code
        'node-code': {
          bg: '#faf5ff',
          border: '#a855f7',
          label: '#a855f7',
        },
        // Node type colors - Result
        'node-result': {
          bg: '#f0fdf4',
          border: '#22c55e',
          label: '#22c55e',
        },
        // Node type colors - Output
        'node-output': {
          bg: '#ffffff',
          border: '#7c3aed',
          label: '#7c3aed',
        },
        // Node type colors - Error
        'node-error': {
          bg: '#fef2f2',
          border: '#ef4444',
          label: '#ef4444',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
      },
      transitionDuration: {
        'fast': '150ms',
      },
      animation: {
        'pulse-slow': 'pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
