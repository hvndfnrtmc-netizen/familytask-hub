/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#F97316', light: '#FED7AA', dark: '#C2410C' },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7', dark: '#15803D' },
      },
    },
  },
  plugins: [],
}
