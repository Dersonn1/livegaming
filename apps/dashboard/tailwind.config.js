/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "#111318",
        panel: "#181b22",
        border: "#262a33",
        accent: "#6366f1",
        good: "#22c55e",
        bad: "#ef4444",
        warn: "#f59e0b",
      },
    },
  },
  plugins: [],
};
