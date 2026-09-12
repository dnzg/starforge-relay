import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramInitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export function parseInitDataUser(
  initData: string,
): TelegramInitDataUser | null {
  if (!initData.trim()) return null;
  const params = new URLSearchParams(initData);
  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser) as TelegramInitDataUser;
    if (typeof parsed.id !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
): boolean {
  if (!initData.trim() || !botToken.trim()) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex"),
    );
  } catch {
    return false;
  }
}

export function resolveTelegramUserId(
  initData: string | undefined,
  botToken: string | undefined,
  fallbackUserId?: string,
): string | null {
  if (fallbackUserId?.trim()) return fallbackUserId.trim();
  if (!initData?.trim()) return null;
  if (botToken?.trim() && !validateTelegramInitData(initData, botToken)) {
    return null;
  }
  const user = parseInitDataUser(initData);
  return user ? String(user.id) : null;
}
