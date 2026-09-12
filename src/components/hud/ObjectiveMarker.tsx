import { useEffect, useState } from "react";
import { arcadeUiRef } from "../../lib/combat/arcadeUiRef";

export function ObjectiveMarker() {
  const [angle, setAngle] = useState(0);
  const [kind, setKind] = useState<"enemy" | "gate">("enemy");
  const [distance, setDistance] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const ui = arcadeUiRef;
      if (ui.targetType === "none") {
        setVisible(false);
        return;
      }

      setVisible(true);
      const dx = ui.targetX - ui.playerX;
      const dz = ui.targetZ - ui.playerZ;
      const bearing = Math.atan2(dx, -dz) * (180 / Math.PI);
      setAngle(bearing);
      setDistance(Math.hypot(dx, dz));
      setKind(ui.targetType === "gate" ? "gate" : "enemy");
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  if (!visible) return null;

  const label = kind === "gate" ? "JUMP" : "HOSTILE";

  return (
    <div
      className={`objective-marker is-${kind}`}
      aria-hidden="true"
    >
      <div className="objective-compass">
        <div
          className="objective-arrow"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          ▲
        </div>
      </div>
      <span className="objective-label">{label}</span>
      <span className="objective-range">{Math.max(1, Math.round(distance))}m</span>
    </div>
  );
}
