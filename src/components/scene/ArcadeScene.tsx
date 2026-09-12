import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { HyperspaceStreaks } from "./HyperspaceStreaks";
import { SectorBackdrop } from "./SectorBackdrop";
import { SectorSky, sectorFogColor } from "./SectorSky";
import { ArcadeGameLoop } from "./arcade/ArcadeGameLoop";
import type { ArcadeInputState } from "../../hooks/useArcadeInput";
import type { CombatCallbacks } from "./arcade/types";

interface ArcadeSceneProps {
  sectorSeed: number;
  sectorKey: string;
  planetTextureUrl?: string | null;
  skyTextureUrl?: string | null;
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
      dreiStars: mobile ? 600 : 1100,
    };
  }, []);
}

function SceneLighting() {
  return (
    <>
      <hemisphereLight args={["#f0eff3", "#111114", 0.52]} />
      <directionalLight
        position={[6, 16, 8]}
        intensity={1.2}
        color="#fff1d6"
      />
      <directionalLight
        position={[-8, 8, -6]}
        intensity={0.28}
        color="#de2944"
      />
    </>
  );
}

function SceneContent(props: ArcadeSceneProps) {
  const {
    sectorSeed,
    sectorKey,
    planetTextureUrl,
    skyTextureUrl,
    hyperspaceActive,
    threatLevel,
    combatEnabled,
    getInput,
    combatCallbacks,
    onPlanetTextureReady,
  } = props;

  const quality = useSceneQuality();
  const fogColor = sectorFogColor(sectorSeed);
  const planetPosition: [number, number, number] = [78, -26, -110];

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 48, 420]} />
      <SceneLighting />
      <SectorSky key={sectorSeed} seed={sectorSeed} textureUrl={skyTextureUrl} />
      <SectorBackdrop seed={sectorSeed} />

      <Starfield warp={hyperspaceActive ? 14 : 1} />
      <Stars
        radius={220}
        depth={80}
        count={quality.dreiStars}
        factor={2.2}
        saturation={0}
        fade
        speed={hyperspaceActive ? 6 : 0.3}
      />

      <Planet
        seed={sectorSeed}
        textureUrl={planetTextureUrl}
        radius={11}
        position={planetPosition}
        onTextureApplied={onPlanetTextureReady}
      />

      <HyperspaceStreaks active={hyperspaceActive} />

      <ArcadeGameLoop
        enabled={combatEnabled && !hyperspaceActive}
        hyperspaceActive={hyperspaceActive}
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
      camera={{ position: [0, 6.8, 9.2], fov: 50, near: 0.25, far: 800 }}
      dpr={quality.dpr}
      gl={{ antialias: !quality.mobile, alpha: false, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
