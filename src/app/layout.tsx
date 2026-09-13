import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import MotionProvider from "@/components/shared/MotionProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07090A",
};

export const metadata: Metadata = {
  title: "ZenTrip — AI Travel Operations",
  description:
    "Eight AI agents run your trip like a flight operation. Mission-control travel planning with live agent telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          {children}
          <MobileBottomNav />
          <Toaster position="bottom-right" theme="dark" />
        </MotionProvider>
      </body>
    </html>
  );
}
