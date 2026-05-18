/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        d: {
          bg:     "rgb(var(--d-bg) / <alpha-value>)",
          panel:  "rgb(var(--d-panel) / <alpha-value>)",
          panel2: "rgb(var(--d-panel2) / <alpha-value>)",
          panel3: "rgb(var(--d-panel3) / <alpha-value>)",
          fg:     "rgb(var(--d-fg) / <alpha-value>)",
          fg2:    "rgb(var(--d-fg2) / <alpha-value>)",
          fg3:    "rgb(var(--d-fg3) / <alpha-value>)",
          fg4:    "rgb(var(--d-fg4) / <alpha-value>)",
          pink:   "rgb(var(--d-pink) / <alpha-value>)",
          cyan:   "rgb(var(--d-cyan) / <alpha-value>)",
          blue:   "rgb(var(--d-blue) / <alpha-value>)",
          orange: "rgb(var(--d-orange) / <alpha-value>)",
          green:  "rgb(var(--d-green) / <alpha-value>)",
        },
      },
      fontFamily: {
        sora:  ["'Sora'", "Arial", "sans-serif"],
        dm:    ["'DM Sans'", "Arial", "sans-serif"],
        mono:  ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
