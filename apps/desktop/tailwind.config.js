/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("../../packages/config/tailwind.preset.js")],
  content: [
    "./src/renderer/**/*.{ts,tsx,html}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};