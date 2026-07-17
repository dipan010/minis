import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compliance Document Checker",
  description:
    "Gap analysis between a company policy and a regulation: which requirements are met, partially met, or missing.",
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
