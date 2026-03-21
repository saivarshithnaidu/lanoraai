import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lanora AI | Your Intelligent Companion",
  description: "Lanora is an emotionally intelligent AI companion designed for deep, personal conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-[#0a0a0a] text-zinc-100 overflow-x-hidden`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
