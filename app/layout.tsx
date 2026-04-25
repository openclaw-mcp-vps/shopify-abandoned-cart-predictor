import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const heading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "700"]
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shopify-abandoned-cart-predictor.example.com"),
  title: "Shopify Abandoned Cart Predictor | Prioritize High-Intent Recoveries",
  description:
    "Predict which abandoned carts are most likely to convert so your Shopify team can focus retention spend where it actually pays off.",
  openGraph: {
    title: "Shopify Abandoned Cart Predictor",
    description:
      "Score abandoned carts by conversion likelihood and prioritize your follow-up effort.",
    type: "website",
    url: "/",
    siteName: "Shopify Abandoned Cart Predictor"
  },
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="font-[var(--font-body)] antialiased">{children}</body>
    </html>
  );
}
