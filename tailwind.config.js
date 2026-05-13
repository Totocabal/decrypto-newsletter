/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        d: {
          bg:     "#141416",
          panel:  "#1E1E22",
          panel2: "#26262B",
          panel3: "#2E2E34",
          fg:     "#F1F2F5",
          fg2:    "#C7CAD1",
          fg3:    "#8C8F98",
          fg4:    "#5E6168",
          pink:   "#FF00AA",
          cyan:   "#00FFFF",
          blue:   "#4141FF",
          orange: "#FF4B28",
          green:  "#03FFCF",
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
