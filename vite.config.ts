import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { createSectorArtMiddleware } from "./server/sectorArtMiddleware.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const falKey = env.FAL_KEY || process.env.FAL_KEY;

  return {
    plugins: [
      react(),
      {
        name: "starforge-sector-art-api",
        configureServer(server) {
          server.middlewares.use(createSectorArtMiddleware(falKey));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createSectorArtMiddleware(falKey));
        },
      },
    ],
    server: {
      port: 43123,
      host: true,
    },
    preview: {
      port: 43123,
      host: true,
    },
  };
});
