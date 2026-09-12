import { useCallback, useEffect, useMemo } from "react";
import { useGame } from "../../providers/GameProvider";
import { playSfx } from "../../lib/audio/gameAudio";

export function GameOverOverlay() {
  const {
    run,
    combatScore,
    sectorKills,
    restartRun,
    returnToMenu,
    captain,
    backend,
    leaderboard,
  } = useGame();

  const retry = useCallback(() => {
    void restartRun();
  }, [restartRun]);

  const goMenu = useCallback(() => {
    returnToMenu();
  }, [returnToMenu]);

  const placement = useMemo(() => {
    if (backend !== "convex" || !captain?.name) return null;
    const match = leaderboard.find(
      (entry) =>
        entry.displayName === captain.name && entry.score === combatScore,
    );
    if (match) return match.rank;
    const byScore = leaderboard.findIndex((entry) => entry.score <= combatScore);
    if (byScore === -1 && combatScore > 0) return leaderboard.length + 1;
    return byScore >= 0 ? byScore + 1 : null;
  }, [backend, captain?.name, combatScore, leaderboard]);

  useEffect(() => {
    if (run?.status !== "ended") return;
    playSfx("game_over");
  }, [run?.status]);

  useEffect(() => {
    if (run?.status !== "ended") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        retry();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [retry, run?.status]);

  if (run?.status !== "ended") return null;

  return (
    <div className="gameover-overlay" role="dialog" aria-labelledby="gameover-title">
      <div className="gameover-card">
        <p className="eyebrow stagger-item">Hull breach</p>
        <h2 id="gameover-title" className="stagger-item">
          Game over
        </h2>
        <p className="gameover-lead stagger-item">
          {captain?.name ? `${captain.name}, the hull did not hold.` : "The hull did not hold."}{" "}
          Emergency pods launched. Nothing left to fly.
        </p>
        <dl className="gameover-stats stagger-item">
          <div>
            <dt>Sector</dt>
            <dd>{run.sectorName}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{combatScore}</dd>
          </div>
          <div>
            <dt>Kills</dt>
            <dd>{sectorKills}</dd>
          </div>
          <div>
            <dt>Jumps</dt>
            <dd>{run.jumpsCompleted}</dd>
          </div>
        </dl>
        {placement ? (
          <p className="gameover-rank stagger-item">
            You placed #{placement} on the relay board.
          </p>
        ) : null}
        <div className="gameover-actions stagger-item">
          <button type="button" className="onboarding-cta" onClick={retry}>
            Try again
          </button>
          <button type="button" className="onboarding-skip" onClick={goMenu}>
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}
