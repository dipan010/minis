import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delivery Confidence Scorer",
  description:
    "Predict delivery success likelihood from address and order metadata, with risk factors and mitigation suggestions.",
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
