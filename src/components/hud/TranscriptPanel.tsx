import { useEffect, useRef } from "react";
import { useGame } from "../../providers/GameProvider";

export function TranscriptPanel() {
  const { logs } = useGame();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <section className="hud-panel transcript-panel">
      <h2>Command Transcript</h2>
      <div className="transcript-scroll">
        {logs.map((entry, idx) => (
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
