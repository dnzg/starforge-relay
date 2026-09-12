import { useEffect, useState, type CSSProperties } from "react";
import { arcadeUiRef } from "../../lib/combat/arcadeUiRef";

interface TouchControlsProps {
  disabled?: boolean;
  onBoost: (active: boolean) => void;
  onFire: (active: boolean) => void;
  onSuper: (active: boolean) => void;
}

export function TouchControls({
  disabled,
  onBoost,
  onFire,
  onSuper,
}: TouchControlsProps) {
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

  return (
    <div className="touch-controls" aria-hidden={disabled}>
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
