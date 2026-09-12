import { useCallback, useEffect, useRef } from "react";

interface TouchSteerZoneProps {
  disabled?: boolean;
  onMove: (x: number, y: number) => void;
}

const MAX_TRAVEL_RATIO = 0.14;

export function TouchSteerZone({ disabled, onMove }: TouchSteerZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const anchorRef = useRef({ x: 0, y: 0 });

  const resetSteer = useCallback(() => {
    activePointerRef.current = null;
    onMove(0, 0);
  }, [onMove]);

  const updateMoveFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const zone = zoneRef.current;
      if (!zone) return;
      const rect = zone.getBoundingClientRect();
      const maxTravel = Math.min(rect.width, rect.height) * MAX_TRAVEL_RATIO;
      let dx = clientX - anchorRef.current.x;
      let dy = clientY - anchorRef.current.y;
      const len = Math.hypot(dx, dy);
      if (len > maxTravel && len > 0) {
        dx = (dx / len) * maxTravel;
        dy = (dy / len) * maxTravel;
      }
      onMove(maxTravel > 0 ? dx / maxTravel : 0, maxTravel > 0 ? dy / maxTravel : 0);
    },
    [onMove],
  );

  useEffect(() => {
    if (disabled) resetSteer();
  }, [disabled, resetSteer]);

  const handleStart = (event: React.PointerEvent) => {
    if (disabled) return;
    if (event.pointerType === "mouse") return;
    activePointerRef.current = event.pointerId;
    anchorRef.current = { x: event.clientX, y: event.clientY };
    try {
      zoneRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* capture only works for an active pointer */
    }
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleMove = (event: React.PointerEvent) => {
    if (disabled || activePointerRef.current !== event.pointerId) return;
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleEnd = (event: React.PointerEvent) => {
    if (activePointerRef.current !== event.pointerId) return;
    resetSteer();
  };

  return (
    <div
      ref={zoneRef}
      className="touch-steer-zone"
      aria-hidden={disabled}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
    />
  );
}
