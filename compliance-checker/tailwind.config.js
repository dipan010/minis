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
        surface: "#F7F8FA",
        card: "#FFFFFF",
        line: "#E3E7ED",
        ink: "#1C2530",
        "ink-soft": "#5F6C7B",
        navy: "#152A47",
        compliant: "#15803D",
        partial: "#B45309",
        gap: "#B91C1C",
        na: "#64748B",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
