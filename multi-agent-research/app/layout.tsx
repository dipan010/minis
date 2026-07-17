import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Agent Research Assistant",
  description:
    "A pipeline of Planner, Researcher, Writer, and Reviewer agents collaborates in real time to produce a structured research report.",
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
