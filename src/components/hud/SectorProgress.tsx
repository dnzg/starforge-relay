import { useEffect, useState } from "react";
import { arcadeUiRef, KILLS_FOR_JUMP } from "../../lib/combat/arcadeUiRef";

export function SectorProgress() {
  const [kills, setKills] = useState(0);
  const [gateUnlocked, setGateUnlocked] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setKills(arcadeUiRef.sectorKills);
      setGateUnlocked(arcadeUiRef.jumpGateUnlocked);
    }, 150);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="sector-progress">
      {gateUnlocked ? (
        <span className="sector-progress-gate">Jump gate online — fly north to jump</span>
      ) : (
        <span>
          Hostiles cleared: {Math.min(kills, KILLS_FOR_JUMP)} / {KILLS_FOR_JUMP}
        </span>
      )}
    </div>
  );
}
