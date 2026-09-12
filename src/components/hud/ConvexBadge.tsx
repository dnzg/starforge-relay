import { useGame } from "../../providers/GameProvider";

export function ConvexBadge() {
  const { backend, run, loading } = useGame();

  if (backend !== "convex") return null;

  const runLabel = run?.id ? run.id.slice(-6).toUpperCase() : "…";

  return (
    <div className="convex-badge" aria-label="Synced via Convex">
      <span className="convex-badge-dot" aria-hidden="true" />
      <span className="convex-badge-label">Convex live</span>
      {!loading && run ? (
        <span className="convex-badge-run">Run {runLabel}</span>
      ) : null}
    </div>
  );
}
