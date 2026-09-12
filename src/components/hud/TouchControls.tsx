import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { arcadeUiRef } from "../../lib/combat/arcadeUiRef";

interface TouchControlsProps {
  disabled?: boolean;
  onMove: (x: number, y: number) => void;
  onBoost: (active: boolean) => void;
  onFire: (active: boolean) => void;
  onSuper: (active: boolean) => void;
}

export function TouchControls({
  disabled,
  onMove,
  onBoost,
  onFire,
  onSuper,
}: TouchControlsProps) {
  const dpadRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const [stickActive, setStickActive] = useState(false);
  const [superReady, setSuperReady] = useState(false);
  const [mana, setMana] = useState(arcadeUiRef.mana);
  const [boostHeld, setBoostHeld] = useState(false);
  const [ammo, setAmmo] = useState(arcadeUiRef.ammo);
  const [reloading, setReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSuperReady(arcadeUiRef.manaReady);
      setMana(arcadeUiRef.mana);
      setAmmo(arcadeUiRef.ammo);
      setReloading(arcadeUiRef.reloading);
      setReloadProgress(arcadeUiRef.reloadProgress);
    }, 80);
    return () => window.clearInterval(interval);
  }, []);

  const placeKnob = useCallback((x: number, y: number) => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const resetStick = useCallback(() => {
    activePointerRef.current = null;
    setStickActive(false);
    placeKnob(0, 0);
    onMove(0, 0);
  }, [onMove, placeKnob]);

  const updateMoveFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = dpadRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const travel = rect.width * 0.32;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > travel && len > 0) {
        dx = (dx / len) * travel;
        dy = (dy / len) * travel;
      }
      placeKnob(dx, dy);
      onMove(travel > 0 ? dx / travel : 0, travel > 0 ? dy / travel : 0);
    },
    [onMove, placeKnob],
  );

  useEffect(() => {
    if (disabled) resetStick();
  }, [disabled, resetStick]);

  const handleDpadStart = (event: React.PointerEvent) => {
    if (disabled) return;
    activePointerRef.current = event.pointerId;
    try {
      dpadRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* capture only works for an active pointer */
    }
    setStickActive(true);
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleDpadMove = (event: React.PointerEvent) => {
    if (disabled || activePointerRef.current !== event.pointerId) return;
    updateMoveFromPointer(event.clientX, event.clientY);
  };

  const handleDpadEnd = (event: React.PointerEvent) => {
    if (activePointerRef.current !== event.pointerId) return;
    resetStick();
  };

  return (
    <div className="touch-controls" aria-hidden={disabled}>
      <div
        ref={dpadRef}
        className={`touch-dpad ${stickActive ? "is-active" : ""}`}
        role="slider"
        aria-label="Move"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={0}
        onPointerDown={handleDpadStart}
        onPointerMove={handleDpadMove}
        onPointerUp={handleDpadEnd}
        onPointerCancel={handleDpadEnd}
      >
        <span className="touch-dpad-ring" />
        <span className="touch-dpad-center">MOVE</span>
        <span ref={knobRef} className="touch-dpad-knob" />
      </div>
      <div className="touch-actions">
        <button
          type="button"
          className={`touch-super ${superReady ? "is-ready" : ""}`}
          disabled={disabled}
          aria-disabled={disabled || !superReady}
          onPointerDown={() => onSuper(true)}
          onPointerUp={() => onSuper(false)}
          onPointerLeave={() => onSuper(false)}
          onPointerCancel={() => onSuper(false)}
        >
          SUPER
        </button>
        <button
          type="button"
          className={`touch-boost ${mana > 0.04 ? "is-hot" : "is-empty"} ${boostHeld && mana > 0 ? "is-on" : ""}`}
          disabled={disabled}
          aria-label="Boost"
          style={{ "--mana": String(mana) } as CSSProperties}
          onPointerDown={() => {
            setBoostHeld(true);
            onBoost(true);
          }}
          onPointerUp={() => {
            setBoostHeld(false);
            onBoost(false);
          }}
          onPointerLeave={() => {
            setBoostHeld(false);
            onBoost(false);
          }}
          onPointerCancel={() => {
            setBoostHeld(false);
            onBoost(false);
          }}
        >
          <span>BOOST</span>
          <small>{Math.round(mana * 100)}</small>
        </button>
        <button
          type="button"
          className={`touch-fire ${reloading ? "is-reloading" : ""}`}
          disabled={disabled}
          style={{ "--reload": String(reloadProgress) } as CSSProperties}
          onPointerDown={() => onFire(true)}
          onPointerUp={() => onFire(false)}
          onPointerLeave={() => onFire(false)}
          onPointerCancel={() => onFire(false)}
        >
          <span>{reloading ? "WAIT" : "FIRE"}</span>
          <small>{reloading ? `${Math.round(reloadProgress * 100)}%` : ammo}</small>
        </button>
      </div>
    </div>
  );
}
