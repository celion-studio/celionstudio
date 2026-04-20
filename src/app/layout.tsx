import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/editorial.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Celion — Knowledge, packaged",
  description:
    "Paste notes, upload transcripts, drop a draft. Celion reshapes what you already know into a polished ebook.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
