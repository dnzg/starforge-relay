import { useEffect, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { arcadeUiRef } from "../../../lib/combat/arcadeUiRef";
import {
  createHudLabelSprite,
  createHudLabelTexture,
} from "../../../lib/combat/hudLabelSprite";
import type { JumpGateState } from "./types";

interface WorldObjectiveLabelsProps {
  jumpGateRef: RefObject<JumpGateState>;
}

export function WorldObjectiveLabels({ jumpGateRef }: WorldObjectiveLabelsProps) {
  const hostileTexture = useMemo(
    () => createHudLabelTexture("HOSTILE", "#7f1d1d", "#fecaca"),
    [],
  );
  const jumpTexture = useMemo(
    () => createHudLabelTexture("JUMP", "#0e7490", "#a5f3fc"),
    [],
  );
  const hostileSprite = useMemo(
    () => createHudLabelSprite(hostileTexture, 1.85, 0.46),
    [hostileTexture],
  );
  const jumpSprite = useMemo(
    () => createHudLabelSprite(jumpTexture, 2.2, 0.54),
    [jumpTexture],
  );

  useEffect(() => {
    return () => {
      hostileSprite.material.dispose();
      jumpSprite.material.dispose();
      hostileTexture.dispose();
      jumpTexture.dispose();
    };
  }, [hostileSprite, jumpSprite, hostileTexture, jumpTexture]);

  useFrame(() => {
    const ui = arcadeUiRef;
    const scaleFor = (x: number, z: number, baseX: number, baseY: number) => {
      const dist = Math.hypot(x - ui.playerX, z - ui.playerZ);
      const grow = Math.min(2.4, Math.max(1, dist / 12));
      return { x: baseX * grow, y: baseY * grow };
    };

    if (ui.targetType === "enemy") {
      hostileSprite.visible = true;
      hostileSprite.position.set(ui.targetX, 1.35, ui.targetZ);
      const s = scaleFor(ui.targetX, ui.targetZ, 1.85, 0.46);
      hostileSprite.scale.set(s.x, s.y, 1);
    } else {
      hostileSprite.visible = false;
    }

    const gate = jumpGateRef.current;
    if (gate?.active) {
      jumpSprite.visible = true;
      jumpSprite.position.set(gate.position.x, 2.15, gate.position.z);
      const s = scaleFor(gate.position.x, gate.position.z, 2.4, 0.6);
      jumpSprite.scale.set(s.x, s.y, 1);
    } else {
      jumpSprite.visible = false;
    }
  });

  return (
    <group name="objective-labels">
      <primitive object={hostileSprite} />
      <primitive object={jumpSprite} />
    </group>
  );
}
