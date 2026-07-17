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
        base: "#07090E",
        card: "#0E1219",
        "card-hover": "#151B26",
        line: "#1E2836",
        ink: "#DDE5F0",
        "ink-soft": "#7C8BA1",
        ok: "#2DD4A7",
        warn: "#F5B83D",
        bad: "#F0524A",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
