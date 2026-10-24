/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forensic: {
          950: '#070a0f',
          900: '#0b0f19',
          850: '#101726',
          800: '#161f33',
          750: '#1b2740',
          700: '#233252',
          600: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          cyan: '#38bdf8',
          accent: '#0284c7',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          purple: '#a855f7'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
