import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Powered Demand Forecasting",
  description:
    "Upload historical sales CSV data for statistical demand forecasting with anomaly detection, seasonality decomposition, and inventory recommendations.",
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
