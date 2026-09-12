import { useEffect, useState } from "react";
import { arcadeUiRef, MANA_MAX } from "../../lib/combat/arcadeUiRef";

export function ManaMeter() {
  const [mana, setMana] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMana(arcadeUiRef.mana);
      setReady(arcadeUiRef.manaReady);
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const percent = Math.round((mana / MANA_MAX) * 100);

  return (
    <div
      className={`mana-meter ${ready ? "is-ready" : ""}`}
      role="meter"
      aria-label="Super mana"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="mana-meter-row">
        <span>Mana</span>
        <strong>{ready ? "SUPER READY — F / Q" : `${percent}%`}</strong>
      </div>
      <span className="mana-meter-track" aria-hidden="true">
        <span className="mana-meter-fill" style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}
