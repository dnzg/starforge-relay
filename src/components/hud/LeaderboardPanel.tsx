import { useGame } from "../../providers/GameProvider";

export function LeaderboardPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { backend, leaderboard, loading } = useGame();

  if (loading && backend === "convex") {
    return (
      <section
        className={embedded ? "leaderboard-panel embedded" : "leaderboard-panel"}
        aria-label="Relay leaderboard"
      >
        <p className="leaderboard-empty">Loading scores…</p>
      </section>
    );
  }

  if (backend !== "convex") {
    return (
      <section
        className={embedded ? "leaderboard-panel embedded" : "leaderboard-panel"}
        aria-label="Relay leaderboard"
      >
        <p className="leaderboard-empty">
          Scores appear here when the relay backend is online.
        </p>
      </section>
    );
  }

  return (
    <section
      className={embedded ? "leaderboard-panel embedded" : "leaderboard-panel"}
      aria-label="Relay leaderboard"
    >
      {!embedded ? (
        <div className="leaderboard-header">
          <span className="leaderboard-title">Relay leaderboard</span>
          <span className="leaderboard-subtitle">Top captains</span>
        </div>
      ) : null}
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
