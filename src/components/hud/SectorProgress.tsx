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

  if (gateUnlocked) return null;

  const cleared = Math.min(kills, KILLS_FOR_JUMP);

  return (
    <div className="sector-progress">
      <span>
        {cleared} / {KILLS_FOR_JUMP} ships to open the gate
      </span>
      <span className="sector-progress-tip">
        Voice examples: “scan the sector” · “status” · “jump”
      </span>
    </div>
  );
}
