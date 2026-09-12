import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PlayerState } from "./types";
import { useShipLoadout } from "../../../hooks/useShipLoadout";
import type { WingStyle } from "../../../lib/ship/shipLoadout";
import { arcadeUiRef } from "../../../lib/combat/arcadeUiRef";
import {
  applyHullMaps,
  createCanopyTexture,
  createPlayerHullTextures,
  createPlayerWingTextures,
} from "./shipTextures";
import { playerWreckStage } from "./shipWreck";

interface PlayerShipMeshProps {
  playerRef?: RefObject<PlayerState>;
  invulnRef?: RefObject<boolean>;
  boostIntensityRef?: RefObject<number>;
  preview?: boolean;
}

function applyAfterburner(
  mesh: THREE.Mesh | null,
  material: THREE.MeshBasicMaterial | null,
  length: number,
  width: number,
  opacity: number,
): void {
  if (!mesh || !material) return;
  const baseZ = Number(mesh.userData.baseZ);
  mesh.scale.set(width, length, width);
  mesh.position.z = (Number.isFinite(baseZ) ? baseZ : mesh.position.z) + length * 0.5;
  mesh.visible = opacity > 0.04;
  material.opacity = opacity;
}

function Afterburner({
  meshRef,
  materialRef,
  position,
  radius = 0.058,
}: {
  meshRef: RefObject<THREE.Mesh | null>;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  position: [number, number, number];
  radius?: number;
}) {
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={{ baseZ: position[2] }}
      visible={false}
      raycast={() => null}
    >
      <coneGeometry args={[radius, 1, 8]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ff7a59"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
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
  boostIntensityRef,
  preview = false,
}: PlayerShipMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowLRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowCRef = useRef<THREE.MeshStandardMaterial>(null);
  const flareLRef = useRef<THREE.Mesh>(null);
  const flareRRef = useRef<THREE.Mesh>(null);
  const flareCRef = useRef<THREE.Mesh>(null);
  const flareMatLRef = useRef<THREE.MeshBasicMaterial>(null);
  const flareMatRRef = useRef<THREE.MeshBasicMaterial>(null);
  const flareMatCRef = useRef<THREE.MeshBasicMaterial>(null);
  const noseRef = useRef<THREE.Mesh>(null);
  const wingLRef = useRef<THREE.Mesh>(null);
  const wingRRef = useRef<THREE.Mesh>(null);
  const finRef = useRef<THREE.Mesh>(null);
  const glassRef = useRef<THREE.Mesh>(null);
  const engineLRef = useRef<THREE.Mesh>(null);
  const engineRRef = useRef<THREE.Mesh>(null);
  const wreck1Ref = useRef<THREE.Group>(null);
  const wreck2Ref = useRef<THREE.Group>(null);
  const wreck3Ref = useRef<THREE.Group>(null);
  const fireARef = useRef<THREE.Mesh>(null);
  const fireBRef = useRef<THREE.Mesh>(null);
  const fireCRef = useRef<THREE.Mesh>(null);
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

    const boost = THREE.MathUtils.clamp(boostIntensityRef?.current ?? 0, 0, 1.2);
    const flicker = 1 + Math.sin(clock.elapsedTime * (16 + boost * 28)) * (0.45 + boost * 0.35);
    const pulse = (1.1 + boost * 1.8) * flicker;
    if (glowLRef.current) glowLRef.current.emissiveIntensity = pulse;
    if (glowRRef.current) glowRRef.current.emissiveIntensity = pulse;
    if (glowCRef.current) glowCRef.current.emissiveIntensity = pulse;

    const hull = preview ? 100 : arcadeUiRef.hull;
    const stage = playerWreckStage(hull);
    if (noseRef.current) noseRef.current.visible = stage < 3;
    if (wingLRef.current) wingLRef.current.visible = stage < 2;
    if (wingRRef.current) wingRRef.current.visible = stage < 3;
    if (finRef.current) finRef.current.visible = stage < 3;
    if (glassRef.current) glassRef.current.visible = stage < 3;
    if (engineLRef.current) engineLRef.current.visible = stage < 3;
    if (engineRRef.current) engineRRef.current.visible = stage < 2;
    if (wreck1Ref.current) wreck1Ref.current.visible = stage >= 1;
    if (wreck2Ref.current) wreck2Ref.current.visible = stage >= 2;
    if (wreck3Ref.current) wreck3Ref.current.visible = stage >= 3;

    const firePulse = 0.72 + Math.sin(clock.elapsedTime * 22) * 0.28;
    if (fireARef.current) {
      fireARef.current.scale.set(firePulse, 0.85 + firePulse * 0.4, firePulse);
    }
    if (fireBRef.current) {
      fireBRef.current.scale.set(firePulse * 1.1, 1 + firePulse * 0.55, firePulse * 1.1);
    }
    if (fireCRef.current) {
      fireCRef.current.scale.set(firePulse * 1.25, 1.15 + firePulse * 0.7, firePulse * 1.25);
    }

    const flareLen = 0.22 + boost * 1.35;
    const flareWide = 0.7 + boost * 0.85;
    const flareOpacity = stage >= 2 ? 0.04 + boost * 0.28 : 0.12 + boost * 0.72;
    applyAfterburner(flareLRef.current, flareMatLRef.current, flareLen, flareWide, flareOpacity);
    applyAfterburner(
      flareRRef.current,
      flareMatRRef.current,
      flareLen,
      flareWide,
      stage >= 2 ? 0 : flareOpacity,
    );
    applyAfterburner(
      flareCRef.current,
      flareMatCRef.current,
      flareLen * 0.86,
      flareWide * 0.9,
      stage >= 3 ? 0 : flareOpacity,
    );
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
      <mesh
        ref={noseRef}
        dispose={null}
        position={[0, 0.06, nose.z]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.hull}
      >
        <coneGeometry args={[nose.radius, nose.length, 8]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.08, 0.12]} material={materials.hull}>
        <boxGeometry args={[0.34, 0.1, 0.72]} />
      </mesh>
      <mesh ref={glassRef} dispose={null} position={[0, 0.2, -0.12]} material={materials.glass}>
        <sphereGeometry args={[0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
      </mesh>
      <mesh
        ref={wingRRef}
        dispose={null}
        geometry={wingGeometry}
        position={[0.08, 0.03, 0.06]}
        rotation={[0, 0.08, 0.08]}
        material={materials.wing}
      />
      <mesh
        ref={wingLRef}
        dispose={null}
        geometry={wingGeometry}
        position={[-0.08, 0.03, 0.06]}
        rotation={[0, Math.PI - 0.08, -0.08]}
        material={materials.wing}
      />
      <mesh ref={finRef} dispose={null} position={[0, 0.24, 0.38]} material={materials.hull}>
        <boxGeometry args={[0.045, 0.3, 0.28]} />
      </mesh>
      <mesh dispose={null} position={[0, 0.08, 0.52]} material={materials.wing}>
        <boxGeometry args={[0.42, 0.03, 0.18]} />
      </mesh>
      <mesh
        ref={engineLRef}
        dispose={null}
        position={[-engineSpread, 0.03, 0.62]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.hull}
      >
        <cylinderGeometry args={[0.06, 0.085, 0.3, 10]} />
      </mesh>
      <mesh
        ref={engineRRef}
        dispose={null}
        position={[engineSpread, 0.03, 0.62]}
        rotation={[Math.PI / 2, 0, 0]}
        material={materials.hull}
      >
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
      <Afterburner
        meshRef={flareLRef}
        materialRef={flareMatLRef}
        position={[-engineSpread, 0.03, 0.92]}
      />
      <Afterburner
        meshRef={flareRRef}
        materialRef={flareMatRRef}
        position={[engineSpread, 0.03, 0.92]}
      />
      {showCenterEngine ? (
        <Afterburner
          meshRef={flareCRef}
          materialRef={flareMatCRef}
          position={[0, 0.03, 0.96]}
          radius={0.048}
        />
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
      <group ref={wreck1Ref} visible={false} name="player-wreck-scarred">
        <mesh position={[0.04, 0.16, 0.18]} rotation={[0.15, 0.08, 0.05]} raycast={() => null}>
          <boxGeometry args={[0.22, 0.035, 0.42]} />
          <meshStandardMaterial color="#1a0c0c" roughness={0.92} metalness={0.08} />
        </mesh>
        <mesh position={[-0.1, 0.14, 0.36]} rotation={[0.25, -0.2, 0.2]} raycast={() => null}>
          <boxGeometry args={[0.18, 0.03, 0.26]} />
          <meshStandardMaterial color="#2a1410" roughness={0.95} metalness={0.05} />
        </mesh>
        <mesh position={[0.12, 0.13, 0.42]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.045, 0.06, 0.1, 6]} />
          <meshStandardMaterial color="#0b0707" roughness={1} metalness={0} />
        </mesh>
        <mesh position={[0.02, 0.22, -0.08]} raycast={() => null}>
          <sphereGeometry args={[0.148, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            color="#3a1a1a"
            transparent
            opacity={0.55}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0.2, 0.16, 0.08]} raycast={() => null}>
          <sphereGeometry args={[0.028, 6, 6]} />
          <meshBasicMaterial
            color="#ff7a3a"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group ref={wreck2Ref} visible={false} name="player-wreck-broken">
        <mesh position={[-0.22, 0.04, 0.08]} rotation={[0.15, 0.4, 0.7]} raycast={() => null}>
          <boxGeometry args={[0.16, 0.04, 0.22]} />
          <meshStandardMaterial color="#4a2a24" roughness={0.85} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.16, 0.38]} rotation={[0.4, 0.2, 0.5]} raycast={() => null}>
          <boxGeometry args={[0.04, 0.12, 0.1]} />
          <meshStandardMaterial color="#3f2a28" roughness={0.8} metalness={0.3} />
        </mesh>
        <mesh
          ref={fireARef}
          position={[engineSpread, 0.03, 0.72]}
          rotation={[Math.PI / 2, 0, 0.2]}
          raycast={() => null}
        >
          <coneGeometry args={[0.07, 0.32, 6]} />
          <meshBasicMaterial
            color="#ff5a20"
            transparent
            opacity={0.82}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[engineSpread, 0.08, 0.58]} raycast={() => null}>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshBasicMaterial
            color="#1a1210"
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[-0.18, 0.02, 0.18]} rotation={[0.8, 0.4, 0.2]} raycast={() => null}>
          <boxGeometry args={[0.03, 0.03, 0.28]} />
          <meshStandardMaterial
            color="#c4a574"
            emissive="#de2944"
            emissiveIntensity={0.4}
            metalness={0.7}
            roughness={0.35}
          />
        </mesh>
      </group>
      <group ref={wreck3Ref} visible={false} name="player-wreck-critical">
        <mesh position={[0, 0.06, -0.62]} rotation={[0.5, 0.3, 0.4]} raycast={() => null}>
          <boxGeometry args={[0.16, 0.08, 0.18]} />
          <meshStandardMaterial color="#2b1814" roughness={0.9} metalness={0.15} />
        </mesh>
        <mesh position={[0.2, 0.04, 0.04]} rotation={[-0.3, -0.5, 0.8]} raycast={() => null}>
          <boxGeometry args={[0.14, 0.035, 0.2]} />
          <meshStandardMaterial color="#3a2018" roughness={0.88} metalness={0.2} />
        </mesh>
        <mesh position={[0.1, 0.12, 0.1]} rotation={[0.2, 0, 0.6]} raycast={() => null}>
          <boxGeometry args={[0.22, 0.04, 0.16]} />
          <meshStandardMaterial color="#120808" roughness={1} metalness={0} />
        </mesh>
        <mesh
          ref={fireBRef}
          position={[-engineSpread, 0.05, 0.7]}
          rotation={[Math.PI / 2, 0.15, 0]}
          raycast={() => null}
        >
          <coneGeometry args={[0.08, 0.4, 6]} />
          <meshBasicMaterial
            color="#ff7a2c"
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          ref={fireCRef}
          position={[0, 0.14, 0.02]}
          rotation={[0.8, 0.2, 0]}
          raycast={() => null}
        >
          <coneGeometry args={[0.09, 0.36, 6]} />
          <meshBasicMaterial
            color="#ffb347"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.28, 0.18, 0.22]} rotation={[0.6, 0.8, 0.3]} raycast={() => null}>
          <boxGeometry args={[0.08, 0.04, 0.16]} />
          <meshStandardMaterial color="#6a3a30" roughness={0.7} metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
