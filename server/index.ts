import { config as loadEnv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const dev = process.argv.includes("--dev");
const env = loadServerEnv({ dev, portOverride: dev ? 43124 : undefined });
const app = createApp(env);

if (env.serveStatic) {
  const indexPath = join(env.distDir, "index.html");
  if (!existsSync(indexPath)) {
    console.error(
      `Missing ${indexPath}. Run npm run build before npm start.`,
    );
    process.exit(1);
  }

  app.get("*", (c) => {
    if (c.req.path.startsWith("/api")) {
      return c.notFound();
    }
    return c.html(readFileSync(indexPath, "utf8"));
  });
}

console.log(
  `[starforge-relay] API${env.serveStatic ? " + static" : ""} on http://0.0.0.0:${env.port}`,
);

serve({
  fetch: app.fetch,
  port: env.port,
});
