import { useMemo } from "react";
import * as THREE from "three";

interface SectorBackdropProps {
  seed: number;
}

function hashed(seed: number, salt: number): number {
  const n = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function SectorBackdrop({ seed }: SectorBackdropProps) {
  const bodies = useMemo(() => {
    const count = 1 + (Math.abs(seed) % 2);
    return Array.from({ length: count }, (_, i) => {
      const angle = hashed(seed, i + 1) * Math.PI * 2;
      const dist = 90 + hashed(seed, i + 4) * 50;
      const y = -22 - hashed(seed, i + 8) * 18;
      const radius = 3.5 + hashed(seed, i + 11) * 5;
      const color = new THREE.Color().setHSL(
        (0.02 + hashed(seed, i + 15) * 0.08) % 1,
        0.35,
        0.22 + hashed(seed, i + 19) * 0.12,
      );
      return {
        position: [
          Math.cos(angle) * dist,
          y,
          Math.sin(angle) * dist - 40,
        ] as [number, number, number],
        radius,
        color,
      };
    });
  }, [seed]);

  return (
    <group name="sector-backdrop">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshBasicMaterial
          color="#0a080b"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      {bodies.map((body, index) => (
        <mesh key={index} position={body.position}>
          <sphereGeometry args={[body.radius, 24, 16]} />
          <meshStandardMaterial
            color={body.color}
            roughness={1}
            metalness={0}
            emissive={body.color}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}
