import { useEffect, useRef, useState } from "react";
import type { AttendanceStatus, FamilyMember } from "../attendance/types";
import { ROLE_LABEL } from "../attendance/types";

interface Draft {
  status: AttendanceStatus | "";
  reason: string;
}

interface AttendanceFormProps {
  guestId: string;
  reloadToken?: number;
  onSaved?: () => void;
  showOccasion?: boolean;
  initialMembers?: FamilyMember[];
}

function draftsFor(list: FamilyMember[]): Record<string, Draft> {
  return Object.fromEntries(list.map((member) => [member.id, {
    status: member.response?.status ?? "",
    reason: member.response?.reason ?? "",
  }]));
}

export default function AttendanceForm({ guestId, reloadToken = 0, onSaved, showOccasion = false, initialMembers }: AttendanceFormProps) {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers ?? []);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => draftsFor(initialMembers ?? []));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(initialMembers == null);
  const reasonTimer = useRef<number | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    if (members.length === 0) setLoading(true);
    fetch(`/api/family?guestId=${encodeURIComponent(guestId)}`)
      .then((response) => response.json())
      .then((body: { members?: FamilyMember[]; error?: string }) => {
        if (!active) return;
        const next = body.members ?? [];
        setMembers(next);
        setDrafts(draftsFor(next));
        setError(body.error ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("The invitation list could not be read.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [guestId, reloadToken]);

  const actor = members[0];
  const roseGlints = [
    { left: "8%", top: "12%", size: 7, delay: 0.15, duration: 1.8, gold: true },
    { left: "78%", top: "8%", size: 9, delay: 0.45, duration: 2.1, gold: false },
    { left: "18%", top: "42%", size: 5, delay: 0.7, duration: 1.6, gold: true },
    { left: "88%", top: "36%", size: 8, delay: 0.3, duration: 2.4, gold: true },
    { left: "6%", top: "68%", size: 6, delay: 1.0, duration: 1.9, gold: false },
    { left: "72%", top: "62%", size: 7, delay: 0.55, duration: 2.2, gold: true },
    { left: "46%", top: "4%", size: 6, delay: 0.9, duration: 1.7, gold: false },
    { left: "34%", top: "78%", size: 8, delay: 1.15, duration: 2.0, gold: true },
    { left: "92%", top: "74%", size: 5, delay: 0.2, duration: 1.5, gold: true },
    { left: "58%", top: "86%", size: 7, delay: 1.35, duration: 2.3, gold: false },
    { left: "22%", top: "22%", size: 4, delay: 0.8, duration: 1.8, gold: true },
    { left: "64%", top: "28%", size: 5, delay: 1.5, duration: 2.1, gold: false },
  ];

  useEffect(() => () => {
    if (reasonTimer.current != null) window.clearTimeout(reasonTimer.current);
  }, []);

  const answerReady = (draft: Draft | undefined) =>
    Boolean(draft?.status) && (draft?.status !== "not_joining" || Boolean(draft.reason.trim()));

  const persist = async (memberId: string, draft: Draft, allDrafts: Record<string, Draft>) => {
    if (!answerReady(draft)) return;
    const id = ++requestId.current;
    setError("");
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          guestId,
          decisions: [{
            guestId: memberId,
            status: draft.status,
            reason: draft.status === "not_joining" ? draft.reason.trim() : "",
          }],
        }),
      });
      const body = await response.json() as { error?: string; members?: FamilyMember[] };
      if (id !== requestId.current) return;
      if (!response.ok) {
        setSaved(false);
        setError(body.error ?? "The answer could not be saved.");
        return;
      }
      setMembers(body.members ?? members);
      setSaved(true);
      if (members.every((member) => answerReady(allDrafts[member.id]))) onSaved?.();
    } catch {
      if (id !== requestId.current) return;
      setSaved(false);
      setError("The answer could not be saved.");
    }
  };

  const choose = (memberId: string, status: AttendanceStatus) => {
    if (reasonTimer.current != null) window.clearTimeout(reasonTimer.current);
    const current = drafts[memberId] ?? { status: "", reason: "" };
    const next: Draft = {
      status,
      reason: status === "not_joining" ? current.reason : "",
    };
    const allDrafts = { ...drafts, [memberId]: next };
    setDrafts(allDrafts);
    setSaved(false);
    void persist(memberId, next, allDrafts);
  };

  const writeReason = (memberId: string, reason: string) => {
    const current = drafts[memberId] ?? { status: "not_joining" as const, reason: "" };
    const next: Draft = { ...current, status: "not_joining", reason };
    const allDrafts = { ...drafts, [memberId]: next };
    setDrafts(allDrafts);
    setSaved(false);
    if (reasonTimer.current != null) window.clearTimeout(reasonTimer.current);
    reasonTimer.current = window.setTimeout(() => {
      void persist(memberId, next, allDrafts);
    }, 500);
  };

  if (loading) {
    return <p className="font-garamond text-[#8a5a32]">Loading your place in the evening…</p>;
  }
  if (!actor) {
    return <p className="font-garamond text-[#8a5a32]">{error || "That name is not on the invitation."}</p>;
  }

  return (
    <div className="text-left">
      <style>{`
        @keyframes roseLight {
          0% {
            opacity: 0.2;
            filter: brightness(0.15) drop-shadow(0 0 0 rgba(240, 144, 96, 0));
          }
          55% {
            opacity: 1;
            filter: brightness(1.55) drop-shadow(0 0 22px rgba(255, 214, 160, 0.95)) drop-shadow(0 0 48px rgba(240, 144, 96, 0.75));
          }
          100% {
            opacity: 1;
            filter: brightness(1.08) drop-shadow(0 0 14px rgba(240, 144, 96, 0.8)) drop-shadow(0 0 32px rgba(240, 144, 96, 0.4));
          }
        }
        @keyframes roseGlow {
          0% { opacity: 0; transform: scale(0.55); }
          55% { opacity: 1; transform: scale(1.12); }
          100% { opacity: 0.8; transform: scale(1); }
        }
        .rose-light {
          animation: roseLight 1.7s ease both;
        }
        .rose-glow {
          animation: roseGlow 1.7s ease both;
        }
        .rose-glitter {
          position: absolute;
          opacity: 0;
          background: #fffdf8;
          clip-path: polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%);
          filter: drop-shadow(0 0 4px rgba(255, 244, 220, 0.95));
          animation-name: roseGlitter;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          z-index: 20;
        }
        .rose-glitter.gold {
          background: #f3d7a2;
          filter: drop-shadow(0 0 5px rgba(240, 144, 96, 0.95));
        }
        @keyframes roseGlitter {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          12% { opacity: 1; transform: scale(1) rotate(18deg); }
          24% { opacity: 0; transform: scale(0.4) rotate(32deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rose-light, .rose-glow { animation: none; opacity: 1; filter: none; transform: none; }
          .rose-glitter { animation: none; opacity: 0; }
        }
      `}</style>
      {actor.role === "roses" || actor.role === "fashion" || actor.role === "bills" || actor.role === "treasures" || actor.role === "glam" ? (
        <div className="relative mx-auto flex w-full min-w-0 max-w-[340px] justify-center">
          <div
            aria-hidden="true"
            className="rose-glow pointer-events-none absolute -inset-x-10 -inset-y-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,214,160,0.55)_0%,rgba(240,144,96,0.28)_38%,transparent_72%)] blur-md"
          />
          <img
            src={
              actor.role === "roses"
                ? "/assets/images/18-roses-text.png"
                : actor.role === "fashion"
                  ? "/assets/images/18-fashion-text.png"
                  : actor.role === "bills"
                    ? "/assets/images/18-bills-text.png?v=2"
                    : actor.role === "treasures"
                      ? "/assets/images/18-treasures-text.png?v=2"
                      : "/assets/images/18-glam-text.png"
            }
            alt={
              actor.role === "roses"
                ? "You are one of my 18 Roses"
                : actor.role === "fashion"
                  ? "You are one of my 18 Fashion Pieces"
                  : actor.role === "bills"
                    ? "You are one of my 18 Bills"
                    : actor.role === "treasures"
                      ? "You are one of my 18 Treasures"
                      : "You are one of my 18 Glam"
            }
            className="rose-light relative z-10 block h-auto w-full min-w-0 max-w-full object-contain"
          />
          {roseGlints.map((glint, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`rose-glitter ${glint.gold ? "gold" : ""}`}
              style={{
                left: glint.left,
                top: glint.top,
                width: `${glint.size}px`,
                height: `${glint.size}px`,
                animationDuration: `${glint.duration}s`,
                animationDelay: `${glint.delay}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="font-dancing text-3xl text-[#7a3e18] text-center leading-tight">
          {actor.role === "guests" ? "You are invited" : `You’re one of my ${ROLE_LABEL[actor.role]}`}
        </p>
      )}
      {(actor.also ?? []).length > 0 && (
        <div className="mt-4 text-center">
          <p className="font-dancing text-2xl text-[#7a3e18]">You’re also:</p>
          {(actor.also ?? []).map((other) => (
            <p key={other.id} className="font-garamond text-lg text-[#5c3418] mt-1">
              {actor.fullName} - {ROLE_LABEL[other.role]}
            </p>
          ))}
        </div>
      )}
      {showOccasion && (
        <div className="mt-4 text-center">
          <p className="font-cinzel text-sm tracking-[0.16em] uppercase text-[#a8642c]">Saturday, November 7, 2026</p>
          <p className="font-garamond text-xl text-[#5c3418] mt-1">5:00 PM</p>
          <p className="font-garamond text-base text-[#8a5a32] mt-1 leading-snug">Angelitos Event Center<br />Batangas City</p>
          {actor.tableNumber != null && actor.chairNumber != null && (
            <p className="font-cinzel text-sm tracking-[0.14em] uppercase text-[#7a3e18] mt-3">
              Table {actor.tableNumber} · Chair {actor.chairNumber}
            </p>
          )}
        </div>
      )}
      {members.length > 1 && (
        <p className="font-garamond text-base text-[#8a5a32] text-center mt-2">Your family is listed with you. You can answer for each of them.</p>
      )}
      <div className="mt-5 space-y-4">
        {members.map((member) => {
          const draft = drafts[member.id] ?? { status: "", reason: "" };
          return (
            <div key={member.id} className="bronze-inset rounded-xl p-4">
              <p className="font-garamond text-lg text-[#5c3418]">{member.fullName}</p>
              {member.tableNumber != null && member.chairNumber != null && (
                <p className="font-cinzel text-[13px] tracking-[0.12em] uppercase text-[#7a3e18] mt-1">
                  Table {member.tableNumber} · Chair {member.chairNumber}
                </p>
              )}
              <p className="font-cinzel text-[13px] tracking-[0.12em] uppercase text-[#a8642c] mb-3 mt-1">
                {[ROLE_LABEL[member.role], ...(member.also ?? []).map((other) => ROLE_LABEL[other.role])].join(" · ")}
              </p>
              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                <button
                  type="button"
                  onClick={() => choose(member.id, "joining")}
                  className={`invite-btn flex-1 ${draft.status === "joining" ? "on" : ""}`}
                >
                  Joining
                </button>
                <button
                  type="button"
                  onClick={() => choose(member.id, "not_joining")}
                  className={`invite-btn flex-1 ${draft.status === "not_joining" ? "on" : ""}`}
                >
                  Not joining
                </button>
              </div>
              <button
                type="button"
                onClick={() => choose(member.id, "undecided")}
                className={`invite-btn mt-2 w-full ${draft.status === "undecided" ? "on" : ""}`}
              >
                Decide later
              </button>
              {draft.status === "not_joining" && (
                <textarea
                  value={draft.reason}
                  onChange={(event) => writeReason(member.id, event.target.value)}
                  placeholder="Reason"
                  className="bronze-inset mt-3 w-full rounded-lg px-3 py-2.5 font-garamond text-base text-[#5c3418] outline-none placeholder:text-[#a8642c]/50"
                />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-center font-garamond text-base text-[#8a4e24]">{error}</p>}
      {saved && <p className="mt-3 text-center font-garamond text-base text-[#8a5a32]">Your answer is saved.</p>}
    </div>
  );
}
