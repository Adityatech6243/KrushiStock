/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      boxShadow: {
        'soft': '0 2px 12px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'soft-md': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 4px 8px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 30px -4px rgba(0, 0, 0, 0.06), 0 6px 16px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
