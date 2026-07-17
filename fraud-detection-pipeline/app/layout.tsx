import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fraud Detection Pipeline",
  description:
    "Real-time simulated transaction stream with statistical anomaly scoring, LLM explanations for flagged activity, and a live monitoring dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
