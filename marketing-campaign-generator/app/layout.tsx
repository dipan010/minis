import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing Campaign Generator",
  description:
    "Generate a complete marketing campaign — ad copy variants, email drip sequence, social posts, image prompts, and a content calendar — from a brief and customer segment.",
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
