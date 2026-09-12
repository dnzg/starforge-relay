import { useEffect, useRef } from "react";
import { ArcadeScene } from "./components/scene/ArcadeScene";
import { HUD } from "./components/hud/HUD";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import { useArcadeInput } from "./hooks/useArcadeInput";
import { GameProvider, useGame } from "./providers/GameProvider";

function isGameSurface(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(".app-shell") || target.closest("canvas"))
  );
}

function GameShell() {
  const {
    run,
    hyperspaceActive,
    combatCallbacks,
    markPlanetTextureReady,
  } = useGame();
  const { isTelegram } = useTelegramWebApp();
  const combatEnabled = Boolean(run && run.status === "active");
  const arcadeInput = useArcadeInput(combatEnabled);
  const getInputRef = useRef(arcadeInput.getState);
  getInputRef.current = arcadeInput.getState;

  const sectorKey = run ? `${run.id}:${run.sectorSeed}` : "boot";

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (isGameSurface(event.target)) {
        event.preventDefault();
      }
    };
    window.addEventListener("contextmenu", onContextMenu, true);
    return () => window.removeEventListener("contextmenu", onContextMenu, true);
  }, []);

  return (
    <div className="app-shell" onContextMenu={(event) => event.preventDefault()}>
      {!isTelegram ? (
        <div className="browser-banner">
          Browser preview mode — open via Telegram Mini App for full WebApp integration.
        </div>
      ) : null}

      <div className="viewport" onContextMenu={(event) => event.preventDefault()}>
        <ArcadeScene
          sectorSeed={run?.sectorSeed ?? 42}
          sectorKey={sectorKey}
          planetTextureUrl={run?.planetTextureUrl}
          hyperspaceActive={hyperspaceActive}
          threatLevel={run?.threatLevel ?? 3}
          combatEnabled={combatEnabled}
          getInput={() => getInputRef.current()}
          combatCallbacks={combatCallbacks}
          onPlanetTextureReady={markPlanetTextureReady}
        />
        <HUD
          onTouchMove={arcadeInput.setTouchMove}
          onTouchFire={arcadeInput.setTouchFire}
        />
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
