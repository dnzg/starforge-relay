import { useEffect, useState } from "react";
import { arcadeUiRef } from "../../lib/combat/arcadeUiRef";

export function ObjectiveMarker() {
  const [angle, setAngle] = useState(0);
  const [label, setLabel] = useState("Hostile");
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
      setLabel(ui.targetType === "gate" ? "Jump Gate" : "Hostile");
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="objective-marker" aria-hidden="true">
      <div
        className="objective-arrow"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        ▲
      </div>
      <span className="objective-label">{label}</span>
    </div>
  );
}
