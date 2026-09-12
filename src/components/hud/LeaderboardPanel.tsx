import { useGame } from "../../providers/GameProvider";

export function LeaderboardPanel({ compact = false }: { compact?: boolean }) {
  const { backend, leaderboard, loading } = useGame();

  if (backend !== "convex" || loading) return null;

  return (
    <section
      className={compact ? "leaderboard-panel compact" : "leaderboard-panel"}
      aria-label="Live leaderboard"
    >
      <div className="leaderboard-header">
        <span className="leaderboard-title">Relay leaderboard</span>
        <span className="leaderboard-sync">Synced via Convex</span>
      </div>
      {leaderboard.length === 0 ? (
        <p className="leaderboard-empty">No scores yet — be the first captain.</p>
      ) : (
        <ol className="leaderboard-list">
          {leaderboard.map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}-${entry.score}`}>
              <span className="leaderboard-rank">{entry.rank}</span>
              <span className="leaderboard-name">{entry.displayName}</span>
              <span className="leaderboard-score">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
