import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supply Chain Risk Monitor",
  description:
    "ESG and supply chain risk intelligence from simulated news analysis — company risk events, ESG scores, and recommendations.",
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
