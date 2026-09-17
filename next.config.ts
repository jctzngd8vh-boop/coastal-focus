import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos, logos, and payment QR codes are uploaded to Supabase
    // Storage and served from https://<project-ref>.supabase.co/storage/...
    // — next/image refuses to optimize remote images from an unlisted
    // domain, so without this every uploaded image silently fails to render.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
