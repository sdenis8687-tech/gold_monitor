/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          card: '#1a1d27',
          border: '#2a2d3a',
        },
        gold: {
          DEFAULT: '#f5c842',
          dim: '#b89b2a',
        },
        usd: {
          DEFAULT: '#4fa8e8',
          dim: '#3580c0',
        },
        stale: '#f59e0b',
      },
    },
  },
  plugins: [],
};
