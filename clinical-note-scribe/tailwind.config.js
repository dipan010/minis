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
        line: "#E4E7EC",
        ink: "#1F2937",
        "ink-soft": "#6B7280",
        subjective: "#2563EB",
        objective: "#16A34A",
        assessment: "#D97706",
        plan: "#7C3AED",
        flag: "#B45309",
        flagbg: "#FEF6E7",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
