import { useEffect, useMemo, useState } from "react";
import { resolveSuggestedCallsign } from "../lib/game/captainProfile";
import { TELEGRAM_THEME_BG } from "../lib/telegram/haptics";
import type { TelegramWebApp, TelegramWebAppUser } from "../types/telegram";

/** No-op on older Telegram clients that lack disableVerticalSwipes. */
export function disableTelegramVerticalSwipes(webApp: TelegramWebApp): void {
  webApp.disableVerticalSwipes?.();
}

export interface TelegramContext {
  isTelegram: boolean;
  webApp: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  displayName: string;
  colorScheme: "light" | "dark";
}

export function useTelegramWebApp(): TelegramContext {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.ready();
      webApp.expand();
      disableTelegramVerticalSwipes(webApp);
      webApp.setHeaderColor(TELEGRAM_THEME_BG);
      webApp.setBackgroundColor(TELEGRAM_THEME_BG);
    }
    setReady(true);
  }, []);

  return useMemo(() => {
    const webApp = window.Telegram?.WebApp ?? null;
    const user = webApp?.initDataUnsafe?.user ?? null;
    const displayName = resolveSuggestedCallsign(user);

    return {
      isTelegram: Boolean(webApp?.initData),
      webApp: ready ? webApp : null,
      user,
      displayName,
      colorScheme: webApp?.colorScheme ?? "dark",
    };
  }, [ready]);
}
