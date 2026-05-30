/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ["'Bebas Neue'", "cursive"],
                body: ["'DM Sans'", "sans-serif"],
                mono: ["'DM Mono'", "monospace"],
            },
            colors: {
                ink: "#0D0D0D",
                paper: "#F2EDE4",
                cream: "#E8E0D0",
                accent: "#C8502A",
                muted: "#8A7F72",
                border: "#D4CBBF",
            },
            animation: {
                "fade-up": "fadeUp 0.4s ease forwards",
                pulse2: "pulse2 1.5s ease-in-out infinite",
            },
            keyframes: {
                fadeUp: {
                    "0%": { opacity: 0, transform: "translateY(12px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                },
                pulse2: {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                },
            },
        },
    },
    plugins: [],
};