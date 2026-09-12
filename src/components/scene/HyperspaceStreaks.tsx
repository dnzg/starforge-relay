import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HyperspaceStreaksProps {
  active: boolean;
}

const STREAK_COUNT = 48;

export function HyperspaceStreaks({ active }: HyperspaceStreaksProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const streaks = useMemo(
    () =>
      Array.from({ length: STREAK_COUNT }, (_, i) => {
        const angle = (i / STREAK_COUNT) * Math.PI * 2;
        const radius = 0.35 + (i % 7) * 0.18;
        return {
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * 0.72,
            -4 - (i % 9) * 1.6,
          ] as [number, number, number],
          rotation: [Math.PI / 2, 0, angle] as [number, number, number],
          length: 10 + (i % 5) * 3.2,
        };
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.visible = active;
    if (!active) return;
    groupRef.current.rotation.z += delta * 1.15;
    groupRef.current.position.z += delta * 18;
    if (groupRef.current.position.z > 6) {
      groupRef.current.position.z = 0;
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.45 + Math.sin(performance.now() * 0.006) * 0.2;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} name="hyperspace-streaks">
      {streaks.map((streak, i) => (
        <mesh key={i} position={streak.position} rotation={streak.rotation}>
          <planeGeometry args={[0.04, streak.length]} />
          <meshBasicMaterial
            ref={i === 0 ? materialRef : undefined}
            color={i % 3 === 0 ? "#f1697e" : "#ffd6c8"}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
