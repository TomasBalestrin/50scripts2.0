import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

export const metadata: Metadata = {
  title: "50 Scripts 2.0",
  description: "Sistema Inteligente de Scripts Persuasivos para WhatsApp",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "50 Scripts",
  },
};

export const viewport: Viewport = {
  themeColor: "#E94560",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="font-sans bg-[#0F0F1A] text-white antialiased">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
