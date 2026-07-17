import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tax Form Extractor",
  description:
    "Upload a W-2, 1099, or Form 16 image or PDF and extract all structured fields into an editable form with per-field confidence scores.",
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
