import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinical Note Scribe",
  description:
    "Convert a doctor-patient conversation transcript into a structured SOAP note with ICD-10 suggestions — demonstration only, not a medical device.",
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
