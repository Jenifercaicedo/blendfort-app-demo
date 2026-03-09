/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blendfort-azul': '#003366',
        'blendfort-naranja': '#FF6600',
      }
    },
  },
  plugins: [],
}