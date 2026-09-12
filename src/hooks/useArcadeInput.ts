import { useEffect, useRef, useCallback } from "react";

export interface ArcadeInputState {
  moveX: number;
  moveY: number;
  boost: boolean;
  fire: boolean;
  firePressed: boolean;
}

const INITIAL: ArcadeInputState = {
  moveX: 0,
  moveY: 0,
  boost: false,
  fire: false,
  firePressed: false,
};

export function useArcadeInput(enabled: boolean) {
  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    fire: false,
  });
  const touchRef = useRef({ moveX: 0, moveY: 0, fire: false });
  const fireLatchRef = useRef(false);
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

    stateRef.current = {
      moveX,
      moveY,
      boost: k.boost,
      fire,
      firePressed,
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
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
        default:
          break;
      }
      recompute();
    };

    const onMouseDown = () => {
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

  const getState = useCallback(() => stateRef.current, []);

  return { getState, setTouchMove, setTouchFire };
}
