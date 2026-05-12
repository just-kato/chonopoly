import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GA Real Estate Exam Study Guide",
  description: "Georgia Real Estate Salesperson Licensing — Interactive Study Guide",
  icons: {
    icon: [
      { url: "/favicons/favicon.ico", sizes: "any" },
      { url: "/favicons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
