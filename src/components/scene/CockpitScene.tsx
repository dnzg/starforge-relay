import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { HyperspaceStreaks } from "./HyperspaceStreaks";

interface CockpitSceneProps {
  sectorSeed: number;
  planetTextureUrl?: string | null;
  hyperspaceActive: boolean;
}

function SceneContent({
  sectorSeed,
  planetTextureUrl,
  hyperspaceActive,
}: CockpitSceneProps) {
  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 18, 90]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 2]} intensity={1.4} color="#ffe2b8" />
      <pointLight position={[-6, -2, -4]} intensity={0.6} color="#4da3ff" />

      <Starfield warp={hyperspaceActive ? 14 : 1} />
      <Stars
        radius={80}
        depth={40}
        count={1200}
        factor={2}
        saturation={0}
        fade
        speed={hyperspaceActive ? 8 : 0.3}
      />

      <Planet seed={sectorSeed} textureUrl={planetTextureUrl} />

      <HyperspaceStreaks active={hyperspaceActive} />

      {/* Cockpit frame silhouette */}
      <mesh position={[0, 0, 1.2]}>
        <ringGeometry args={[3.8, 4.5, 64]} />
        <meshBasicMaterial color="#0a0e1a" side={2} />
      </mesh>
      <mesh position={[-2.8, 0, 0.8]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.15, 5, 0.1]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      <mesh position={[2.8, 0, 0.8]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.15, 5, 0.1]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
    </>
  );
}

export function CockpitScene(props: CockpitSceneProps) {
  return (
    <Canvas
      className="cockpit-canvas"
      camera={{ position: [0, 0.2, 3.2], fov: 58, near: 0.1, far: 200 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
