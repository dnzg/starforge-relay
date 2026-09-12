import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export interface PlanetProps {
  /** Swap this URL when Fal.ai returns a generated texture */
  textureUrl?: string | null;
  seed?: number;
  radius?: number;
  position?: [number, number, number];
}

function seededNoise(seed: number, u: number, v: number): number {
  const x = Math.sin(seed * 0.013 + u * 12.9898 + v * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function createProceduralPlanetMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: seed },
      uTime: { value: 0 },
      uTexture: { value: null },
      uUseTexture: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uSeed;
      uniform float uTime;
      uniform sampler2D uTexture;
      uniform float uUseTexture;
      varying vec2 vUv;
      varying vec3 vNormalW;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        if (uUseTexture > 0.5) {
          vec4 tex = texture2D(uTexture, vUv);
          gl_FragColor = tex;
          return;
        }

        float n = noise(vUv * 8.0 + uTime * 0.02);
        float band = smoothstep(0.35, 0.65, sin(vUv.y * 20.0 + n * 3.0));
        vec3 desert = vec3(0.72, 0.45, 0.22);
        vec3 canyon = vec3(0.35, 0.18, 0.12);
        vec3 iceCap = vec3(0.85, 0.9, 0.95);
        vec3 base = mix(canyon, desert, band);
        base = mix(base, iceCap, smoothstep(0.85, 0.95, vUv.y));
        float rim = pow(1.0 - max(dot(vNormalW, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
        base += vec3(0.15, 0.2, 0.35) * rim;
        gl_FragColor = vec4(base, 1.0);
      }
    `,
  });
}

function PlanetWithTexture({
  textureUrl,
  radius,
  position,
}: {
  textureUrl: string;
  radius: number;
  position: [number, number, number];
}) {
  const texture = useTexture(textureUrl);
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

export function Planet({
  textureUrl,
  seed = 42,
  radius = 2.4,
  position = [8, -0.5, -12],
}: PlanetProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const material = useMemo(
    () => createProceduralPlanetMaterial(seed),
    [seed],
  );
  materialRef.current = material;

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  if (textureUrl) {
    return (
      <PlanetWithTexture
        textureUrl={textureUrl}
        radius={radius}
        position={position}
      />
    );
  }

  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Helper for Fal hook: call after generateSectorArt returns a URL */
export function applyPlanetTexture(
  material: THREE.ShaderMaterial,
  texture: THREE.Texture,
): void {
  material.uniforms.uTexture.value = texture;
  material.uniforms.uUseTexture.value = 1;
  material.needsUpdate = true;
}

export { seededNoise };
