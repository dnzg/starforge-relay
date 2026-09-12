import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { JumpGateState } from "./types";

interface JumpGateMeshProps {
  gateRef: RefObject<JumpGateState>;
}

export function JumpGateMesh({ gateRef }: JumpGateMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const ring = ringRef.current;
    const gate = gateRef.current;
    if (!group || !gate) return;

    group.visible = gate.active;
    if (!gate.active) return;

    group.position.set(gate.position.x, 0, gate.position.z);
    if (ring) {
      ring.rotation.y += 1.2 * delta;
      const pulse = 0.85 + Math.sin(clock.elapsedTime * 3) * 0.15;
      ring.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.12, 12, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.4}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.06, 8, 24]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#0284c7"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={1.2} color="#38bdf8" distance={8} />
    </group>
  );
}
