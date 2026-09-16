import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getBusinessSettings();
  const name = settings.business_name || "Order & Pickup";
  return {
    title: { default: name, template: `%s — ${name}` },
    description: settings.description || "Order online for pickup, delivery, or shipping.",
    appleWebApp: { capable: true, statusBarStyle: "default", title: name },
    icons: {
      icon: [{ url: "/icon-192.png", sizes: "192x192" }],
      apple: [{ url: "/apple-touch-icon.png" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getBusinessSettings();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <style>{`:root { --brand: ${settings.primary_color || "#7c3aed"}; }`}</style>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
