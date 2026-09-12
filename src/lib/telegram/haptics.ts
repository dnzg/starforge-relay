export const TELEGRAM_THEME_BG = "#000000";

export function telegramHaptic(
  style: "light" | "medium" | "heavy" = "light",
): void {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    // Telegram WebApp unavailable or HapticFeedback missing
  }
}
