interface ControlHintStripProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ControlHintStrip({ visible, onDismiss }: ControlHintStripProps) {
  return (
    <div
      className={`control-hint-strip ${visible ? "" : "is-hidden"}`}
      aria-hidden={!visible}
    >
      <span>
        W dive · S climb · A left · D right · Shift boost · Space fire
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
