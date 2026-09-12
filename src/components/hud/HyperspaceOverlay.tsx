import { useGame } from "../../providers/GameProvider";

export function HyperspaceOverlay() {
  const { hyperspaceActive, run } = useGame();

  if (!hyperspaceActive) return null;

  return (
    <div className="hyperspace-overlay" role="status" aria-live="polite">
      <p className="eyebrow">Hyperspace</p>
      <h2>{run?.sectorName ?? "Unknown sector"}</h2>
      <p>Folding the next reach into view.</p>
    </div>
  );
}
