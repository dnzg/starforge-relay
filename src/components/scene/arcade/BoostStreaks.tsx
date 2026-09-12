import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BoostStreaksProps {
  intensityRef: RefObject<number>;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const STREAK_NEAR = 2.4;
const STREAK_FAR = 22;
const HOT = new THREE.Color("#ffe7d2");
const CORAL = new THREE.Color("#ff7a59");
const CRIMSON = new THREE.Color("#de2944");

function streakCount(): number {
  if (typeof window === "undefined") return 40;
  const mobile =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.innerWidth < 768;
  return mobile ? 32 : 48;
}

export function BoostStreaks({ intensityRef }: BoostStreaksProps) {
  const rootRef = useRef<THREE.Group>(null);
  const streakRef = useRef<THREE.InstancedMesh>(null);
  const washRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringAgeRef = useRef(10);
  const prevIntensityRef = useRef(0);
  const count = useMemo(() => streakCount(), []);

  const { radii, angles, speeds, lengths, tones } = useMemo(() => {
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const lengths = new Float32Array(count);
    const tones = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      radii[i] = 1.85 + (i % 9) * 0.42 + (i % 4) * 0.12;
      angles[i] = (i / count) * Math.PI * 2 + (i % 7) * 0.11;
      speeds[i] = 18 + (i % 8) * 3.4;
      lengths[i] = 1.05 + (i % 5) * 0.38;
      tones[i] = i % 5 === 0 ? 0.9 : i % 3 === 0 ? 0.45 : 0.12;
    }
    return { radii, angles, speeds, lengths, tones };
  }, [count]);

  const zs = useMemo(() => {
    const values = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      values[i] = -((i * 1.9) % STREAK_FAR) - STREAK_NEAR;
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
    const ring = ringRef.current;
    if (!root || !streaks || !wash || !ring) return;

    const intensity = THREE.MathUtils.clamp(intensityRef.current, 0, 1.2);
    const dt = Math.min(delta, 0.05);

    if (intensity > 0.18 && prevIntensityRef.current <= 0.18) {
      ringAgeRef.current = 0;
    }
    prevIntensityRef.current = intensity;
    ringAgeRef.current += dt;

    if (intensity < 0.012 && ringAgeRef.current > 0.55) {
      root.visible = false;
      return;
    }

    root.visible = true;
    root.position.copy(camera.position);
    root.quaternion.copy(camera.quaternion);
    (streaks.material as THREE.MeshBasicMaterial).opacity =
      0.2 + Math.min(1, intensity) * 0.75;

    const washMat = wash.material as THREE.MeshBasicMaterial;
    washMat.opacity = intensity * 0.11;
    const ringAge = ringAgeRef.current;
    const ringLife = THREE.MathUtils.clamp(1 - ringAge / 0.42, 0, 1);
    ring.scale.setScalar(0.55 + (1 - ringLife) * 3.4);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.42 * ringLife * Math.min(1, intensity + 0.35);
    ring.rotation.z += dt * 2.4;

    const flow = 0.75 + intensity * 1.55;
    for (let i = 0; i < count; i++) {
      zs[i]! += speeds[i]! * dt * flow;
      if (zs[i]! > -STREAK_NEAR) {
        zs[i] = -STREAK_FAR;
      }
      const radius = radii[i]! * (1 + intensity * 0.12);
      _dummy.position.set(
        Math.cos(angles[i]!) * radius,
        Math.sin(angles[i]!) * radius * 0.72,
        zs[i]!,
      );
      const stretch = lengths[i]! * (0.85 + intensity * 1.85);
      _dummy.scale.set(0.7 + intensity * 0.55, 0.7 + intensity * 0.55, stretch);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      streaks.setMatrixAt(i, _dummy.matrix);
      const tone = tones[i]!;
      _color.copy(tone > 0.7 ? HOT : tone > 0.3 ? CORAL : CRIMSON);
      streaks.setColorAt(i, _color);
    }
    streaks.instanceMatrix.needsUpdate = true;
    if (streaks.instanceColor) streaks.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={rootRef} name="boost-streaks" visible={false}>
      <instancedMesh
        ref={streakRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        raycast={() => null}
      >
        <boxGeometry args={[0.028, 0.028, 1]} />
        <meshBasicMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <mesh ref={washRef} position={[0, 0, -1.2]} raycast={() => null}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial
          color="#de2944"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringRef} position={[0, -0.15, -5.2]} raycast={() => null}>
        <ringGeometry args={[0.95, 1.12, 40]} />
        <meshBasicMaterial
          color="#ffb4a2"
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
