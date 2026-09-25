/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          dark: "#4338CA",
          light: "#EEF2FF",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
        },
      },
      borderRadius: {
        card: "12px",
        control: "8px",
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        title: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        section: ["16px", { lineHeight: "24px", fontWeight: "600" }],
      },
    },
  },
};