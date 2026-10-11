import { useEffect, useState } from "react";

/** Grand entry countdown target — Philippines time (UTC+8). Invitation copy still shows 5:00 PM guest arrival. */
export const GRAND_ENTRY_ISO = "2026-11-07T18:00:00+08:00";

export function resolveGrandEntryMs(): number {
  if (typeof window !== "undefined") {
    const fromQuery = new URLSearchParams(window.location.search).get("grandEntry");
    if (fromQuery) {
      const parsed = Date.parse(fromQuery);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  const fromEnv = import.meta.env.VITE_GRAND_ENTRY_AT as string | undefined;
  if (fromEnv) {
    const parsed = Date.parse(fromEnv);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.parse(GRAND_ENTRY_ISO);
}

/** Client grand-entry instant (honors ?grandEntry= and VITE_GRAND_ENTRY_AT). */
export function useGrandEntryMs(): number {
  const [ms, setMs] = useState(() => resolveGrandEntryMs());
  useEffect(() => {
    setMs(resolveGrandEntryMs());
  }, []);
  return ms;
}
