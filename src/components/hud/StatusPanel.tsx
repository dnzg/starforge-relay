import { useGame } from "../../providers/GameProvider";
import { VitalBars } from "./VitalBars";

export function StatusPanel({ compact = false }: { compact?: boolean }) {
  const { run, loading, combatScore } = useGame();

  if (loading || !run) {
    return (
      <section className={compact ? "vitals" : "hud-panel status-panel"}>
        <p className="muted">Initializing…</p>
      </section>
    );
  }

  if (compact) {
    return (
      <section className="vitals" aria-label="Ship vitals">
        <VitalBars hull={run.hull} shields={run.shields} />
        <div className="vital-metric">
          <span>Score</span>
          <strong>{combatScore}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="hud-panel status-panel">
      <div className="panel-header">
        <h2>Ship Status</h2>
      </div>
      <VitalBars hull={run.hull} shields={run.shields} />
      <div className="stat-grid">
        <Stat label="Score" value={`${combatScore}`} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`stat ${warn ? "stat-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
