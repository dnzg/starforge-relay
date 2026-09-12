import { CockpitScene } from "./components/scene/CockpitScene";
import { HUD } from "./components/hud/HUD";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import { GameProvider, useGame } from "./providers/GameProvider";

function GameShell() {
  const { run, hyperspaceActive } = useGame();
  const { isTelegram } = useTelegramWebApp();

  return (
    <div className="app-shell">
      {!isTelegram ? (
        <div className="browser-banner">
          Browser preview mode — open via Telegram Mini App for full WebApp integration.
        </div>
      ) : null}

      <div className="viewport">
        <CockpitScene
          sectorSeed={run?.sectorSeed ?? 42}
          planetTextureUrl={run?.planetTextureUrl}
          hyperspaceActive={hyperspaceActive}
        />
        <HUD />
      </div>
    </div>
  );
}

export default function App() {
  const { displayName } = useTelegramWebApp();

  return (
    <GameProvider displayName={displayName}>
      <GameShell />
    </GameProvider>
  );
}
