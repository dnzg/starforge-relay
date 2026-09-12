import type { IncomingMessage } from "node:http";
import type { Connect } from "vite";
import { handleSectorArtRequest } from "../shared/falSectorArtServer.js";

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createSectorArtMiddleware(
  falKey?: string,
): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/sector-art")) {
      next();
      return;
    }

    if (req.method !== "POST" && req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      let body = "";
      if (req.method === "POST") {
        body = await readRequestBody(req);
      } else {
        const url = new URL(req.url, "http://localhost");
        const seedParam = url.searchParams.get("seed");
        if (seedParam) {
          body = JSON.stringify({ seed: Number(seedParam) });
        }
      }

      const result = await handleSectorArtRequest(body, falKey);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Sector art failed",
        }),
      );
    }
  };
}
