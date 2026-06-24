/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        arabic: ["Noto Kufi Arabic", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        brand: {
          navy: "#0F172A",
          gold: "#C9A227",
          blue: "#2563EB",
        },
        grade: {
          exceptional: "#16A34A",
          excellent: "#2563EB",
          good: "#D97706",
          fair: "#EA580C",
          poor: "#DC2626",
        },
      },
    },
  },
  plugins: [],
};
