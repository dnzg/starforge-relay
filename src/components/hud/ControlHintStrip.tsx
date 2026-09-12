interface ControlHintStripProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ControlHintStrip({ visible, onDismiss }: ControlHintStripProps) {
  if (!visible) return null;

  return (
    <div className="control-hint-strip">
      <span>
        W dive · S climb · A/D turn · Shift boost · Space fire · Clear hostiles → Jump gate
      </span>
      <button type="button" className="control-hint-dismiss" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
