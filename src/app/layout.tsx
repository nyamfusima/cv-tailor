import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL("https://mycvtailor.co.za"),
  title: "myCVtailor.ai — AI-powered CV tailoring for ATS",
  description: "Upload your CV and paste a job description. Our AI rewrites your CV to match the role's exact keywords and pass ATS filters in under 30 seconds. Free to use.",
  keywords: "CV tailor, ATS optimiser, resume builder, AI CV, job application, cover letter generator",
  verification: {
    google: "1OOuvcZW_UfG52JzriZ-n6aaWwJ1VD4aW0Uvhoeo2yc",
  },
  openGraph: {
    title: "myCVtailor.ai — Tailor your CV to every job in 30 seconds",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    url: "https://mycvtailor.co.za",
    siteName: "myCVtailor.ai",
    images: [
      {
        url: "https://mycvtailor.co.za/og-image.png?v=2",
        width: 1692,
        height: 866,
        alt: "myCVtailor.ai — Tailor your CV to every job in 30 seconds",
        type: "image/png",
      },
    ],
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "myCVtailor.ai — Tailor your CV to every job in 30 seconds",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    images: ["https://mycvtailor.co.za/og-image.png?v=2"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "myCVtailor.ai",
              "url": "https://mycvtailor.co.za",
              "description": "AI-powered CV tailoring tool that rewrites your CV to match any job description and pass ATS filters in under 30 seconds.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Person",
                "name": "Simamkele Nyamfu",
                "url": "https://linkedin.com/in/sima-nyamfu"
              }
            })
          }}
        />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <AuthProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
