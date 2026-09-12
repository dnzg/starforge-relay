import type { StarsSku } from "../../../shared/starsCatalog";

export interface StarsEntitlements {
  livery_reroll: number;
  demo_boost: boolean;
  chargeIds: string[];
}

export interface StarsCatalogEntry {
  sku: StarsSku;
  title: string;
  description: string;
  stars: number;
}

export const STARS_CATALOG: StarsCatalogEntry[] = [
  {
    sku: "livery_reroll",
    title: "Livery reroll",
    description: "One AI hull paint generation credit",
    stars: 35,
  },
  {
    sku: "demo_boost",
    title: "Demo boost",
    description: "Cosmetic bridge flair flag",
    stars: 10,
  },
];

interface StarsRequestContext {
  initData?: string;
  telegramUserId?: string;
}

function buildStarsBody(
  sku: StarsSku,
  context: StarsRequestContext,
): Record<string, string> {
  const body: Record<string, string> = { sku };
  if (context.initData) body.initData = context.initData;
  if (context.telegramUserId) body.telegramUserId = context.telegramUserId;
  return body;
}

export async function fetchStarsEntitlements(
  context: StarsRequestContext,
): Promise<StarsEntitlements | null> {
  const params = new URLSearchParams();
  if (context.initData) params.set("initData", context.initData);
  if (context.telegramUserId) {
    params.set("telegramUserId", context.telegramUserId);
  }
  if (!params.toString()) return null;

  const response = await fetch(`/api/stars/entitlements?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { entitlements?: StarsEntitlements };
  return payload.entitlements ?? null;
}

export async function createStarsInvoice(
  sku: StarsSku,
  context: StarsRequestContext,
): Promise<
  | { mock: true; sku: StarsSku; userId: string }
  | { invoiceLink: string; sku: StarsSku; userId: string }
  | { error: string }
> {
  const response = await fetch("/api/stars/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildStarsBody(sku, context)),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    mock?: boolean;
    invoiceLink?: string;
    sku?: StarsSku;
    userId?: string;
    error?: string;
  };
  if (!response.ok) {
    return { error: payload.error ?? `Invoice API ${response.status}` };
  }
  if (payload.mock && payload.sku && payload.userId) {
    return { mock: true, sku: payload.sku, userId: payload.userId };
  }
  if (payload.invoiceLink && payload.sku && payload.userId) {
    return {
      invoiceLink: payload.invoiceLink,
      sku: payload.sku,
      userId: payload.userId,
    };
  }
  return { error: "Unexpected invoice response" };
}

export async function mockGrantStars(
  sku: StarsSku,
  context: StarsRequestContext,
): Promise<StarsEntitlements | null> {
  const response = await fetch("/api/stars/mock-grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildStarsBody(sku, context)),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { entitlements?: StarsEntitlements };
  return payload.entitlements ?? null;
}

export type InvoiceStatus = "paid" | "cancelled" | "failed" | "pending";

export function openStarsInvoice(
  webApp: NonNullable<Window["Telegram"]>["WebApp"],
  invoiceLink: string,
): Promise<InvoiceStatus> {
  return new Promise((resolve) => {
    if (!webApp?.openInvoice) {
      resolve("failed");
      return;
    }
    webApp.openInvoice(invoiceLink, (status) => {
      resolve(status);
    });
  });
}
