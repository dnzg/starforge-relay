import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadCaptainProfile,
  saveCaptainProfile,
  type CaptainGender,
} from "../../lib/game/captainProfile";
import { ensureMicStream } from "../../lib/voice/micPermission";

interface OnboardingOverlayProps {
  suggestedName: string;
  onComplete: (name: string, gender: CaptainGender) => void;
  onReady?: () => void;
}

export function OnboardingOverlay({
  suggestedName,
  onComplete,
  onReady,
}: OnboardingOverlayProps) {
  const existing = useMemo(() => loadCaptainProfile(), []);
  const [step, setStep] = useState<"identity" | "briefing" | "comms">(
    existing ? "comms" : "identity",
  );
  const [visible, setVisible] = useState(true);
  const [name, setName] = useState(existing?.name ?? (suggestedName === "Captain" ? "" : suggestedName));
  const [gender, setGender] = useState<CaptainGender>(existing?.gender ?? "they");
  const [micBusy, setMicBusy] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) onReady?.();
  }, [onReady, visible]);

  const finish = useCallback(() => {
    const profile = saveCaptainProfile({
      name: name.trim() || suggestedName || "Captain",
      gender,
    });
    setVisible(false);
    onComplete(profile.name, profile.gender);
  }, [gender, name, onComplete, suggestedName]);

  const openComms = useCallback(async () => {
    setMicBusy(true);
    setMicError(null);
    try {
      await ensureMicStream();
      finish();
    } catch {
      setMicError("Microphone blocked. Enable it for voice, or play with text.");
    } finally {
      setMicBusy(false);
    }
  }, [finish]);

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        {step === "identity" ? (
          <>
            <p className="eyebrow stagger-item">Starforge Relay</p>
            <h2 id="onboarding-title" className="stagger-item">
              Sign the log
            </h2>
            <p className="onboarding-lead stagger-item">
              The ship AI will address you by name and weave you into the sector brief.
            </p>
            <label className="onboarding-field stagger-item">
              <span>Captain name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                placeholder="Your name"
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
                    name="gender"
                    checked={gender === value}
                    onChange={() => setGender(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              className="onboarding-cta stagger-item"
              onClick={() => setStep("briefing")}
            >
              Continue
            </button>
          </>
        ) : step === "briefing" ? (
          <>
            <p className="eyebrow stagger-item">Sector Combat Briefing</p>
            <h2 id="onboarding-title" className="stagger-item">
              Clear the reach
            </h2>
            <p className="onboarding-lead stagger-item">
              Destroy 3 ships to open the jump gate, then fly through the glowing ring.
            </p>
            <ul className="onboarding-list stagger-item">
              <li>
                <strong>Fly</strong> — W dive, S climb, A left, D right
              </li>
              <li>
                <strong>Boost</strong> — Hold Shift, or BOOST on touch (uses mana)
              </li>
              <li>
                <strong>Fire</strong> — 8-shot clip, then a short reload. Hold Space or FIRE
              </li>
              <li>
                <strong>Super</strong> — F or Q when mana is full (SUPER on touch)
              </li>
              <li>
                <strong>Jump</strong> — After 3 kills, fly into the glowing ring
              </li>
              <li>
                <strong>Talk</strong> — Voice examples: “scan the sector”, “status”, “jump”
              </li>
            </ul>
            <button
              type="button"
              className="onboarding-cta stagger-item"
              onClick={() => setStep("comms")}
            >
              Engage
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow stagger-item">Bridge comms</p>
            <h2 id="onboarding-title" className="stagger-item">
              Open the channel
            </h2>
            <p className="onboarding-lead stagger-item">
              Allow the microphone once before launch. The ship keeps the channel open so
              it will not ask again this session.
            </p>
            {micError ? <p className="onboarding-error stagger-item">{micError}</p> : null}
            <button
              type="button"
              className="onboarding-cta stagger-item"
              onClick={() => void openComms()}
              disabled={micBusy}
            >
              {micBusy ? "Requesting microphone…" : "Enable microphone"}
            </button>
            <button
              type="button"
              className="onboarding-skip stagger-item"
              onClick={finish}
              disabled={micBusy}
            >
              Play without voice
            </button>
          </>
        )}
      </div>
    </div>
  );
}
