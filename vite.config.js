import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: "auto",
      registerType: "prompt",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon-64.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Blendfort Constructora",
        short_name: "Blendfort",
        description:
          "Sistema interno de control de egresos, residentes y operación de obra.",
        lang: "es-EC",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f5f7fb",
        theme_color: "#f5f7fb",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});