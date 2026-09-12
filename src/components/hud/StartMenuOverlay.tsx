import { useCallback, useMemo, useState } from "react";
import { useGame } from "../../providers/GameProvider";
import {
  loadCaptainProfile,
  saveCaptainProfile,
  type CaptainGender,
} from "../../lib/game/captainProfile";
import {
  disableMic,
  ensureMicStream,
  hasLiveMic,
} from "../../lib/voice/micPermission";
import { LeaderboardPanel } from "./LeaderboardPanel";

export function StartMenuOverlay() {
  const {
    suggestedName,
    captain,
    updateCaptainProfile,
    beginRun,
    backend,
    loading,
  } = useGame();

  const existing = useMemo(() => loadCaptainProfile(), []);
  const [name, setName] = useState(captain?.name ?? existing?.name ?? suggestedName);
  const [gender, setGender] = useState<CaptainGender>(
    captain?.gender ?? existing?.gender ?? "they",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [micEnabled, setMicEnabled] = useState(hasLiveMic);
  const [micError, setMicError] = useState<string | null>(null);
  const [playBusy, setPlayBusy] = useState(false);

  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      disableMic();
      setMicEnabled(false);
      setMicError(null);
      return;
    }

    setMicBusy(true);
    setMicError(null);
    try {
      await ensureMicStream();
      setMicEnabled(true);
    } catch {
      setMicError("Microphone blocked. Enable it in browser or Telegram settings.");
      setMicEnabled(false);
    } finally {
      setMicBusy(false);
    }
  }, [micEnabled]);

  const handlePlay = useCallback(async () => {
    setPlayBusy(true);
    const profile = saveCaptainProfile({
      name: name.trim() || suggestedName,
      gender,
    });
    updateCaptainProfile(profile.name, profile.gender);
    try {
      await beginRun();
    } finally {
      setPlayBusy(false);
    }
  }, [beginRun, gender, name, suggestedName, updateCaptainProfile]);

  return (
    <div className="start-menu-overlay" role="dialog" aria-labelledby="start-menu-title">
      <div className="start-menu-card">
        <header className="start-menu-header stagger-item">
          <img
            className="start-menu-logo"
            src="/avatars/starforge-relay-telegram-icon.png"
            alt=""
            width={72}
            height={72}
          />
          <div>
            <p className="eyebrow">Starforge Relay</p>
            <h1 id="start-menu-title">Sector relay</h1>
            <p className="start-menu-tagline">Arcade combat for Telegram captains.</p>
          </div>
        </header>

        <label className="onboarding-field stagger-item">
          <span>Callsign</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            placeholder="Your callsign"
            autoComplete="nickname"
          />
        </label>

        <fieldset className="onboarding-gender stagger-item">
          <legend>Pronouns in the log</legend>
          {(
            [
              ["he", "He / him"],
              ["she", "She / her"],
              ["they", "They / them"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="start-menu-gender"
                checked={gender === value}
                onChange={() => setGender(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          className="onboarding-cta start-menu-play stagger-item"
          onClick={() => void handlePlay()}
          disabled={playBusy || loading}
        >
          {playBusy ? "Launching…" : "Play"}
        </button>

        <section className="start-menu-section stagger-item" aria-label="Relay leaderboard">
          <div className="start-menu-section-head">
            <h2>Top captains</h2>
            {backend === "convex" ? (
              <span className="start-menu-live">Live scores</span>
            ) : (
              <span className="start-menu-live">Local preview</span>
            )}
          </div>
          <LeaderboardPanel embedded />
        </section>

        <div className="start-menu-actions stagger-item">
          <button
            type="button"
            className="start-menu-secondary"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
          >
            Settings
          </button>
          <button
            type="button"
            className="start-menu-secondary"
            onClick={() => setBriefingOpen((open) => !open)}
            aria-expanded={briefingOpen}
          >
            Briefing
          </button>
        </div>

        {settingsOpen ? (
          <section className="start-menu-panel stagger-item" aria-label="Settings">
            <h3>Bridge comms</h3>
            <p className="start-menu-panel-lead">
              Voice commands use your microphone. Text commands always work.
            </p>
            {micError ? <p className="onboarding-error">{micError}</p> : null}
            <button
              type="button"
              className="start-menu-secondary start-menu-mic-toggle"
              onClick={() => void toggleMic()}
              disabled={micBusy}
            >
              {micBusy
                ? "Requesting microphone…"
                : micEnabled
                  ? "Microphone on — tap to disable"
                  : "Enable microphone"}
            </button>
          </section>
        ) : null}

        {briefingOpen ? (
          <section className="start-menu-panel stagger-item" aria-label="Combat briefing">
            <h3>Clear the reach</h3>
            <ul className="onboarding-list">
              <li>
                <strong>Fly</strong> — W dive, S climb, A left, D right
              </li>
              <li>
                <strong>Boost</strong> — Hold Shift, or BOOST on touch
              </li>
              <li>
                <strong>Fire</strong> — Space or FIRE; 8-shot clip then reload
              </li>
              <li>
                <strong>Super</strong> — F or Q when mana is full
              </li>
              <li>
                <strong>Jump</strong> — After 3 kills, fly into the glowing ring
              </li>
              <li>
                <strong>Talk</strong> — “scan the sector”, “status”, “jump”
              </li>
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
