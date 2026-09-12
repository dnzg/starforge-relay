import { useCallback, useEffect, useState } from "react";
import {
  loadShipLoadout,
  saveShipLoadout,
  SHIP_LOADOUT_EVENT,
  type ShipLoadout,
} from "../lib/ship/shipLoadout";

export function useShipLoadout() {
  const [loadout, setLoadout] = useState<ShipLoadout>(loadShipLoadout);

  useEffect(() => {
    const sync = () => setLoadout(loadShipLoadout());
    window.addEventListener(SHIP_LOADOUT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHIP_LOADOUT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<ShipLoadout>) => {
    setLoadout((current) => saveShipLoadout({ ...current, ...patch }));
  }, []);

  return { loadout, update };
}
