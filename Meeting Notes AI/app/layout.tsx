import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "MeetingMind — AI Meeting Notes",
    description:
        "Paste a meeting transcript and instantly get structured action items, key decisions, and a summary — powered by llama3.1:8b via Ollama.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}