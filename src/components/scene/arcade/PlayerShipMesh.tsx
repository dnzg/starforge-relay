import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { PlayerState } from "./types";

interface PlayerShipMeshProps {
  playerRef: RefObject<PlayerState>;
  invulnRef: RefObject<boolean>;
}

export function PlayerShipMesh({ playerRef, invulnRef }: PlayerShipMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;

    if (group.rotation.order !== "YXZ") {
      group.rotation.order = "YXZ";
    }

    group.position.set(player.position.x, -player.pitch * 0.35, player.position.z);
    group.rotation.y = player.rotation;
    group.rotation.x = player.pitch;
    group.rotation.z = player.roll;

    const invulnDt = Math.min(delta, 0.05);
    if (invulnRef.current) {
      group.visible = Math.floor(player.invulnTimer * 20) % 2 === 0;
    } else {
      group.visible = true;
    }

    player.invulnTimer = Math.max(0, player.invulnTimer - invulnDt);
    invulnRef.current = player.invulnTimer > 0;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.35]}>
        <coneGeometry args={[0.35, 1.1, 6]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#0ea5e9" emissiveIntensity={0.35} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.25]}>
        <boxGeometry args={[0.9, 0.12, 0.55]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0.45]}>
        <boxGeometry args={[0.35, 0.08, 0.25]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.55, 0, 0.1]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.45, 0.06, 0.18]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.55, 0, 0.1]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.45, 0.06, 0.18]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 0.3, -0.6]} intensity={0.8} color="#7dd3fc" distance={4} />
    </group>
  );
}
