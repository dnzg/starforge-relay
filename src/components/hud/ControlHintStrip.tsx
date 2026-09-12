import { useEffect } from "react";

const HINT_TIMEOUT_MS = 10000;

const MEANINGFUL_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
]);

interface ControlHintStripProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ControlHintStrip({ visible, onDismiss }: ControlHintStripProps) {
  useEffect(() => {
    if (!visible) return;

    const timeout = window.setTimeout(onDismiss, HINT_TIMEOUT_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (MEANINGFUL_KEYS.has(event.code)) {
        onDismiss();
      }
    };

    const onCanvasPointer = () => {
      onDismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    const canvas = document.querySelector(".cockpit-canvas");
    canvas?.addEventListener("pointerdown", onCanvasPointer);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
      canvas?.removeEventListener("pointerdown", onCanvasPointer);
    };
  }, [visible, onDismiss]);

  return (
    <div
      className={`control-hint-strip ${visible ? "" : "is-hidden"}`}
      aria-hidden={!visible}
    >
      <span>
        WASD / arrows move · Shift boost · Space fire
      </span>
      <button
        type="button"
        className="control-hint-dismiss"
        onClick={onDismiss}
        tabIndex={visible ? 0 : -1}
      >
        Dismiss
      </button>
    </div>
  );
}
