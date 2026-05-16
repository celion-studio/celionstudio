import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/ui.css";
import "@/styles/workspace.css";
import "@/styles/editor.css";
import "@/styles/dashboard.css";
import "@/styles/wizard.css";
import "@/styles/marketing.css";
import "@/styles/landing.css";
import "@/styles/pricing.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Celion | Turn source material into editable ebooks",
  description:
    "Paste notes, upload transcripts, or add research. Celion plans and drafts editable A5 ebooks from the material you already have.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={geist.variable}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
