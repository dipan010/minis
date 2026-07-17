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
        surface: "#F6F8FB",
        card: "#FFFFFF",
        line: "#E2E8F0",
        ink: "#1B2A41",
        "ink-soft": "#64748B",
        primary: "#1D4ED8",
        "primary-soft": "#EFF4FF",
        good: "#15803D",
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
