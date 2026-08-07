import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "CityPal — pocket city guide",
        short_name: "CityPal",
        description: "Find nearby restaurants, sights, museums, transport and more.",
        theme_color: "#0f766e",
        background_color: "#0b1120",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  server: {
    // Forward API calls to the Express backend during development.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
