import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The PWA (manifest + service worker) is hand-written in public/ instead of a
// build plugin, so production builds are just plain `vite build` — no Workbox
// step that can fail in clean CI environments.
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express backend during development.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
