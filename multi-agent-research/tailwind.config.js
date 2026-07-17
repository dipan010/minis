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
        surface: "#F5F5F2",
        card: "#FFFFFF",
        line: "#E3E1DA",
        ink: "#20242C",
        "ink-soft": "#6B7078",
        terminal: "#11151D",
        "terminal-line": "#232A38",
        planner: "#3B82F6",
        researcher: "#22C55E",
        writer: "#A855F7",
        reviewer: "#F59E0B",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
