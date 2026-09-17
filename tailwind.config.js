/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './script.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Kanit', 'sans-serif'] },
      boxShadow: {
        float: '0 6px 24px -8px rgba(15, 23, 42, 0.12)',
        'float-lg': '0 12px 32px -10px rgba(15, 23, 42, 0.25)'
      }
    }
  },
  plugins: []
};
