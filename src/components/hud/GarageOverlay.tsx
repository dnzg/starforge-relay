import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PlayerShipMesh } from "../scene/arcade/PlayerShipMesh";
import { useShipLoadout } from "../../hooks/useShipLoadout";
import { useTelegramWebApp } from "../../hooks/useTelegramWebApp";
import { generateShipLivery } from "../../lib/assets/shipLivery";
import {
  createStarsInvoice,
  fetchStarsEntitlements,
  mockGrantStars,
  openStarsInvoice,
  type StarsEntitlements,
} from "../../lib/payments/stars";
import type {
  EngineStyle,
  NoseStyle,
  WingStyle,
} from "../../lib/ship/shipLoadout";

interface GarageOverlayProps {
  onClose: () => void;
}

function useCompactGarage() {
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 860px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 860px)");
    const onChange = () => setCompact(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return compact;
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
  const compact = useCompactGarage();
  const { loadout, update } = useShipLoadout();
  const { isTelegram, webApp, user } = useTelegramWebApp();
  const [prompt, setPrompt] = useState(loadout.prompt);
  const [busy, setBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<StarsEntitlements | null>(
    null,
  );
  const [starsMock, setStarsMock] = useState(false);
  const [starsConfigured, setStarsConfigured] = useState(false);

  const starsContext = {
    initData: webApp?.initData,
    telegramUserId: user ? String(user.id) : undefined,
  };

  const refreshEntitlements = useCallback(async () => {
    const next = await fetchStarsEntitlements(starsContext);
    if (next) setEntitlements(next);
  }, [starsContext.initData, starsContext.telegramUserId]);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json())
      .then((payload: { starsMock?: boolean; starsConfigured?: boolean }) => {
        setStarsMock(Boolean(payload.starsMock));
        setStarsConfigured(Boolean(payload.starsConfigured));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const requiresLiveryCredit =
    isTelegram && starsConfigured && !starsMock;
  const liveryCredits = entitlements?.livery_reroll ?? 0;
  const canPaint = !requiresLiveryCredit || liveryCredits > 0;

  const buyLiveryReroll = async () => {
    setBuyBusy(true);
    setError(null);
    try {
      const invoice = await createStarsInvoice("livery_reroll", starsContext);
      if ("error" in invoice) {
        setError(invoice.error);
        return;
      }

      if ("mock" in invoice && invoice.mock) {
        const granted = await mockGrantStars("livery_reroll", starsContext);
        if (granted) {
          setEntitlements(granted);
        } else {
          setError("Mock grant failed.");
        }
        return;
      }

      if (!webApp || !("invoiceLink" in invoice)) {
        setError("Open in Telegram to pay with Stars.");
        return;
      }

      const status = await openStarsInvoice(webApp, invoice.invoiceLink);
      if (status === "paid") {
        await refreshEntitlements();
        webApp.HapticFeedback?.impactOccurred("medium");
      } else if (status === "failed") {
        setError("Stars payment failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stars purchase failed");
    } finally {
      setBuyBusy(false);
    }
  };

  const mockGrantLivery = async () => {
    setBuyBusy(true);
    setError(null);
    try {
      const granted = await mockGrantStars("livery_reroll", {
        telegramUserId: starsContext.telegramUserId ?? "browser-demo",
      });
      if (granted) {
        setEntitlements(granted);
      } else {
        setError("Mock grant failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock grant failed");
    } finally {
      setBuyBusy(false);
    }
  };

  const paint = async () => {
    if (!canPaint) {
      setError("Buy a livery reroll with Stars first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await generateShipLivery(prompt, starsContext);
      if (result.textureUrl) {
        update({ prompt, textureUrl: result.textureUrl });
        if (requiresLiveryCredit) {
          await refreshEntitlements();
        }
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
          key={compact ? "garage-m" : "garage-d"}
          camera={{
            position: compact ? [0.2, 2.35, 5.8] : [3.6, 2.05, 4.8],
            fov: compact ? 38 : 34,
            near: 0.1,
            far: 40,
          }}
          dpr={[1, 1.5]}
          resize={{ debounce: 0 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#14141a"]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#ffffff", "#2a2030", 1]} />
          <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff6e8" />
          <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#de2944" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
            <circleGeometry args={[compact ? 3.6 : 3.2, 48]} />
            <meshBasicMaterial color="#2a2a33" />
          </mesh>
          <Suspense fallback={null}>
            <PlayerShipMesh preview />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={compact ? 4.6 : 3.8}
            maxDistance={compact ? 9 : 8.5}
            target={[0, 0.22, 0]}
          />
        </Canvas>
      </div>

      <aside className="garage-panel">
        <p className="eyebrow">Hangar</p>
        <h2 id="garage-title">Your ship</h2>
        <p className="garage-lead">Orbit the hull. Change the silhouette. Ask Fal to paint it.</p>

        {requiresLiveryCredit ? (
          <p className="garage-stars-credits">
            Livery credits: <strong>{liveryCredits}</strong>
            {entitlements?.demo_boost ? (
              <span className="garage-stars-badge">Demo boost</span>
            ) : null}
          </p>
        ) : null}

        <div className="garage-options">
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
        </div>

        <label className="garage-prompt">
          <span>Livery prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Worn ivory plates, crimson chevron, soot-streaked engines"
          />
        </label>
        {error ? <p className="garage-error">{error}</p> : null}
        <div className="garage-actions">
          {requiresLiveryCredit ? (
            <button
              type="button"
              className="garage-stars-buy"
              onClick={() => void buyLiveryReroll()}
              disabled={buyBusy}
            >
              {buyBusy ? "Opening Stars…" : "Buy with Stars (35★)"}
            </button>
          ) : null}
          {starsMock && !isTelegram ? (
            <button
              type="button"
              className="garage-stars-mock"
              onClick={() => void mockGrantLivery()}
              disabled={buyBusy}
            >
              Grant mock livery credit
            </button>
          ) : null}
          <button
            type="button"
            className="garage-paint"
            onClick={() => void paint()}
            disabled={busy || !canPaint}
          >
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
