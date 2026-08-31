/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2B39",
        ink2: "#2E4155",
        paper: "#F6F5F1",
        brass: "#AD8A4E",
        brassdark: "#7C5F31",
        sage: "#4C7A5D",
        rust: "#B45B4C",
        slateline: "#5B7189",
        line: "#E3E0D6",
      },
    },
  },
  plugins: [],
};
