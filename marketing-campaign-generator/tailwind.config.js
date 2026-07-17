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
        base: "#0D1017",
        card: "#151A24",
        "card-hover": "#1C2331",
        line: "#262F41",
        ink: "#E9EDF5",
        "ink-soft": "#8B96AB",
        google: "#4285F4",
        facebook: "#1877F2",
        instagram: "#E1306C",
        linkedin: "#0A66C2",
        xdark: "#9CA3AF",
        tiktok: "#25F4EE",
        accent: "#F472B6",
      },
      fontFamily: {
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
