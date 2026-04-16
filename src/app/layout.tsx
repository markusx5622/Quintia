import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "QUINTIA — Process Intelligence",
    template: "%s | QUINTIA",
  },
  description: "Enterprise Process Intelligence Platform. Identify bottlenecks, model improvement scenarios, and compute deterministic financial outcomes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-quintia-bg text-quintia-text font-[var(--font-inter)] antialiased min-h-screen">
        <Navbar />
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
