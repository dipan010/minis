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
        navy: "#0F2440",
        "navy-soft": "#1B3A63",
        surface: "#F3F5F8",
        card: "#FFFFFF",
        line: "#DDE3EB",
        ink: "#17233A",
        "ink-soft": "#5E6B80",
        good: "#188653",
        caution: "#B57A0B",
        danger: "#C03221",
        critical: "#8B1A2B",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
