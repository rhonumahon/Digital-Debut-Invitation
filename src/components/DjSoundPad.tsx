import { useState } from "react";
import { DJ_SFX_BUTTONS, playDjSfx, type DjSfxId } from "../program/djSoundPad";

export default function DjSoundPad() {
  const [lastHit, setLastHit] = useState<DjSfxId | null>(null);

  const hit = (id: DjSfxId) => {
    playDjSfx(id);
    setLastHit(id);
  };

  return (
    <section className="rounded-xl border border-[#f09060]/25 bg-[#0e2744]/70 p-4 sm:p-5">
      <h2 className="font-cinzel text-xs tracking-wider uppercase text-[#f09060]">DJ pad</h2>
      <p className="font-garamond text-xs text-[#f0d2b0]/90 mt-2 leading-relaxed">
        Real sound clips for the host (applause, laughs, boings, and more).
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {DJ_SFX_BUTTONS.map((button) => {
          const active = lastHit === button.id;
          return (
            <button
              key={button.id}
              type="button"
              onClick={() => hit(button.id)}
              className={`font-cinzel text-[10px] sm:text-[11px] tracking-wide uppercase min-h-[2.75rem] px-2 py-2 rounded-lg border transition-all active:scale-[0.97] ${
                active
                  ? "border-[#f09060] bg-[#f09060]/20 text-[#f6f0e6] shadow-[0_0_12px_rgba(240,144,96,0.25)]"
                  : "border-[#f09060]/35 bg-[#06101c]/60 text-[#f0d2b0] hover:border-[#f09060]/65 hover:text-[#f6f0e6]"
              }`}
            >
              {button.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
