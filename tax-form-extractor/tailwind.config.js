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
        surface: "#F5F7FA",
        card: "#FFFFFF",
        line: "#E2E8F0",
        ink: "#1E293B",
        "ink-soft": "#64748B",
        accent: "#1D4ED8",
        "accent-soft": "#EFF6FF",
        ok: "#15803D",
        warn: "#B45309",
        bad: "#B91C1C",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
