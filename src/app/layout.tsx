import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "myCVtailor.ai — AI-powered CV tailoring for ATS",
  description: "Upload your CV and paste a job description. Our AI rewrites your CV to match the role's exact keywords and pass ATS filters in under 20 seconds. Free to use.",
  keywords: "CV tailor, ATS optimiser, resume builder, AI CV, job application, cover letter generator",
  verification: {
  google: "1OOuvcZW_UfG52JzriZ-n6aaWwJ1VD4aW0Uvhoeo2yc",
  },
  openGraph: {
    title: "mycvtailor.ai — Tailor your CV to every job",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    url: "https://mycvtailor.co.za",
    siteName: "mycvtailor..co.za",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "myCVtailor.ai — AI-powered CV tailoring",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "myCVtailor.ai — Tailor your CV to every job",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://mycvtailor.co.za"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
