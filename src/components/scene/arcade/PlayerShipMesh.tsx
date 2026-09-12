import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PlayerState } from "./types";
import { useShipLoadout } from "../../../hooks/useShipLoadout";
import type { WingStyle } from "../../../lib/ship/shipLoadout";
import {
  applyHullMaps,
  createCanopyTexture,
  createPlayerHullTextures,
  createPlayerWingTextures,
} from "./shipTextures";

interface PlayerShipMeshProps {
  playerRef?: RefObject<PlayerState>;
  invulnRef?: RefObject<boolean>;
  preview?: boolean;
}

function createPlayerWing(style: WingStyle): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (style === "wide") {
    shape.moveTo(0, -0.28);
    shape.lineTo(1.25, -0.02);
    shape.lineTo(1.2, 0.2);
    shape.lineTo(0.08, 0.32);
    shape.lineTo(0, 0.2);
  } else if (style === "delta") {
    shape.moveTo(0, -0.08);
    shape.lineTo(0.72, 0.42);
    shape.lineTo(0.08, 0.48);
    shape.lineTo(0, 0.22);
  } else {
    shape.moveTo(0, -0.22);
    shape.lineTo(0.95, -0.04);
    shape.lineTo(0.92, 0.16);
    shape.lineTo(0.08, 0.28);
    shape.lineTo(0, 0.2);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 1,
  });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function PlayerShipMesh({
  playerRef,
  invulnRef,
  preview = false,
}: PlayerShipMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowLRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowCRef = useRef<THREE.MeshStandardMaterial>(null);
  const { loadout } = useShipLoadout();

  const hullMaps = useMemo(() => createPlayerHullTextures(), []);
  const wingMaps = useMemo(() => createPlayerWingTextures(), []);
  const canopyMap = useMemo(() => createCanopyTexture(), []);
  const wingGeometry = useMemo(
    () => createPlayerWing(loadout.wings),
    [loadout.wings],
  );

  const materials = useMemo(() => {
    const hull = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#de2944",
      emissiveIntensity: 0.22,
      metalness: 0.58,
      roughness: 0.42,
    });
    applyHullMaps(hull, hullMaps, 1.6);

    const wing = new THREE.MeshStandardMaterial({
      color: "#d8d6dc",
      emissive: "#3a1218",
      emissiveIntensity: 0.18,
      metalness: 0.65,
      roughness: 0.42,
    });
    applyHullMaps(wing, wingMaps, 1.2);

    const glass = new THREE.MeshStandardMaterial({
      map: canopyMap,
      color: "#9ad8ff",
      emissive: "#2a6f8f",
      emissiveIntensity: 0.35,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.92,
    });

    return { hull, wing, glass };
  }, [canopyMap, hullMaps, wingMaps]);

  useEffect(() => {
    if (!loadout.textureUrl) return;
    const loader = new THREE.TextureLoader();
    const texture = loader.load(loadout.textureUrl, (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(1.4, 1.4);
      map.anisotropy = 4;
      materials.hull.map = map;
      materials.wing.map = map;
      materials.hull.needsUpdate = true;
      materials.wing.needsUpdate = true;
    });
    return () => {
      texture.dispose();
    };
  }, [loadout.textureUrl, materials]);

  useEffect(
    () => () => {
      hullMaps.dispose();
      wingMaps.dispose();
      canopyMap.dispose();
      wingGeometry.dispose();
      materials.hull.dispose();
      materials.wing.dispose();
      materials.glass.dispose();
    },
    [canopyMap, hullMaps, materials, wingGeometry, wingMaps],
  );

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (group.rotation.order !== "YXZ") {
      group.rotation.order = "YXZ";
    }

    if (preview) {
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.visible = true;
    } else if (playerRef?.current) {
      const player = playerRef.current;
      group.position.set(player.position.x, -player.pitch * 0.35, player.position.z);
      group.rotation.y = player.rotation;
      group.rotation.x = player.pitch;
      group.rotation.z = player.roll;

      if (invulnRef?.current) {
        group.visible = Math.floor(player.invulnTimer * 18) % 2 === 0;
      } else {
        group.visible = true;
      }

      player.invulnTimer = Math.max(0, player.invulnTimer - delta);
      if (invulnRef) invulnRef.current = player.invulnTimer > 0;
    }

    const pulse = 1.1 + Math.sin(clock.elapsedTime * 16) * 0.45;
    if (glowLRef.current) glowLRef.current.emissiveIntensity = pulse;
    if (glowRRef.current) glowRRef.current.emissiveIntensity = pulse;
    if (glowCRef.current) glowCRef.current.emissiveIntensity = pulse;
  });

  const nose =
    loadout.nose === "needle"
      ? { radius: 0.1, length: 0.58, z: -0.88 }
      : loadout.nose === "blunt"
        ? { radius: 0.2, length: 0.28, z: -0.7 }
        : { radius: 0.15, length: 0.4, z: -0.78 };

  const engineSpread = loadout.engines === "inline" ? 0.14 : 0.2;
  const showCenterEngine = loadout.engines === "triple";

  return (
    <group ref={groupRef} name="player-fighter" scale={1.28}>
      <mesh dispose={null} position={[0, 0.07, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={materials.hull}>
        <capsuleGeometry args={[0.15, 1.05, 6, 12]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.06, nose.z]} rotation={[Math.PI / 2, 0, 0]} material={materials.hull}>
        <coneGeometry args={[nose.radius, nose.length, 8]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.08, 0.12]} material={materials.hull}>
        <boxGeometry args={[0.34, 0.1, 0.72]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.2, -0.12]} material={materials.glass}>
        <sphereGeometry args={[0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
      </mesh>
      <mesh
        dispose={null}
        geometry={wingGeometry}
        position={[0.08, 0.03, 0.06]}
        rotation={[0, 0.08, 0.08]}
        material={materials.wing}
      />
      <mesh
        dispose={null}
        geometry={wingGeometry}
        position={[-0.08, 0.03, 0.06]}
        rotation={[0, Math.PI - 0.08, -0.08]}
        material={materials.wing}
      />
      <mesh dispose={null} position={[0, 0.24, 0.38]} material={materials.hull}>
        <boxGeometry args={[0.045, 0.3, 0.28]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.08, 0.52]} material={materials.wing}>
        <boxGeometry args={[0.42, 0.03, 0.18]} />
      </mesh>
      <mesh dispose={null} position={[-engineSpread, 0.03, 0.62]} rotation={[Math.PI / 2, 0, 0]} material={materials.hull}>
        <cylinderGeometry args={[0.06, 0.085, 0.3, 10]} />
      </mesh>
      <mesh dispose={null} position={[engineSpread, 0.03, 0.62]} rotation={[Math.PI / 2, 0, 0]} material={materials.hull}>
        <cylinderGeometry args={[0.06, 0.085, 0.3, 10]} />
      </mesh>
      {showCenterEngine ? (
        <mesh dispose={null} position={[0, 0.03, 0.66]} rotation={[Math.PI / 2, 0, 0]} material={materials.hull}>
          <cylinderGeometry args={[0.05, 0.07, 0.28, 10]} />
        </mesh>
      ) : null}
      <mesh position={[-engineSpread, 0.03, 0.8]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial
          ref={glowLRef}
          color="#ffb4a2"
          emissive="#de2944"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[engineSpread, 0.03, 0.8]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial
          ref={glowRRef}
          color="#ffb4a2"
          emissive="#de2944"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {showCenterEngine ? (
        <mesh position={[0, 0.03, 0.84]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial
            ref={glowCRef}
            color="#ffb4a2"
            emissive="#de2944"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh dispose={null} position={[-0.42, 0.05, -0.12]} material={materials.hull}>
        <boxGeometry args={[0.09, 0.05, 0.26]} />
      </mesh>
      <mesh dispose={null} position={[0.42, 0.05, -0.12]} material={materials.hull}>
        <boxGeometry args={[0.09, 0.05, 0.26]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0.04]}>
        <circleGeometry args={[0.72, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}
