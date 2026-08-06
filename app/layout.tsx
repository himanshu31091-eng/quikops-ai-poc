import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP } from "@/src/config/app-config";

export const metadata: Metadata = {
  title: {
    default: `${APP.name} — ${APP.tagline}`,
    template: `%s · ${APP.name}`,
  },
  description:
    "Operational execution platform. Turns detected operational exceptions into owned, tracked and verified corrective action.",
  applicationName: APP.name,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f8fa",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <TooltipProvider delayDuration={250} skipDelayDuration={120}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
