import { useEffect, useRef, useCallback } from "react";

export interface ArcadeInputState {
  moveX: number;
  moveY: number;
  boost: boolean;
  fire: boolean;
  firePressed: boolean;
  superPressed: boolean;
}

const INITIAL: ArcadeInputState = {
  moveX: 0,
  moveY: 0,
  boost: false,
  fire: false,
  firePressed: false,
  superPressed: false,
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function isCanvasTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("canvas"));
}

export function useArcadeInput(enabled: boolean) {
  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    fire: false,
    super: false,
  });
  const touchRef = useRef({ moveX: 0, moveY: 0, fire: false, super: false });
  const fireLatchRef = useRef(false);
  const superLatchRef = useRef(false);
  const stateRef = useRef<ArcadeInputState>({ ...INITIAL });

  const recompute = useCallback(() => {
    const k = keysRef.current;
    const t = touchRef.current;

    let moveX = 0;
    let moveY = 0;
    if (k.left) moveX -= 1;
    if (k.right) moveX += 1;
    if (k.up) moveY -= 1;
    if (k.down) moveY += 1;

    moveX += t.moveX;
    moveY += t.moveY;

    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    const fire = k.fire || t.fire;
    const firePressed = fire && !fireLatchRef.current;
    if (firePressed) {
      fireLatchRef.current = true;
    }
    if (!fire) {
      fireLatchRef.current = false;
    }

    const superHeld = k.super || t.super;
    const superPressed = superHeld && !superLatchRef.current;
    if (superPressed) {
      superLatchRef.current = true;
    }
    if (!superHeld) {
      superLatchRef.current = false;
    }

    stateRef.current = {
      moveX,
      moveY,
      boost: k.boost,
      fire,
      firePressed,
      superPressed,
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          keysRef.current.up = true;
          event.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          keysRef.current.down = true;
          event.preventDefault();
          break;
        case "ArrowLeft":
        case "KeyA":
          keysRef.current.left = true;
          event.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          keysRef.current.right = true;
          event.preventDefault();
          break;
        case "ShiftLeft":
        case "ShiftRight":
          keysRef.current.boost = true;
          break;
        case "Space":
          keysRef.current.fire = true;
          event.preventDefault();
          break;
        case "KeyF":
        case "KeyQ":
          keysRef.current.super = true;
          event.preventDefault();
          break;
        default:
          break;
      }
      recompute();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          keysRef.current.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          keysRef.current.down = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          keysRef.current.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          keysRef.current.right = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          keysRef.current.boost = false;
          break;
        case "Space":
          keysRef.current.fire = false;
          break;
        case "KeyF":
        case "KeyQ":
          keysRef.current.super = false;
          break;
        default:
          break;
      }
      recompute();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!isCanvasTarget(event.target)) return;
      keysRef.current.fire = true;
      recompute();
    };

    const onMouseUp = () => {
      keysRef.current.fire = false;
      recompute();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [enabled, recompute]);

  const setTouchMove = useCallback(
    (moveX: number, moveY: number) => {
      touchRef.current.moveX = moveX;
      touchRef.current.moveY = moveY;
      recompute();
    },
    [recompute],
  );

  const setTouchFire = useCallback(
    (active: boolean) => {
      touchRef.current.fire = active;
      recompute();
    },
    [recompute],
  );

  const setTouchSuper = useCallback(
    (active: boolean) => {
      touchRef.current.super = active;
      recompute();
    },
    [recompute],
  );

  const getState = useCallback(() => stateRef.current, []);

  return { getState, setTouchMove, setTouchFire, setTouchSuper };
}
