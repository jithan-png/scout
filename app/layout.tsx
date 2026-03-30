import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildMapper",
  description: "Your AI superconnector for construction opportunities",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuildMapper",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-base min-h-dvh flex justify-center">
        {/* Mobile shell — phone width, centered on desktop */}
        <div className="relative w-full max-w-[430px] min-h-dvh bg-base overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
