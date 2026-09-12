import { useCallback, useEffect } from "react";
import { useGame } from "../../providers/GameProvider";
import { playSfx } from "../../lib/audio/gameAudio";
import { LeaderboardPanel } from "./LeaderboardPanel";

export function GameOverOverlay() {
  const { run, combatScore, sectorKills, restartRun, captain, backend } = useGame();

  const retry = useCallback(() => {
    void restartRun();
  }, [restartRun]);

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
        {backend === "convex" ? (
          <div className="stagger-item">
            <LeaderboardPanel />
          </div>
        ) : null}
        <button type="button" className="onboarding-cta stagger-item" onClick={retry}>
          Try again
        </button>
      </div>
    </div>
  );
}
