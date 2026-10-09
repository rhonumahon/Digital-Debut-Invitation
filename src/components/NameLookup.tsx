import { useEffect, useState } from "react";
import type { NameMatch } from "../attendance/types";

interface NameLookupProps {
  onChange: (match: NameMatch | null) => void;
  tone?: "card" | "page";
}

export default function NameLookup({ onChange, tone = "page" }: NameLookupProps) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<NameMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<NameMatch | null>(null);
  const onCard = tone === "card";

  useEffect(() => {
    const first = query.trim().split(/\s+/)[0] ?? "";
    if (picked && query === picked.fullName) return;
    if (first.length < 2) {
      setMatches([]);
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/lookup?first=${encodeURIComponent(first)}`)
        .then((response) => response.json())
        .then((body: { matches?: NameMatch[] }) => {
          setMatches(body.matches ?? []);
          setOpen((body.matches ?? []).length > 0);
        })
        .catch(() => {
          setMatches([]);
          setOpen(false);
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, picked]);

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
          onChange(null);
        }}
        onFocus={() => {
          if (matches.length > 0 && !picked) setOpen(true);
        }}
        className={`w-full rounded-lg border px-3 py-2.5 font-garamond text-base outline-none ${
          onCard
            ? "bg-[#0c2340] border-[#f09060]/60 text-white placeholder:text-[#f0d7b4]/40"
            : "border-[#c4894a] bg-[#fff8ee] text-[#5c3418] placeholder:text-[#a8642c]/50"
        }`}
      />
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
