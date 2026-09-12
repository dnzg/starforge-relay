import { useCallback, useRef } from "react";

interface TouchControlsProps {
  disabled?: boolean;
  onMove: (x: number, y: number) => void;
  onFire: (active: boolean) => void;
}

export function TouchControls({
  disabled,
  onMove,
  onFire,
}: TouchControlsProps) {
  const dpadRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);

  const updateMoveFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = dpadRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const max = rect.width * 0.38;
      const clampedX = Math.max(-1, Math.min(1, dx / max));
      const clampedY = Math.max(-1, Math.min(1, dy / max));
      onMove(clampedX, clampedY);
    },
    [onMove],
  );

  const handleDpadStart = (event: React.PointerEvent) => {
    if (disabled) return;
    activePointerRef.current = event.pointerId;
    dpadRef.current?.setPointerCapture(event.pointerId);
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleDpadMove = (event: React.PointerEvent) => {
    if (disabled || activePointerRef.current !== event.pointerId) return;
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleDpadEnd = (event: React.PointerEvent) => {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    onMove(0, 0);
  };

  return (
    <div className="touch-controls" aria-hidden={disabled}>
      <div
        ref={dpadRef}
        className="touch-dpad"
        onPointerDown={handleDpadStart}
        onPointerMove={handleDpadMove}
        onPointerUp={handleDpadEnd}
        onPointerCancel={handleDpadEnd}
      >
        <span className="touch-dpad-ring" />
        <span className="touch-dpad-center">MOVE</span>
      </div>
      <button
        type="button"
        className="touch-fire"
        disabled={disabled}
        onPointerDown={() => onFire(true)}
        onPointerUp={() => onFire(false)}
        onPointerLeave={() => onFire(false)}
        onPointerCancel={() => onFire(false)}
      >
        FIRE
      </button>
    </div>
  );
}
