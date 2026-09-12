import { useCallback } from "react";
import { useGame } from "../../providers/GameProvider";
import { interpretVoiceTranscript } from "../../lib/voice";
import { StatusPanel } from "./StatusPanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { CommandInput } from "./CommandInput";
import { MicButton } from "./MicButton";
import { TouchControls } from "./TouchControls";

interface HUDProps {
  onTouchMove: (x: number, y: number) => void;
  onTouchFire: (active: boolean) => void;
}

export function HUD({ onTouchMove, onTouchFire }: HUDProps) {
  const { run, loading, sendCommand, appendShipMessage } = useGame();
  const disabled = loading || !run || run.status !== "active";

  const handleText = useCallback(
    async (command: string) => {
      await sendCommand(command, "text");
    },
    [sendCommand],
  );

  const handleVoice = useCallback(
    async (transcript: string) => {
      const interpreted = await interpretVoiceTranscript(transcript);
      if (interpreted.command) {
        await sendCommand(interpreted.command, "voice", {
          shipPreamble: interpreted.shipReply,
          heardText: transcript,
        });
        return;
      }
      await appendShipMessage(transcript, interpreted.shipReply, "voice");
    },
    [appendShipMessage, sendCommand],
  );

  return (
    <div className="hud-overlay">
      <header className="hud-topbar hud-topbar-compact">
        <div>
          <p className="eyebrow">Starforge Relay</p>
          <h1>Sector Combat</h1>
        </div>
        <StatusPanel compact />
      </header>

      <div className="hud-center-spacer" />

      <aside className="hud-side-transcript">
        <TranscriptPanel />
      </aside>

      <footer className="hud-controls hud-controls-compact">
        <TouchControls
          disabled={disabled}
          onMove={onTouchMove}
          onFire={onTouchFire}
        />
        <div className="hud-command-stack">
          <MicButton
            onVoiceResult={handleVoice}
            onVoiceMock={handleVoice}
            disabled={disabled}
          />
          <CommandInput onSubmit={handleText} disabled={disabled} />
        </div>
      </footer>
    </div>
  );
}
