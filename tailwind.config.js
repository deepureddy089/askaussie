/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // custom slim font
        sans: ['"Saira Condensed"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:   '#0f0f0f',
        paper: '#f7f7f7',
      },
    },
  },
  plugins: [],
};
