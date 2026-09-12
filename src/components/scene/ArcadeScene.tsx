import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { HyperspaceStreaks } from "./HyperspaceStreaks";
import { ArcadeGameLoop } from "./arcade/ArcadeGameLoop";
import type { ArcadeInputState } from "../../hooks/useArcadeInput";
import type { CombatCallbacks } from "./arcade/types";

interface ArcadeSceneProps {
  sectorSeed: number;
  sectorKey: string;
  planetTextureUrl?: string | null;
  hyperspaceActive: boolean;
  threatLevel: number;
  combatEnabled: boolean;
  getInput: () => ArcadeInputState;
  combatCallbacks: CombatCallbacks;
}

function SceneContent(props: ArcadeSceneProps) {
  const {
    sectorSeed,
    sectorKey,
    planetTextureUrl,
    hyperspaceActive,
    threatLevel,
    combatEnabled,
    getInput,
    combatCallbacks,
  } = props;

  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 28, 120]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 6]} intensity={1.2} color="#ffe2b8" />
      <pointLight position={[-10, 4, -8]} intensity={0.55} color="#4da3ff" />

      <Starfield warp={hyperspaceActive ? 8 : 1} />
      <Stars
        radius={120}
        depth={60}
        count={1800}
        factor={2}
        saturation={0}
        fade
        speed={hyperspaceActive ? 4 : 0.3}
      />

      <Planet
        seed={sectorSeed}
        textureUrl={planetTextureUrl}
        radius={8}
        position={[55, -18, -75]}
      />

      <HyperspaceStreaks active={hyperspaceActive} />

      <ArcadeGameLoop
        enabled={combatEnabled}
        sectorKey={sectorKey}
        threatLevel={threatLevel}
        getInput={getInput}
        callbacks={combatCallbacks}
      />
    </>
  );
}

export function ArcadeScene(props: ArcadeSceneProps) {
  return (
    <Canvas
      className="cockpit-canvas"
      camera={{ position: [0, 3.2, 6], fov: 60, near: 0.1, far: 250 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
