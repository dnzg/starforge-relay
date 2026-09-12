import { useShipAiSpeaker } from "../../lib/voice/useShipAiSpeaker";

export function ShipAiAvatar() {
  const { avatarUrl, speaking, line, ttsAvailable } = useShipAiSpeaker();

  return (
    <figure
      className={`ship-ai-avatar ${speaking ? "is-speaking" : ""}`}
      aria-live="polite"
    >
      <img src={avatarUrl} alt="Ship computer" />
      <figcaption>
        <span className="ship-ai-name">Ship AI</span>
        <span className="ship-ai-state">
          {speaking ? "Speaking" : ttsAvailable ? "Standby" : "Text only"}
        </span>
        {speaking && line ? (
          <span className="ship-ai-line visually-hidden">{line}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}
