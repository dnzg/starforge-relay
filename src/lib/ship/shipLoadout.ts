export type NoseStyle = "standard" | "needle" | "blunt";
export type WingStyle = "swept" | "wide" | "delta";
export type EngineStyle = "twin" | "triple" | "inline";

export interface ShipLoadout {
  nose: NoseStyle;
  wings: WingStyle;
  engines: EngineStyle;
  prompt: string;
  textureUrl: string | null;
}

const STORAGE_KEY = "starforge-relay-ship-loadout-v1";
export const SHIP_LOADOUT_EVENT = "starforge-ship-loadout";

export const DEFAULT_SHIP_LOADOUT: ShipLoadout = {
  nose: "standard",
  wings: "swept",
  engines: "twin",
  prompt: "",
  textureUrl: null,
};

export function loadShipLoadout(): ShipLoadout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHIP_LOADOUT };
    const parsed = JSON.parse(raw) as Partial<ShipLoadout>;
    return {
      nose: parsed.nose ?? "standard",
      wings: parsed.wings ?? "swept",
      engines: parsed.engines ?? "twin",
      prompt: parsed.prompt ?? "",
      textureUrl: parsed.textureUrl ?? null,
    };
  } catch {
    return { ...DEFAULT_SHIP_LOADOUT };
  }
}

export function saveShipLoadout(loadout: ShipLoadout): ShipLoadout {
  const next = { ...loadout };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SHIP_LOADOUT_EVENT));
  } catch {
    // private browsing
  }
  return next;
}
