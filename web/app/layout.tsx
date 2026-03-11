import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learn & Earn",
  description:
    "Interactive, expert-led courses — build practical skills and track your progress.",
  icons: {
    // Use the new site logo as the favicon (SVG). Modern browsers support SVG favicons;
    // Next.js will include these in the rendered head. If you prefer a .ico for
    // legacy support, add a `/favicon.ico` file to `public/` and change this value.
    icon: "/logo-light.svg",
    apple: "/logo-light.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-(family-name:--font-geist-sans) antialiased`}
      >
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
