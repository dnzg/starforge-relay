import { useEffect, useRef, useState } from "react";
import { ArcadeScene } from "./components/scene/ArcadeScene";
import { HUD } from "./components/hud/HUD";
import { GarageOverlay } from "./components/hud/GarageOverlay";
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
    skyTextureUrl,
    combatCallbacks,
    markPlanetTextureReady,
  } = useGame();
  const { isTelegram } = useTelegramWebApp();
  const [garageOpen, setGarageOpen] = useState(false);
  const combatEnabled = Boolean(run && run.status === "active") && !garageOpen;
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
          Browser preview — open in Telegram for the Mini App.
        </div>
      ) : null}

      <div className="viewport" onContextMenu={(event) => event.preventDefault()}>
        <ArcadeScene
          sectorSeed={run?.sectorSeed ?? 42}
          sectorKey={sectorKey}
          planetTextureUrl={run?.planetTextureUrl}
          skyTextureUrl={skyTextureUrl}
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
          garageOpen={garageOpen}
          onGarageOpenChange={setGarageOpen}
        />
        {garageOpen ? (
          <GarageOverlay onClose={() => setGarageOpen(false)} />
        ) : null}
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
