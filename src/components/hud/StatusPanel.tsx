import { useGame } from "../../providers/GameProvider";

export function StatusPanel({ compact = false }: { compact?: boolean }) {
  const {
    run,
    loading,
    combatScore,
    sectorKills,
    jumpGateUnlocked,
  } = useGame();

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
        <Vital label="Hull" value={run.hull} warn={run.hull < 30} />
        <Vital label="Shields" value={run.shields} warn={run.shields < 30} />
        <div className="vital-metric">
          <span>Kills</span>
          <strong>{jumpGateUnlocked ? "Gate" : `${sectorKills}/3`}</strong>
        </div>
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
      <div className="stat-grid">
        <Stat label="Hull" value={`${run.hull}%`} warn={run.hull < 30} bar={run.hull} />
        <Stat label="Shields" value={`${run.shields}%`} warn={run.shields < 30} bar={run.shields} />
        <Stat label="Score" value={`${combatScore}`} />
        <Stat label="Kills" value={jumpGateUnlocked ? "Gate open" : `${sectorKills}/3`} />
      </div>
    </section>
  );
}

function Vital({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className={`vital ${warn ? "is-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="stat-bar" aria-hidden="true">
        <span className="stat-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
  bar,
}: {
  label: string;
  value: string;
  warn?: boolean;
  bar?: number;
}) {
  return (
    <div className={`stat ${warn ? "stat-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof bar === "number" ? (
        <span className="stat-bar" aria-hidden="true">
          <span className="stat-bar-fill" style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </span>
      ) : null}
    </div>
  );
}
