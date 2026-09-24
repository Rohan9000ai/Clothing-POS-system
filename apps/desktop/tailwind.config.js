/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          dark: "#4338CA",
        },
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};