import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HyperspaceStreaksProps {
  active: boolean;
}

export function HyperspaceStreaks({ active }: HyperspaceStreaksProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.visible = active;
    if (active) {
      groupRef.current.rotation.z += delta * 0.4;
    }
  });

  if (!active) return null;

  const streaks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const radius = 4 + (i % 5);
    return (
      <mesh
        key={i}
        position={[
          Math.cos(angle) * radius * 0.15,
          Math.sin(angle) * radius * 0.15,
          -8 - (i % 7) * 2,
        ]}
        rotation={[0, 0, angle]}
      >
        <planeGeometry args={[0.05, 6 + (i % 4) * 2]} />
        <meshBasicMaterial
          color="#7ecbff"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    );
  });

  return <group ref={groupRef}>{streaks}</group>;
}
