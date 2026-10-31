/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentry: {
          bg: '#1A1325',
          sidebar: '#1B1124',
          panel: '#1E1531',
          input: '#241738',
          border: '#302345',
          accent: '#6C5FC7',
        },
      },
    },
  },
  plugins: [],
}
