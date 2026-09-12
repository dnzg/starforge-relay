import { useEffect, useRef } from "react";
import { useGame } from "../../providers/GameProvider";

export function TranscriptPanel() {
  const { logs } = useGame();
  const bottomRef = useRef<HTMLDivElement>(null);
  const recentLogs = logs.slice(-4);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <section className="hud-panel transcript-panel transcript-panel-compact">
      <h2>Bridge Log</h2>
      <div className="transcript-scroll">
        {recentLogs.length === 0 ? (
          <p className="muted">Voice/text helpers available below.</p>
        ) : null}
        {recentLogs.map((entry, idx) => (
          <article key={`${entry.timestamp}-${idx}`} className="transcript-entry">
            <header>
              <span className={`source source-${entry.source}`}>
                {entry.source === "voice" ? "VOICE" : "TEXT"}
              </span>
              <code>{entry.command}</code>
            </header>
            <p>{entry.response}</p>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
