import { useEffect, useRef, useState } from "react";
import type { NameMatch } from "../attendance/types";

interface NameLookupProps {
  onChange: (match: NameMatch | null) => void;
  tone?: "card" | "page";
}

async function fetchNameMatches(query: string, signal: AbortSignal): Promise<NameMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const run = async () => {
    const response = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`, { signal });
    const body = (await response.json()) as { matches?: NameMatch[]; error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "lookup failed");
    }
    return body.matches ?? [];
  };

  try {
    return await run();
  } catch (error) {
    if (signal.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (signal.aborted) return [];
    return run();
  }
}

export default function NameLookup({ onChange, tone = "page" }: NameLookupProps) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<NameMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<NameMatch | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const lookupSeq = useRef(0);
  const onCard = tone === "card";

  useEffect(() => {
    const trimmed = query.trim();
    if (picked && query === picked.fullName) return;

    if (trimmed.length < 2) {
      setMatches([]);
      setOpen(false);
      setLoadError(false);
      return;
    }

    const seq = ++lookupSeq.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await fetchNameMatches(trimmed, controller.signal);
          if (seq !== lookupSeq.current) return;
          setLoadError(false);
          setMatches(next);
          setOpen(next.length > 0);
        } catch {
          if (seq !== lookupSeq.current || controller.signal.aborted) return;
          setMatches([]);
          setOpen(false);
          setLoadError(true);
        }
      })();
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, picked, retryTick]);

  const rerunLookup = () => {
    if (query.trim().length < 2 || (picked && query === picked.fullName)) return;
    setLoadError(false);
    setRetryTick((tick) => tick + 1);
  };

  return (
    <div className="relative w-full text-left">
      <label className={`block font-cinzel text-[13px] tracking-[0.14em] uppercase mb-1 ${onCard ? "text-[#f09060]" : "text-[#a8642c]"}`}>
        Your name
      </label>
      <input
        value={query}
        autoComplete="off"
        placeholder="Type any part of your name"
        onChange={(event) => {
          setQuery(event.target.value);
          setPicked(null);
          setLoadError(false);
          onChange(null);
        }}
        onFocus={() => {
          if (matches.length > 0 && !picked) setOpen(true);
          else if (loadError) rerunLookup();
        }}
        className={`w-full rounded-lg border px-3 py-2.5 font-garamond text-base outline-none ${
          onCard
            ? "bg-[#0c2340] border-[#f09060]/60 text-white placeholder:text-[#f0d7b4]/40"
            : "border-[#c4894a] bg-[#fff8ee] text-[#5c3418] placeholder:text-[#a8642c]/50"
        }`}
      />
      {loadError && (
        <p className={`mt-1 font-garamond text-sm ${onCard ? "text-[#f0d7b4]/90" : "text-[#8b4513]"}`}>
          Couldn&apos;t load names.{" "}
          <button type="button" className="underline underline-offset-2" onClick={rerunLookup}>
            Try again
          </button>
        </p>
      )}
      {open && (
        <ul className={`name-results absolute z-30 mt-1 max-h-48 w-full overflow-auto overscroll-contain rounded-lg border shadow-xl ${onCard ? "border-[#f09060]/70 bg-[#07182e]" : "border-[#c4894a] bg-[#fff8ee]"}`}>
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left ${onCard ? "hover:bg-[#163056]" : "hover:bg-[#f4e4cf]"}`}
                onClick={() => {
                  setQuery(match.fullName);
                  setPicked(match);
                  setOpen(false);
                  setLoadError(false);
                  onChange(match);
                }}
              >
                <span className={`block font-garamond text-base ${onCard ? "text-[#f6f0e6]" : "text-[#5c3418]"}`}>{match.fullName}</span>
                {match.tableNumber != null && match.chairNumber != null && (
                  <span className="block font-cinzel text-[13px] tracking-[0.12em] uppercase text-[#f09060]">Table {match.tableNumber} · Chair no. {match.chairNumber}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
