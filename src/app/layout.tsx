import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAC CRM — Real Estate Lead & Marketing CRM",
  description: "AI-powered lead pipeline, campaigns, and WhatsApp/social intake for real estate marketing teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink">{children}</body>
    </html>
  );
}
