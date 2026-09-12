import { useEffect, useRef, useState } from "react";
import { arcadeUiRef, MANA_MAX } from "../../lib/combat/arcadeUiRef";
import { BLAST_CLIP } from "../../lib/combat/blastWeapon";

interface VitalBarsProps {
  hull: number;
  shields: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function hullTone(value: number): "ok" | "warn" | "critical" {
  if (value < 25) return "critical";
  if (value < 50) return "warn";
  return "ok";
}

function MkBar({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "hull" | "shields" | "mana";
}) {
  const percent = clampPercent(value);
  const prevRef = useRef(percent);
  const [ghost, setGhost] = useState(percent);
  const [flash, setFlash] = useState(false);
  const ready = kind === "mana" && percent >= 100;

  useEffect(() => {
    if (percent < prevRef.current) {
      setFlash(true);
      const flashTimer = window.setTimeout(() => setFlash(false), 180);
      const ghostTimer = window.setTimeout(() => setGhost(percent), 340);
      prevRef.current = percent;
      return () => {
        window.clearTimeout(flashTimer);
        window.clearTimeout(ghostTimer);
      };
    }
    prevRef.current = percent;
    setGhost(percent);
  }, [percent]);

  const tone = kind === "shields" ? "shields" : kind === "mana" ? "mana" : hullTone(percent);

  return (
    <div className={`mk-bar mk-bar-${kind} ${flash ? "is-flash" : ""} ${ready ? "is-ready" : ""}`}>
      <div className="mk-bar-meta">
        <span>{label}</span>
        <strong>{ready ? "READY" : Math.round(percent)}</strong>
      </div>
      <div
        className="mk-bar-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span className="mk-bar-ghost" style={{ width: `${ghost}%` }} />
        <span className={`mk-bar-fill is-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function VitalBars({ hull, shields }: VitalBarsProps) {
  const [mana, setMana] = useState(0);
  const [ammo, setAmmo] = useState(BLAST_CLIP);
  const [reloading, setReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMana((arcadeUiRef.mana / MANA_MAX) * 100);
      setAmmo(arcadeUiRef.ammo);
      setReloading(arcadeUiRef.reloading);
      setReloadProgress(arcadeUiRef.reloadProgress);
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const ammoPercent = reloading
    ? reloadProgress * 100
    : (ammo / Math.max(1, arcadeUiRef.ammoMax)) * 100;

  return (
    <div className="mk-bars" aria-label="Hull, shields, mana, and cannons">
      <MkBar label="Shields" value={shields} kind="shields" />
      <MkBar label="Hull" value={hull} kind="hull" />
      <MkBar label="Mana" value={mana} kind="mana" />
      <div className={`mk-ammo ${reloading ? "is-reloading" : ""}`}>
        <div className="mk-bar-meta">
          <span>{reloading ? "Reload" : "Cannons"}</span>
          <strong>
            {reloading
              ? `${Math.round(reloadProgress * 100)}%`
              : `${ammo}/${arcadeUiRef.ammoMax || BLAST_CLIP}`}
          </strong>
        </div>
        <div
          className="mk-bar-track"
          role="meter"
          aria-label="Cannon ammo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ammoPercent)}
        >
          <span className={`mk-bar-fill is-ammo ${reloading ? "is-reload" : ""}`} style={{ width: `${ammoPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
