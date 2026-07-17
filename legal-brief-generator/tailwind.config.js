/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#F6F1E7",
        ivory: "#FDFBF5",
        line: "#E0D8C8",
        ink: "#22293A",
        "ink-soft": "#66604F",
        navy: "#1D3253",
        "navy-soft": "#3D5378",
        strong: "#1F6B4A",
        moderate: "#9A6E1B",
        weak: "#9C3B2E",
        warnbg: "#FBF3DF",
      },
      fontFamily: {
        serif: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
