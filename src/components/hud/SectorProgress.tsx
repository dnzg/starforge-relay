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

  const cleared = Math.min(kills, KILLS_FOR_JUMP);

  return (
    <div className={`sector-progress ${gateUnlocked ? "is-gate" : ""}`}>
      {gateUnlocked ? (
        <>
          <span className="sector-progress-gate">
            Jump gate unlocked — fly into the glowing JUMP ring
          </span>
          <span className="sector-progress-tip">
            Or say “jump” if you have fuel
          </span>
        </>
      ) : (
        <>
          <span>
            Hostiles {cleared} / {KILLS_FOR_JUMP} — destroy ships to unlock the jump gate
          </span>
          <span className="sector-progress-tip">
            Voice examples: “scan the sector” · “status” · “jump”
          </span>
        </>
      )}
    </div>
  );
}
