import { useEffect, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

interface SectorSkyProps {
  seed: number;
  textureUrl?: string | null;
}

function fogColorFromSeed(seed: number): THREE.Color {
  const palettes = [0x12080c, 0x080b14, 0x0c0812, 0x100a08];
  return new THREE.Color(palettes[Math.abs(seed) % palettes.length]);
}

function ProceduralSky({ seed }: { seed: number }) {
  const material = useMemo(() => {
    const colorA = fogColorFromSeed(seed);
    const colorB = colorA.clone().offsetHSL(0.08, 0.25, 0.12);
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uA: { value: colorA },
        uB: { value: colorB },
        uSeed: { value: seed % 997 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uA;
        uniform vec3 uB;
        uniform float uSeed;
        varying vec3 vDir;
        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + uSeed) * 43758.5453);
        }
        void main() {
          float n = hash(floor(vDir * 18.0));
          float band = smoothstep(-0.2, 0.7, vDir.y);
          vec3 col = mix(uA, uB, band);
          col += vec3(0.18, 0.04, 0.07) * pow(max(vDir.y, 0.0), 2.0);
          col += vec3(n * 0.04);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [seed]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh name="procedural-sky" scale={[-1, 1, 1]}>
      <sphereGeometry args={[380, 32, 20]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function TexturedSky({ url }: { url: string }) {
  const texture = useTexture(url);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
  }, [texture]);

  return (
    <mesh name="sector-sky" scale={[-1, 1, 1]}>
      <sphereGeometry args={[380, 48, 28]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

export function SectorSky({ seed, textureUrl }: SectorSkyProps) {
  if (textureUrl) {
    return <TexturedSky url={textureUrl} />;
  }
  return <ProceduralSky seed={seed} />;
}

export function sectorFogColor(seed: number): string {
  return `#${fogColorFromSeed(seed).getHexString()}`;
}
