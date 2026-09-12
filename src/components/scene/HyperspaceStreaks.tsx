import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HYPERSPACE_SECONDS } from "../../lib/game/hyperspace";

interface HyperspaceStreaksProps {
  active: boolean;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const STREAK_NEAR = 1.1;
const STREAK_FAR = 42;

function streakCount(): number {
  if (typeof window === "undefined") return 56;
  const mobile =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.innerWidth < 768;
  return mobile ? 48 : 72;
}

function washOpacity(t: number): number {
  if (t < 0.12) return (t / 0.12) * 0.72;
  if (t < 0.55) return 0.72 - ((t - 0.12) / 0.43) * 0.5;
  if (t < 0.82) return 0.22 + ((t - 0.55) / 0.27) * 0.1;
  const arrival = (t - 0.82) / 0.18;
  return arrival < 0.45 ? 0.32 + arrival * 1.2 : Math.max(0, 0.86 - (arrival - 0.45) * 1.6);
}

function fovPunch(t: number): number {
  if (t < 0.14) return t / 0.14;
  if (t > 0.78) return Math.max(0, 1 - (t - 0.78) / 0.22);
  return 1;
}

function smoothstep(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export function HyperspaceStreaks({ active }: HyperspaceStreaksProps) {
  const rootRef = useRef<THREE.Group>(null);
  const streakRef = useRef<THREE.InstancedMesh>(null);
  const washRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const ageRef = useRef(0);
  const wasActiveRef = useRef(false);
  const baseFovRef = useRef<number | null>(null);
  const count = useMemo(() => streakCount(), []);

  const { radii, angles, speeds, lengths, hues } = useMemo(() => {
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const lengths = new Float32Array(count);
    const hues = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      radii[i] = 0.9 + (i % 11) * 0.62 + (i % 3) * 0.18;
      angles[i] = (i / count) * Math.PI * 2 + (i % 5) * 0.17;
      speeds[i] = 28 + (i % 9) * 4.5;
      lengths[i] = 1.6 + (i % 6) * 0.55;
      hues[i] = i % 4 === 0 ? 0.85 : i % 3 === 0 ? 0.35 : 0.12;
    }
    return { radii, angles, speeds, lengths, hues };
  }, [count]);

  const zs = useMemo(() => {
    const values = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = -((i * 2.7) % STREAK_FAR) - STREAK_NEAR;
    }
    return values;
  }, [count]);

  useLayoutEffect(() => {
    const mesh = streakRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      hideStreak(mesh, i);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame(({ camera }, delta) => {
    const root = rootRef.current;
    const streaks = streakRef.current;
    const wash = washRef.current;
    const ringA = ringARef.current;
    const ringB = ringBRef.current;
    if (!root || !streaks || !wash || !ringA || !ringB) return;

    const cam = camera as THREE.PerspectiveCamera;
    if (baseFovRef.current == null) {
      baseFovRef.current = cam.fov;
    }

    root.position.copy(camera.position);
    root.quaternion.copy(camera.quaternion);

    if (active && !wasActiveRef.current) {
      ageRef.current = 0;
      wasActiveRef.current = true;
      for (let i = 0; i < count; i++) {
        zs[i] = -((i * 2.7) % STREAK_FAR) - STREAK_NEAR;
      }
    }

    if (!active) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        cam.fov = baseFovRef.current;
        cam.updateProjectionMatrix();
      }
      root.visible = false;
      return;
    }

    root.visible = true;
    const dt = Math.min(delta, 0.05);
    ageRef.current += dt;
    const t = Math.min(1, ageRef.current / HYPERSPACE_SECONDS);
    const punch = smoothstep(fovPunch(t));
    cam.fov = baseFovRef.current + 22 * punch;
    cam.updateProjectionMatrix();

    const washMat = wash.material as THREE.MeshBasicMaterial;
    washMat.opacity = THREE.MathUtils.clamp(washOpacity(t), 0, 0.92);
    washMat.color.set(t > 0.82 ? "#f8fbff" : "#9ad8ff");

    const ringPulse = 0.4 + t * 5.5;
    ringA.scale.setScalar(ringPulse);
    ringB.scale.setScalar(ringPulse * 0.62 + 0.35);
    (ringA.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    (ringB.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t * 0.85);
    ringA.rotation.z += dt * 1.8;
    ringB.rotation.z -= dt * 1.25;

    for (let i = 0; i < count; i++) {
      zs[i]! += speeds[i]! * dt * (1.15 + punch * 0.9);
      if (zs[i]! > -STREAK_NEAR) {
        zs[i] = -STREAK_FAR;
      }
      const radius = radii[i]!;
      _dummy.position.set(
        Math.cos(angles[i]!) * radius,
        Math.sin(angles[i]!) * radius,
        zs[i]!,
      );
      const stretch = lengths[i]! * (1.4 + punch * 2.1);
      _dummy.scale.set(1, 1, stretch);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      streaks.setMatrixAt(i, _dummy.matrix);
      _color.set(hues[i]! > 0.6 ? "#e0f2fe" : hues[i]! > 0.3 ? "#7dd3fc" : "#38bdf8");
      streaks.setColorAt(i, _color);
    }
    streaks.instanceMatrix.needsUpdate = true;
    if (streaks.instanceColor) streaks.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={rootRef} visible={false}>
      <instancedMesh
        ref={streakRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.035, 0.035, 1]} />
        <meshBasicMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <mesh ref={washRef} position={[0, 0, -1.15]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial
          color="#9ad8ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringARef} position={[0, 0, -6]}>
        <ringGeometry args={[1.1, 1.28, 48]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringBRef} position={[0, 0, -4.2]}>
        <ringGeometry args={[0.7, 0.86, 40]} />
        <meshBasicMaterial
          color="#e0f2fe"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function hideStreak(mesh: THREE.InstancedMesh, index: number): void {
  _dummy.position.set(0, 0, -80);
  _dummy.scale.setScalar(0);
  _dummy.rotation.set(0, 0, 0);
  _dummy.updateMatrix();
  mesh.setMatrixAt(index, _dummy.matrix);
}
