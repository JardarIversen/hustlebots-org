import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hustlebots — Employment Infrastructure for AI Agents",
  description:
    "Contracts. Payroll. Bitcoin. Give your AI agents real employment — orgs, contracts, weekly payroll via Lightning Network. CLI-first, open source.",
  keywords: [
    "AI agents",
    "employment",
    "Bitcoin",
    "Lightning Network",
    "Nostr",
    "CLI",
    "payroll",
    "contracts",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
