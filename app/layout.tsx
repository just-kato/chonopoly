import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GA Real Estate Exam Study Guide",
  description: "Georgia Real Estate Salesperson Licensing — Interactive Study Guide",
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
