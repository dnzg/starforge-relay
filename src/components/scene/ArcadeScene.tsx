import { Suspense, useMemo } from "react";
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
  onPlanetTextureReady?: () => void;
}

function useSceneQuality() {
  return useMemo(() => {
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const narrow =
      typeof window !== "undefined" && window.innerWidth < 768;
    const mobile = coarse || narrow;
    return {
      mobile,
      dpr: mobile ? ([1, 1.25] as [number, number]) : ([1, 1.5] as [number, number]),
      dreiStars: mobile ? 600 : 1000,
    };
  }, []);
}

function SceneLighting({ planetPosition }: { planetPosition: [number, number, number] }) {
  return (
    <>
      <hemisphereLight
        args={["#7dd3fc", "#0f172a", 0.35]}
      />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.95}
        color="#ffe2b8"
      />
      <directionalLight
        position={[-8, 5, -6]}
        intensity={0.35}
        color="#93c5fd"
      />
      <pointLight
        position={[planetPosition[0] * 0.15, planetPosition[1] + 6, planetPosition[2] * 0.15]}
        intensity={0.65}
        color="#f97316"
        distance={120}
      />
    </>
  );
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
    onPlanetTextureReady,
  } = props;

  const quality = useSceneQuality();
  const planetPosition: [number, number, number] = [55, -18, -75];

  return (
    <>
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 28, 120]} />
      <SceneLighting planetPosition={planetPosition} />

      <Starfield warp={hyperspaceActive ? 8 : 1} />
      <Stars
        radius={120}
        depth={60}
        count={quality.dreiStars}
        factor={2}
        saturation={0}
        fade
        speed={hyperspaceActive ? 4 : 0.3}
      />

      <Planet
        seed={sectorSeed}
        textureUrl={planetTextureUrl}
        radius={8}
        position={planetPosition}
        onTextureApplied={onPlanetTextureReady}
      />

      <HyperspaceStreaks active={hyperspaceActive} />

      <ArcadeGameLoop
        enabled={combatEnabled && !hyperspaceActive}
        sectorKey={sectorKey}
        threatLevel={threatLevel}
        getInput={getInput}
        callbacks={combatCallbacks}
      />
    </>
  );
}

export function ArcadeScene(props: ArcadeSceneProps) {
  const quality = useSceneQuality();

  return (
    <Canvas
      className="cockpit-canvas"
      camera={{ position: [0, 3.2, 6], fov: 60, near: 0.1, far: 250 }}
      dpr={quality.dpr}
      gl={{ antialias: !quality.mobile, alpha: false, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
