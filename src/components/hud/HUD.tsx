import { useCallback } from "react";
import { useGame } from "../../providers/GameProvider";
import { interpretVoiceTranscript } from "../../lib/voice";
import { StatusPanel } from "./StatusPanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { CommandInput } from "./CommandInput";
import { MicButton } from "./MicButton";

export function HUD() {
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
      <header className="hud-topbar">
        <div>
          <p className="eyebrow">Starforge Relay</p>
          <h1>Command Bridge</h1>
        </div>
        <p className="run-status">
          {run ? `Run: ${run.status.toUpperCase()}` : "Booting..."}
        </p>
      </header>

      <div className="hud-grid">
        <StatusPanel />
        <TranscriptPanel />
      </div>

      <footer className="hud-controls">
        <MicButton
          onVoiceResult={handleVoice}
          onVoiceMock={handleVoice}
          disabled={disabled}
        />
        <CommandInput onSubmit={handleText} disabled={disabled} />
      </footer>
    </div>
  );
}
