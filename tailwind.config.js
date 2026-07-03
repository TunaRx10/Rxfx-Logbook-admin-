/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          dark: '#050505',
          card: '#0A0A0A',
          border: '#1A1A1A',
          cyan: '#00F0FF',
          silver: '#A0A0A0',
        }
      },
    },
  },
  plugins: [],
}
