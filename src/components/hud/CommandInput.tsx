import { useState, type FormEvent } from "react";

interface CommandInputProps {
  onSubmit: (command: string) => Promise<void>;
  disabled?: boolean;
}

const QUICK_COMMANDS = ["scan", "status", "hail", "jump", "engage", "flee"];

export function CommandInput({ onSubmit, disabled }: CommandInputProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (command: string) => {
    if (!command.trim() || disabled || busy) return;
    setBusy(true);
    try {
      await onSubmit(command.trim());
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(value);
  };

  return (
    <div className="command-input-wrap">
      <form className="command-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type command: scan, hail, engage..."
          disabled={disabled || busy}
          autoComplete="off"
          spellCheck={false}
          aria-label="Ship command input"
        />
        <button type="submit" disabled={disabled || busy || !value.trim()}>
          Send
        </button>
      </form>
      <div className="quick-commands">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            className="chip"
            disabled={disabled || busy}
            onClick={() => void submit(cmd)}
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
