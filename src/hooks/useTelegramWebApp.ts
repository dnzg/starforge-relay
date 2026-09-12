import { useEffect, useMemo, useState } from "react";
import type { TelegramWebApp, TelegramWebAppUser } from "../types/telegram";

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
      webApp.setHeaderColor("#0a0e1a");
      webApp.setBackgroundColor("#0a0e1a");
    }
    setReady(true);
  }, []);

  return useMemo(() => {
    const webApp = window.Telegram?.WebApp ?? null;
    const user = webApp?.initDataUnsafe?.user ?? null;
    const displayName = user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        "Captain"
      : "Captain";

    return {
      isTelegram: Boolean(webApp?.initData),
      webApp: ready ? webApp : null,
      user,
      displayName,
      colorScheme: webApp?.colorScheme ?? "dark",
    };
  }, [ready]);
}
