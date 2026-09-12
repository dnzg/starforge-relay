import { randomBytes } from "node:crypto";
import {
  STARS_CURRENCY,
  STARS_SKUS,
  buildInvoicePayload,
  isStarsSku,
  parseInvoicePayload,
} from "../shared/starsCatalog.js";
import { resolveTelegramUserId } from "./telegramAuth.js";
import type { ServerEnv } from "./env.js";
import type { StarsEntitlementsStore } from "./starsEntitlements.js";

interface InvoiceRequest {
  sku?: string;
  initData?: string;
  telegramUserId?: string;
}

interface MockGrantRequest {
  sku?: string;
  initData?: string;
  telegramUserId?: string;
}

async function callTelegramBotApi(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; result?: string; description?: string }> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return (await response.json()) as {
    ok: boolean;
    result?: string;
    description?: string;
  };
}

function resolveUserId(
  env: ServerEnv,
  initData?: string,
  telegramUserId?: string,
): string | null {
  return resolveTelegramUserId(
    initData,
    env.telegramBotToken,
    telegramUserId,
  );
}

export async function handleStarsInvoice(
  body: InvoiceRequest,
  env: ServerEnv,
): Promise<
  | { mock: true; sku: string; userId: string }
  | { invoiceLink: string; sku: string; userId: string }
  | { error: string; status: 400 | 502 | 503 }
> {
  const sku = body.sku?.trim() ?? "";
  if (!isStarsSku(sku)) {
    return { error: "Unknown sku", status: 400 };
  }

  const userId = resolveUserId(env, body.initData, body.telegramUserId);
  if (!userId) {
    return { error: "Telegram user id required", status: 400 };
  }

  if (env.starsMock) {
    return { mock: true, sku, userId };
  }

  const botToken = env.telegramBotToken?.trim();
  if (!botToken) {
    return { error: "Telegram bot not configured", status: 503 };
  }

  const config = STARS_SKUS[sku];
  const nonce = randomBytes(8).toString("hex");
  const payload = buildInvoicePayload(sku, userId, nonce);

  const apiBody: Record<string, unknown> = {
    title: config.title,
    description: config.description,
    payload,
    currency: STARS_CURRENCY,
    prices: [{ label: config.title, amount: config.stars }],
  };

  const result = await callTelegramBotApi(botToken, "createInvoiceLink", apiBody);
  if (!result.ok || !result.result) {
    return {
      error: result.description ?? "createInvoiceLink failed",
      status: 502,
    };
  }

  return { invoiceLink: result.result, sku, userId };
}

export async function handleStarsMockGrant(
  body: MockGrantRequest,
  env: ServerEnv,
  store: StarsEntitlementsStore,
): Promise<{ entitlements: Awaited<ReturnType<StarsEntitlementsStore["get"]>> } | { error: string; status: 400 | 403 }> {
  if (!env.starsMock) {
    return { error: "Mock mode disabled", status: 403 };
  }

  const sku = body.sku?.trim() ?? "";
  if (!isStarsSku(sku)) {
    return { error: "Unknown sku", status: 400 };
  }

  const userId =
    resolveUserId(env, body.initData, body.telegramUserId) ?? "browser-demo";
  const entitlements = await store.mockGrant(userId, sku);
  return { entitlements };
}

export async function handleStarsEntitlements(
  userId: string | null,
  store: StarsEntitlementsStore,
): Promise<{ entitlements: Awaited<ReturnType<StarsEntitlementsStore["get"]>> } | { error: string; status: 400 }> {
  if (!userId) {
    return { error: "userId required", status: 400 };
  }
  const entitlements = await store.get(userId);
  return { entitlements };
}

export async function handleTelegramWebhook(
  update: Record<string, unknown>,
  env: ServerEnv,
  store: StarsEntitlementsStore,
): Promise<void> {
  const botToken = env.telegramBotToken?.trim();
  if (!botToken) return;

  const preCheckout = update.pre_checkout_query as
    | {
        id?: string;
        invoice_payload?: string;
        currency?: string;
        total_amount?: number;
      }
    | undefined;

  if (preCheckout?.id) {
    const parsed = parseInvoicePayload(preCheckout.invoice_payload ?? "");
    const config = parsed ? STARS_SKUS[parsed.sku] : null;
    const ok =
      Boolean(parsed) &&
      preCheckout.currency === STARS_CURRENCY &&
      preCheckout.total_amount === config?.stars;

    await callTelegramBotApi(botToken, "answerPreCheckoutQuery", {
      pre_checkout_query_id: preCheckout.id,
      ok,
      ...(ok ? {} : { error_message: "Invalid Stars checkout" }),
    });
    return;
  }

  const message = update.message as
    | {
        successful_payment?: {
          invoice_payload?: string;
          telegram_payment_charge_id?: string;
          currency?: string;
          total_amount?: number;
        };
      }
    | undefined;

  const payment = message?.successful_payment;
  if (!payment?.telegram_payment_charge_id) return;

  const parsed = parseInvoicePayload(payment.invoice_payload ?? "");
  if (!parsed) return;

  const config = STARS_SKUS[parsed.sku];
  if (
    payment.currency !== STARS_CURRENCY ||
    payment.total_amount !== config.stars
  ) {
    return;
  }

  await store.grantFromSku(
    parsed.userId,
    parsed.sku,
    payment.telegram_payment_charge_id,
  );
}
