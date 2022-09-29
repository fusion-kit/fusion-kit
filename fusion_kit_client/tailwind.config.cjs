/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: ({ theme }) => (
        Object.fromEntries(Object.entries(theme("spacing")).map(([key, value]) => (
          [`repeat-fit-${key}`, `repeat(auto-fit, ${value})`]
        )))
      ),
      backgroundImage: {
        "candystripes": "linear-gradient(-45deg, var(--tw-gradient-from) 25%, var(--tw-gradient-to) 25%, var(--tw-gradient-to) 50%, var(--tw-gradient-from) 50%, var(--tw-gradient-from) 75%, var(--tw-gradient-to) 75%, var(--tw-gradient-to))"
      },
      backgroundSize: {
        "50": "50px 50px",
      },
      keyframes: {
        "slide-background-xy-50": {
          "0%": { "background-position": "0 0" },
          "100%": { "background-position": "50px 50px" },
        }
      },
      animation: {
        "slide-background-xy-50": "slide-background-xy-50 3s linear infinite",
      },
      transitionProperty: {
        "width": "width",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}
