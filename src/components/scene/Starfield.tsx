import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StarfieldProps {
  count?: number;
  depth?: number;
  speed?: number;
  warp?: number;
}

export function Starfield({
  count = 4000,
  depth = 120,
  speed = 0.15,
  warp = 1,
}: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * depth;
      positions[i * 3 + 1] = (Math.random() - 0.5) * depth;
      positions[i * 3 + 2] = -Math.random() * depth;
      velocities[i] = 0.4 + Math.random() * 1.2;
    }
    return { positions, velocities };
  }, [count, depth]);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const warpSpeed = speed * warp * 60;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3 + 2] += velocities[i] * warpSpeed * delta;
      if (positions[i * 3 + 2] > 2) {
        positions[i * 3 + 2] = -depth;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c8d6ff"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
