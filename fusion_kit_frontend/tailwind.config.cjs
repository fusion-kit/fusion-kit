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
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}
