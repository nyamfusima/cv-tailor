import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tailormyCV.ai",
  description: "AI-powered CV tailoring for ATS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif" }}>{children}</body>
    </html>
  );
}
