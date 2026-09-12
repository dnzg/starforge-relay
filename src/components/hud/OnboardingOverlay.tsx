import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "starforge-relay-onboarding-v1";

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      setVisible(seen !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures in private browsing.
    }
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <p className="eyebrow">Starforge Relay</p>
        <h2 id="onboarding-title">Sector Combat Briefing</h2>
        <p className="onboarding-lead">
          Clear hostile contacts in this sector, then fly into the jump gate to reach the next world.
        </p>

        <ul className="onboarding-list">
          <li>
            <strong>Fly</strong> — W dive / S climb / A/D turn (touch D-pad on mobile)
          </li>
          <li>
            <strong>Boost</strong> — Hold Shift
          </li>
          <li>
            <strong>Fire</strong> — Space, click, or FIRE button
          </li>
          <li>
            <strong>Objective</strong> — Destroy hostiles → Jump gate unlocks → Enter gate to jump
          </li>
        </ul>

        <button type="button" className="onboarding-cta" onClick={dismiss}>
          Engage
        </button>
      </div>
    </div>
  );
}
