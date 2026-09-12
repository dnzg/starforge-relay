import { useGame } from "../../providers/GameProvider";

export function StatusPanel({ compact = false }: { compact?: boolean }) {
  const {
    run,
    loading,
    backend,
    textureLoading,
    textureStatus,
    textureCached,
    combatScore,
  } = useGame();

  if (loading || !run) {
    return (
      <section className={`hud-panel status-panel ${compact ? "status-panel-compact" : ""}`}>
        {!compact ? <h2>Ship Status</h2> : null}
        <p className="muted">Initializing relay systems...</p>
      </section>
    );
  }

  return (
    <section className={`hud-panel status-panel ${compact ? "status-panel-compact" : ""}`}>
      {!compact ? (
        <div className="panel-header">
          <h2>Ship Status</h2>
          <span className="badge">{backend === "local" ? "LOCAL" : "CONVEX"}</span>
        </div>
      ) : (
        <div className="compact-stats-row">
          <span className="badge">{backend === "local" ? "LOCAL" : "CONVEX"}</span>
          <span className="run-status">{run.status.toUpperCase()}</span>
        </div>
      )}

      <div className={`stat-grid ${compact ? "stat-grid-compact" : ""}`}>
        {!compact ? <Stat label="Sector" value={run.sectorName} wide /> : null}
        <Stat label="Hull" value={`${run.hull}%`} warn={run.hull < 30} />
        <Stat label="Shields" value={`${run.shields}%`} warn={run.shields < 30} />
        <Stat label="Score" value={`${combatScore}`} />
        <Stat label="Credits" value={`${run.credits}`} />
        {!compact ? (
          <>
            <Stat label="Fuel" value={`${run.fuel}`} />
            <Stat label="Threat" value={`${run.threatLevel}/10`} warn={run.threatLevel >= 7} />
          </>
        ) : (
          <Stat label="Threat" value={`${run.threatLevel}/10`} warn={run.threatLevel >= 7} />
        )}
      </div>

      {!compact && run.scanData ? (
        <p className="scan-line">{run.scanData}</p>
      ) : null}

      <p
        className={`texture-status ${textureLoading ? "texture-loading" : ""} ${textureCached ? "texture-cached" : "texture-generated"}`}
      >
        {textureLoading ? "⏳ " : textureCached ? "💾 " : "🪐 "}
        {textureStatus}
      </p>

      {compact ? (
        <p className="control-hint">
          WASD / Arrows to fly · Space / Click to fire · Shift boost
        </p>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  wide,
  warn,
}: {
  label: string;
  value: string;
  wide?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`stat ${wide ? "stat-wide" : ""} ${warn ? "stat-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
