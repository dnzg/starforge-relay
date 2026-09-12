import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadCaptainProfile,
  saveCaptainProfile,
  type CaptainGender,
} from "../../lib/game/captainProfile";

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
  const [step, setStep] = useState<"identity" | "briefing">("identity");
  const [visible, setVisible] = useState(!existing);
  const [name, setName] = useState(existing?.name ?? (suggestedName === "Captain" ? "" : suggestedName));
  const [gender, setGender] = useState<CaptainGender>(existing?.gender ?? "they");

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
        ) : (
          <>
            <p className="eyebrow stagger-item">Sector Combat Briefing</p>
            <h2 id="onboarding-title" className="stagger-item">
              Clear the reach
            </h2>
            <p className="onboarding-lead stagger-item">
              Destroy 3 hostile ships to unlock the jump gate. Follow the JUMP marker and fly through the glowing ring.
            </p>
            <ul className="onboarding-list stagger-item">
              <li>
                <strong>Move</strong> — W up, S down, A left, D right
              </li>
              <li>
                <strong>Boost</strong> — Hold Shift
              </li>
              <li>
                <strong>Fire</strong> — Hold Space, click the sector, or FIRE
              </li>
              <li>
                <strong>Jump</strong> — After 3 kills, fly into the JUMP gate
              </li>
              <li>
                <strong>Talk</strong> — Voice examples: “scan the sector”, “status”, “jump”
              </li>
            </ul>
            <button type="button" className="onboarding-cta stagger-item" onClick={finish}>
              Engage
            </button>
          </>
        )}
      </div>
    </div>
  );
}
