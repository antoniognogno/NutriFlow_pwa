/** @type {import('next').NextConfig} */

import withPWAInit from "@ducanh2912/next-pwa";

// Definiamo le proprietà del manifest qui
const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // --- NUOVA SEZIONE PER IL MANIFEST ---
  manifest: {
    name: "NutriFlow",
    short_name: "NutriFlow",
    description: "Il tuo assistente personale per il benessere e la nutrizione.",
    background_color: "#ffffff",
    theme_color: "#000000",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      {
        src: "/icons/android/android-launchericon-192-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/android/android-launchericon-512-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
};

const withPWA = withPWAInit(pwaConfig);

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);