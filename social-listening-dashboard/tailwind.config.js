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
        base: "#0B1220",
        card: "#141D2F",
        "card-hover": "#1B2740",
        line: "#26334D",
        ink: "#E6EBF4",
        "ink-soft": "#94A3B8",
        pos: "#22C55E",
        neg: "#EF4444",
        neu: "#94A3B8",
        accent: "#38BDF8",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
