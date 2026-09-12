import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PlayerShipMesh } from "../scene/arcade/PlayerShipMesh";
import { useShipLoadout } from "../../hooks/useShipLoadout";
import { generateShipLivery } from "../../lib/assets/shipLivery";
import type {
  EngineStyle,
  NoseStyle,
  WingStyle,
} from "../../lib/ship/shipLoadout";

interface GarageOverlayProps {
  onClose: () => void;
}

function OptionRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="garage-row">
      <legend>{label}</legend>
      <div className="garage-chips">
        {options.map(([id, title]) => (
          <button
            key={id}
            type="button"
            className={`chip ${value === id ? "is-on" : ""}`}
            onClick={() => onChange(id)}
          >
            {title}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function GarageOverlay({ onClose }: GarageOverlayProps) {
  const { loadout, update } = useShipLoadout();
  const [prompt, setPrompt] = useState(loadout.prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paint = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await generateShipLivery(prompt);
      if (result.textureUrl) {
        update({ prompt, textureUrl: result.textureUrl });
      } else {
        setError(result.error ?? "Fal could not paint this hull.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Livery request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="garage-overlay" role="dialog" aria-labelledby="garage-title">
      <div className="garage-stage">
        <Canvas
          camera={{ position: [1.8, 1.15, 2.3], fov: 42, near: 0.1, far: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#14141a"]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#ffffff", "#2a2030", 1]} />
          <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff6e8" />
          <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#de2944" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
            <circleGeometry args={[2.8, 48]} />
            <meshBasicMaterial color="#2a2a33" />
          </mesh>
          <Suspense fallback={null}>
            <PlayerShipMesh preview />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={1.6}
            maxDistance={6}
            target={[0, 0.12, 0]}
          />
        </Canvas>
      </div>

      <aside className="garage-panel">
        <p className="eyebrow">Hangar</p>
        <h2 id="garage-title">Your ship</h2>
        <p className="garage-lead">Orbit the hull. Change the silhouette. Ask Fal to paint it.</p>

        <OptionRow<NoseStyle>
          label="Nose"
          value={loadout.nose}
          options={[
            ["standard", "Standard"],
            ["needle", "Needle"],
            ["blunt", "Blunt"],
          ]}
          onChange={(nose) => update({ nose })}
        />
        <OptionRow<WingStyle>
          label="Wings"
          value={loadout.wings}
          options={[
            ["swept", "Swept"],
            ["wide", "Wide"],
            ["delta", "Delta"],
          ]}
          onChange={(wings) => update({ wings })}
        />
        <OptionRow<EngineStyle>
          label="Engines"
          value={loadout.engines}
          options={[
            ["twin", "Twin"],
            ["triple", "Triple"],
            ["inline", "Inline"],
          ]}
          onChange={(engines) => update({ engines })}
        />

        <label className="garage-prompt">
          <span>Livery prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="Worn ivory plates, crimson chevron, soot-streaked engines"
          />
        </label>
        {error ? <p className="garage-error">{error}</p> : null}
        <div className="garage-actions">
          <button type="button" onClick={() => void paint()} disabled={busy}>
            {busy ? "Painting…" : "Paint with AI"}
          </button>
          <button type="button" className="garage-close" onClick={onClose}>
            Back to sector
          </button>
        </div>
      </aside>
    </div>
  );
}
