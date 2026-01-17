/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'renewable-green': '#16a085',
        'renewable-blue': '#3498db',
        'renewable-orange': '#f39c12',
      }
    },
  },
  plugins: [],
}