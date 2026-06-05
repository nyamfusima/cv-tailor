import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/lib/auth";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-app",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mycvtailor.co.za"),
  title: "myCVtailor.co.za — AI-powered CV tailoring for ATS",
  description: "Upload your CV and paste a job description. Our AI rewrites your CV to match the role's exact keywords and pass ATS filters in under 30 seconds. Free to use.",
  keywords: "CV tailor, ATS optimiser, resume builder, AI CV, job application, cover letter generator",
  verification: {
    google: "1OOuvcZW_UfG52JzriZ-n6aaWwJ1VD4aW0Uvhoeo2yc",
  },
  openGraph: {
    title: "myCVtailor.co.za — Tailor your CV to every job in 30 seconds",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    url: "https://mycvtailor.co.za",
    siteName: "myCVtailor.co.za",
    images: [
      {
        url: "https://mycvtailor.co.za/og-image.png?v=2",
        width: 1692,
        height: 866,
        alt: "myCVtailor.co.za — Tailor your CV to every job in 30 seconds",
        type: "image/png",
      },
    ],
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "myCVtailor.co.za — Tailor your CV to every job in 30 seconds",
    description: "AI rewrites your CV to match any job description and pass ATS filters. Free, no sign up required.",
    images: ["https://mycvtailor.co.za/og-image.png?v=2"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "myCVtailor.co.za",
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
      <body>
        <AuthProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
