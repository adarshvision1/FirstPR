import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FirstPR - Zero Friction Contribution",
  description: "Get to your first PR with zero friction. Analyze, Plan, Contribute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
