import { ConvexReactClient } from "convex/react";

let client: ConvexReactClient | null = null;

export function getConvexUrl(): string | undefined {
  const url = import.meta.env.VITE_CONVEX_URL?.trim();
  return url || undefined;
}

export function getConvexClient(): ConvexReactClient {
  const url = getConvexUrl();
  if (!url) {
    throw new Error("VITE_CONVEX_URL is not configured");
  }
  if (!client) {
    client = new ConvexReactClient(url);
  }
  return client;
}
