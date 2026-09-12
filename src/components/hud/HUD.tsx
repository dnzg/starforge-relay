import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../../providers/GameProvider";
import { arcadeUiRef, setVoiceWorldSlow } from "../../lib/combat/arcadeUiRef";
import { interpretVoiceTranscript } from "../../lib/voice";
import { parseCommand } from "../../lib/game/commandResolver";
import { pronounsFor } from "../../lib/game/captainProfile";
import { StatusPanel } from "./StatusPanel";
import { TranscriptDrawer, TranscriptPanel } from "./TranscriptPanel";
import { CommandInput } from "./CommandInput";
import { MicButton } from "./MicButton";
import { TouchControls } from "./TouchControls";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { ControlHintStrip } from "./ControlHintStrip";
import { Minimap } from "./Minimap";
import { SectorProgress } from "./SectorProgress";
import { HyperspaceOverlay } from "./HyperspaceOverlay";
import { ShipAiAvatar } from "./ShipAiAvatar";

interface HUDProps {
  onTouchMove: (x: number, y: number) => void;
  onTouchFire: (active: boolean) => void;
  onTouchSuper: (active: boolean) => void;
  garageOpen: boolean;
  onGarageOpenChange: (open: boolean) => void;
}

export function HUD({
  onTouchMove,
  onTouchFire,
  onTouchSuper,
  garageOpen,
  onGarageOpenChange,
}: HUDProps) {
  const {
    run,
    loading,
    sendCommand,
    appendShipMessage,
    sectorKills,
    captain,
    suggestedName,
    completeCaptainSetup,
  } = useGame();
  const disabled = loading || !run || run.status !== "active" || garageOpen;
  const [hintDismissed, setHintDismissed] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const dismissHints = useCallback(() => setHintDismissed(true), []);
  const showHintStrip = !hintDismissed && !briefingOpen;
  const [gateOpen, setGateOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [captionOpen, setCaptionOpen] = useState(false);
  const captionHideRef = useRef(0);
  const voiceLive = voiceListening || voiceProcessing;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGateOpen(arcadeUiRef.jumpGateUnlocked);
    }, 150);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setVoiceWorldSlow(voiceLive);
    return () => setVoiceWorldSlow(false);
  }, [voiceLive]);

  useEffect(() => {
    if (disabled) {
      setVoiceListening(false);
      setVoiceProcessing(false);
      setVoiceWorldSlow(false);
    }
  }, [disabled]);

  useEffect(() => {
    return () => window.clearTimeout(captionHideRef.current);
  }, []);

  const handleTouchMove = useCallback(
    (x: number, y: number) => {
      if (x !== 0 || y !== 0) dismissHints();
      onTouchMove(x, y);
    },
    [dismissHints, onTouchMove],
  );

  const handleTouchFire = useCallback(
    (active: boolean) => {
      if (active) dismissHints();
      onTouchFire(active);
    },
    [dismissHints, onTouchFire],
  );

  const talkContext = useMemo(
    () => ({
      captainName: captain?.name,
      pronouns: captain ? pronounsFor(captain.gender).label : undefined,
      sectorName: run?.sectorName,
      hull: run?.hull,
      shields: run?.shields,
      threatLevel: run?.threatLevel,
      sectorKills,
    }),
    [
      captain,
      run?.hull,
      run?.sectorName,
      run?.shields,
      run?.threatLevel,
      sectorKills,
    ],
  );

  const handleTalk = useCallback(
    async (text: string, source: "text" | "voice") => {
      const direct = parseCommand(text);
      if (direct) {
        await sendCommand(direct, source);
        return;
      }
      const interpreted = await interpretVoiceTranscript(text, talkContext);
      if (interpreted.command) {
        await sendCommand(interpreted.command, source, {
          shipPreamble: interpreted.shipReply,
          heardText: text,
        });
        return;
      }
      await appendShipMessage(text, interpreted.shipReply, source);
    },
    [appendShipMessage, sendCommand, talkContext],
  );

  const showHeardText = useCallback((text: string) => {
    window.clearTimeout(captionHideRef.current);
    setHeardText(text);
    setCaptionOpen(true);
  }, []);

  const handleVoiceTalk = useCallback(
    async (text: string) => {
      window.clearTimeout(captionHideRef.current);
      setHeardText(text);
      setCaptionOpen(true);
      setVoiceListening(false);
      setVoiceProcessing(true);
      try {
        await handleTalk(text, "voice");
      } finally {
        setVoiceProcessing(false);
        captionHideRef.current = window.setTimeout(() => {
          setCaptionOpen(false);
          setHeardText("");
        }, 1600);
      }
    },
    [handleTalk],
  );

  const handleListeningChange = useCallback(
    (listening: boolean, reason?: "cancel" | "result") => {
      window.clearTimeout(captionHideRef.current);
      setVoiceListening(listening);
      if (listening) {
        setHeardText("");
        setCaptionOpen(true);
        return;
      }
      if (reason === "cancel") {
        setCaptionOpen(false);
        setHeardText("");
      }
    },
    [],
  );

  const voicePhase = voiceProcessing
    ? "processing"
    : voiceListening
      ? "listening"
      : "idle";
  const voiceStatus = voiceProcessing
    ? "Working on that…"
    : voiceListening
      ? "Listening…"
      : "";
  const showVoiceCaption = captionOpen && (Boolean(voiceStatus) || Boolean(heardText));

  return (
    <div
      className={`hud-overlay ${logOpen ? "log-is-open" : ""} ${garageOpen ? "garage-is-open" : ""} ${run?.status === "ended" ? "gameover-is-open" : ""}`}
    >
      <OnboardingOverlay
        suggestedName={captain?.name ?? suggestedName}
        onComplete={completeCaptainSetup}
        onReady={() => setBriefingOpen(false)}
      />
      <HyperspaceOverlay />

      <header className="hud-chrome hud-chrome-top">
        <div className="hud-brand-row">
          <ShipAiAvatar />
          <div className="hud-brand">
            <p className="eyebrow">Starforge Relay</p>
            <h1>Sector Combat</h1>
          </div>
        </div>
        <StatusPanel compact />
      </header>

      <div className="hud-objective-stack">
        <SectorProgress />
      </div>

      <Minimap />
      <ControlHintStrip visible={showHintStrip} onDismiss={dismissHints} />

      <TranscriptPanel />
      <TranscriptDrawer open={logOpen} />

      <TouchControls
        disabled={disabled}
        onMove={handleTouchMove}
        onFire={handleTouchFire}
        onSuper={onTouchSuper}
      />

      <footer className={`hud-chrome hud-chrome-bottom ${voiceLive ? "is-voice-live" : ""}`}>
        {showVoiceCaption ? (
          <div className="voice-caption" aria-live="polite">
            {voiceStatus ? <p className="voice-caption-status">{voiceStatus}</p> : null}
            {heardText ? (
              <p className="voice-caption-text">{heardText}</p>
            ) : null}
          </div>
        ) : null}
        <MicButton
          onVoiceResult={handleVoiceTalk}
          onVoiceMock={handleVoiceTalk}
          onListeningChange={handleListeningChange}
          onHeardText={showHeardText}
          phase={voicePhase}
          disabled={disabled}
        />
        <CommandInput
          onSubmit={(text) => handleTalk(text, "text")}
          disabled={disabled}
          jumpReady={gateOpen}
        />
        <div className="hud-footer-actions">
          <button
            type="button"
            className={`log-toggle ${garageOpen ? "is-open" : ""}`}
            onClick={() => onGarageOpenChange(!garageOpen)}
            aria-expanded={garageOpen}
            aria-label={garageOpen ? "Close garage" : "Open garage"}
          >
            Bay
          </button>
          <button
            type="button"
            className={`log-toggle ${logOpen ? "is-open" : ""}`}
            onClick={() => setLogOpen((open) => !open)}
            aria-expanded={logOpen}
            aria-label={logOpen ? "Close bridge log" : "Open bridge log"}
          >
            Log
          </button>
        </div>
      </footer>
    </div>
  );
}
