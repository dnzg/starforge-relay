import { useEffect, useRef } from "react";
import { useGame } from "../../providers/GameProvider";

function speakerLabel(command: string, source: string, speaker?: string) {
  if (speaker === "ship" || command === "boot" || command === "combat") {
    return "Ship";
  }
  if (source === "voice") return "You";
  return "You";
}

export function TranscriptPanel() {
  const { logs } = useGame();
  const latest = logs[logs.length - 1];

  if (!latest) return null;

  return (
    <article className="log-toast" key={`${latest.timestamp}-${latest.command}`}>
      <span className={`source source-${latest.speaker === "ship" ? "ship" : "text"}`}>
        {speakerLabel(latest.command, latest.source, latest.speaker)}
      </span>
      <p>{latest.response}</p>
    </article>
  );
}

export function TranscriptDrawer({ open }: { open: boolean }) {
  const { logs } = useGame();
  const bottomRef = useRef<HTMLDivElement>(null);
  const recentLogs = logs.slice(-8);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, open]);

  return (
    <section
      className={`log-drawer ${open ? "is-open" : ""}`}
      aria-hidden={!open}
    >
      <h2>Bridge</h2>
      <div className="transcript-scroll">
        {recentLogs.length === 0 ? (
          <p className="muted">The ship is quiet.</p>
        ) : null}
        {recentLogs.map((entry, idx) => (
          <article key={`${entry.timestamp}-${idx}`} className="transcript-entry">
            <header>
              <span className={`source source-${entry.speaker === "ship" ? "ship" : "text"}`}>
                {speakerLabel(entry.command, entry.source, entry.speaker)}
              </span>
              {entry.command !== "boot" && entry.command !== "combat" ? (
                <code>{entry.command}</code>
              ) : null}
            </header>
            <p>{entry.response}</p>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
