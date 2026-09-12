import { useEffect, useRef, useState } from "react";

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
  kind: "hull" | "shields";
}) {
  const percent = clampPercent(value);
  const prevRef = useRef(percent);
  const [ghost, setGhost] = useState(percent);
  const [flash, setFlash] = useState(false);

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

  const tone = kind === "shields" ? "shields" : hullTone(percent);

  return (
    <div className={`mk-bar mk-bar-${kind} ${flash ? "is-flash" : ""}`}>
      <div className="mk-bar-meta">
        <span>{label}</span>
        <strong>{Math.round(percent)}</strong>
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
  return (
    <div className="mk-bars" aria-label="Hull and shields">
      <MkBar label="Shields" value={shields} kind="shields" />
      <MkBar label="Hull" value={hull} kind="hull" />
    </div>
  );
}
