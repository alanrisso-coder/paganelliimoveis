import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos demonstrativas dos imóveis. Ao migrar para upload próprio,
    // troque por remotePatterns do bucket (Supabase Storage/S3).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
