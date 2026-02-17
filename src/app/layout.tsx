import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { PWAProvider } from "@/components/providers/pwa-provider";

export const metadata: Metadata = {
  title: "50 Scripts",
  description: "Sistema Inteligente de Scripts Persuasivos para WhatsApp",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "50 Scripts",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#020617] text-white antialiased">
        <SWRProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </SWRProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
