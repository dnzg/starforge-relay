import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const appUrl = (
  process.env.VITE_APP_URL ??
  process.env.APP_URL ??
  ""
).replace(/\/$/, "");

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

if (!appUrl) {
  console.error("VITE_APP_URL (or APP_URL) is required.");
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;

const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  },
);

const payload = (await response.json()) as {
  ok: boolean;
  description?: string;
  result?: boolean;
};

if (!payload.ok) {
  console.error("setWebhook failed:", payload.description ?? response.status);
  process.exit(1);
}

console.log(`Webhook set to ${webhookUrl}`);
