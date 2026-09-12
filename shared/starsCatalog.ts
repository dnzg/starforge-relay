export const STARS_CURRENCY = "XTR" as const;

export type StarsSku = "livery_reroll" | "demo_boost";

export interface StarsSkuConfig {
  title: string;
  description: string;
  stars: number;
  grant: {
    livery_reroll?: number;
    demo_boost?: boolean;
  };
}

export const STARS_SKUS: Record<StarsSku, StarsSkuConfig> = {
  livery_reroll: {
    title: "Livery reroll",
    description: "One AI hull paint generation credit — taste, not damage.",
    stars: 35,
    grant: { livery_reroll: 1 },
  },
  demo_boost: {
    title: "Demo boost",
    description: "Cosmetic bridge flair flag for your captain profile.",
    stars: 10,
    grant: { demo_boost: true },
  },
};

export function isStarsSku(value: string): value is StarsSku {
  return value in STARS_SKUS;
}

export function buildInvoicePayload(
  sku: StarsSku,
  userId: string,
  nonce: string,
): string {
  return `${sku}:${userId}:${nonce}`;
}

export function parseInvoicePayload(payload: string): {
  sku: StarsSku;
  userId: string;
  nonce: string;
} | null {
  const parts = payload.split(":");
  if (parts.length !== 3) return null;
  const [sku, userId, nonce] = parts;
  if (!sku || !userId || !nonce || !isStarsSku(sku)) return null;
  return { sku, userId, nonce };
}
