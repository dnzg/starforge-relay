import { useGame } from "../../providers/GameProvider";

export function StatusPanel() {
  const { run, loading, backend } = useGame();

  if (loading || !run) {
    return (
      <section className="hud-panel status-panel">
        <h2>Ship Status</h2>
        <p className="muted">Initializing relay systems...</p>
      </section>
    );
  }

  return (
    <section className="hud-panel status-panel">
      <div className="panel-header">
        <h2>Ship Status</h2>
        <span className="badge">{backend === "local" ? "LOCAL" : "CONVEX"}</span>
      </div>
      <div className="stat-grid">
        <Stat label="Sector" value={run.sectorName} wide />
        <Stat label="Hull" value={`${run.hull}%`} warn={run.hull < 30} />
        <Stat label="Shields" value={`${run.shields}%`} warn={run.shields < 30} />
        <Stat label="Fuel" value={`${run.fuel}`} />
        <Stat label="Credits" value={`${run.credits}`} />
        <Stat label="Threat" value={`${run.threatLevel}/10`} warn={run.threatLevel >= 7} />
      </div>
      {run.scanData ? (
        <p className="scan-line">{run.scanData}</p>
      ) : (
        <p className="muted">Long-range scan idle. Command: scan</p>
      )}
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
