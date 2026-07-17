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
        sidebar: "#101826",
        "sidebar-soft": "#1C2941",
        surface: "#F4F6F9",
        card: "#FFFFFF",
        line: "#E1E6EE",
        ink: "#182233",
        "ink-soft": "#61708A",
        low: "#178A50",
        med: "#B07A10",
        high: "#BF3128",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
