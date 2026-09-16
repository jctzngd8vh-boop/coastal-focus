import type { MetadataRoute } from "next";
import { getBusinessSettings } from "@/lib/settings/get-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getBusinessSettings();
  const name = settings.business_name || "Order & Pickup";

  return {
    name,
    short_name: name.slice(0, 12),
    description: settings.description || "Order online, pick up fresh.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: settings.primary_color || "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
