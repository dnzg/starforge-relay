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
    if (ui.targetType === "enemy") {
      hostileSprite.visible = true;
      hostileSprite.position.set(ui.targetX, 1.35, ui.targetZ);
    } else {
      hostileSprite.visible = false;
    }

    const gate = jumpGateRef.current;
    if (gate?.active) {
      jumpSprite.visible = true;
      jumpSprite.position.set(gate.position.x, 2.15, gate.position.z);
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
