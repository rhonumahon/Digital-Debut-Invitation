/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

const NUMBER_GLINTS = [
  { left: "8%", top: "10%", size: 16, delay: 0.3, duration: 2.3, gold: true },
  { left: "28%", top: "72%", size: 14, delay: 1.1, duration: 2.6, gold: false },
  { left: "62%", top: "4%", size: 18, delay: 0.6, duration: 2.2, gold: true },
  { left: "78%", top: "58%", size: 15, delay: 1.6, duration: 2.5, gold: true },
  { left: "46%", top: "78%", size: 13, delay: 0.9, duration: 2.4, gold: false },
];

const NAME_GLINTS = [
  { left: "4%", top: "8%", size: 16, delay: 0.15, duration: 2.2, gold: true },
  { left: "22%", top: "62%", size: 13, delay: 0.8, duration: 2.6, gold: false },
  { left: "38%", top: "0%", size: 18, delay: 0.4, duration: 2.1, gold: true },
  { left: "54%", top: "70%", size: 14, delay: 1.2, duration: 2.4, gold: true },
  { left: "68%", top: "6%", size: 15, delay: 0.55, duration: 2.8, gold: false },
  { left: "82%", top: "48%", size: 17, delay: 1.5, duration: 2.3, gold: true },
  { left: "92%", top: "12%", size: 12, delay: 0.95, duration: 2.5, gold: true },
  { left: "12%", top: "78%", size: 15, delay: 1.8, duration: 2.2, gold: false },
];

const GOWN_COPPER = "/assets/images/debut-gown-white.png?v=15";
const GOWN_BLUE = "/assets/images/debut-gown-blue.png?v=15";
export const GOWN_CHANGE_AT = new Date("2026-10-02T13:03:00").getTime();
const WIPE_SECONDS = 16;
const GOWN_WIPE_MS = WIPE_SECONDS * 1000;
const TIMEOUT_MAX = 2_147_483_647;
const COUNTDOWN_WINDOW_MS = 30 * 60 * 1000;

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function lightPassDelay() {
  const mark = document.querySelector("[data-gown-mark]");
  const hero = document.getElementById("hero");
  if (!mark || !hero) return 4200;
  const markBox = mark.getBoundingClientRect();
  const heroBox = hero.getBoundingClientRect();
  const center = (markBox.top + markBox.height / 2 - heroBox.top) / heroBox.height;
  const start = -0.17;
  const end = 1.25;
  const t = (center - start) / (end - start);
  return Math.round(Math.min(0.9, Math.max(0.08, t)) * WIPE_SECONDS * 1000) + 350;
}

function useCelebrationGown() {
  const [phase, setPhase] = useState<"copper" | "wiping" | "blue">(() =>
    Date.now() >= GOWN_CHANGE_AT ? "blue" : "copper"
  );

  useEffect(() => {
    const preload = new Image();
    preload.src = GOWN_BLUE;
    if (Date.now() >= GOWN_CHANGE_AT) return;

    let timer = 0;
    const arm = () => {
      const wait = GOWN_CHANGE_AT - Date.now();
      if (wait <= 0) {
        setPhase("wiping");
        return;
      }
      timer = window.setTimeout(arm, Math.min(wait, TIMEOUT_MAX));
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "wiping") return;
    const timer = window.setTimeout(() => setPhase("blue"), GOWN_WIPE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return phase;
}

const CHANGE_GLINTS = Array.from({ length: 96 }, (_, id) => ({
  id,
  left: Math.random() * 100,
  top: -6 + Math.random() * 112,
  size: id % 6 === 0 ? 16 + Math.random() * 14 : 4 + Math.random() * 9,
  delay: Math.random() * 1.6,
  duration: 0.45 + Math.random() * 0.75,
  gold: id % 3 !== 2,
  dot: id % 4 === 0,
}));

const CHANGE_ORBS = [
  { id: "o1", left: 8, top: 18, size: 112, delay: 0.05, duration: 1.7, gold: true },
  { id: "o2", left: 30, top: 56, size: 78, delay: 0.4, duration: 2.05, gold: false },
  { id: "o3", left: 52, top: 14, size: 96, delay: 0.15, duration: 1.85, gold: true },
  { id: "o4", left: 74, top: 48, size: 128, delay: 0.28, duration: 1.65, gold: true },
  { id: "o5", left: 18, top: 74, size: 70, delay: 0.7, duration: 2.15, gold: false },
  { id: "o6", left: 42, top: 36, size: 104, delay: 0.55, duration: 1.9, gold: true },
  { id: "o7", left: 88, top: 24, size: 84, delay: 0.22, duration: 1.75, gold: false },
  { id: "o8", left: 62, top: 70, size: 92, delay: 0.85, duration: 2.1, gold: true },
];

const PETAL_FILLS = [
  "radial-gradient(ellipse at 35% 30%, #f0c48a, #d4894a 42%, #b87333)",
  "radial-gradient(ellipse at 35% 30%, #f2b56a, #e07a3d 40%, #c45a22)",
  "radial-gradient(ellipse at 35% 30%, #e8c49a, #c9956b 36%, #d4783a)",
];

const MARK_EASE_MS = 3200;

function useHeroMark(gownPhase: "copper" | "wiping" | "blue") {
  const [now, setNow] = useState(() => Date.now());
  const [easing, setEasing] = useState(false);
  const [settled, setSettled] = useState(() => Date.now() >= GOWN_CHANGE_AT);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const left = GOWN_CHANGE_AT - current;
      if (left <= 0) return;
      const wait = left > COUNTDOWN_WINDOW_MS ? left - COUNTDOWN_WINDOW_MS : 1000 - (current % 1000);
      timer = window.setTimeout(tick, Math.min(wait, TIMEOUT_MAX));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (gownPhase === "blue") {
      setEasing(false);
      setSettled(true);
      return;
    }
    if (gownPhase !== "wiping") return;
    const wait = Math.max(0, lightPassDelay() - (Date.now() - GOWN_CHANGE_AT));
    const timer = window.setTimeout(() => setEasing(true), wait);
    return () => window.clearTimeout(timer);
  }, [gownPhase]);

  useEffect(() => {
    if (!easing) return;
    const timer = window.setTimeout(() => {
      setEasing(false);
      setSettled(true);
    }, MARK_EASE_MS);
    return () => window.clearTimeout(timer);
  }, [easing]);

  const remaining = GOWN_CHANGE_AT - now;
  if (easing) return { kind: "easing" as const, text: "0" };
  if (remaining > COUNTDOWN_WINDOW_MS || settled) return { kind: "eighteen" as const, text: "18" };
  if (remaining > 10_000) return { kind: "clock" as const, text: formatClock(remaining) };
  if (remaining > 0) return { kind: "digit" as const, text: String(Math.ceil(remaining / 1000)) };
  return { kind: "zero" as const, text: "0" };
}

export default function HeroBanner({ titlesVisible = false }: { titlesVisible?: boolean }) {
  const gownPhase = useCelebrationGown();
  const heroMark = useHeroMark(gownPhase);
  const [petals, setPetals] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);
  const [sparkles, setSparkles] = useState<Array<{ id: number; left: number; top: number; delay: number; duration: number; size: number; gold: boolean }>>([]);

  useEffect(() => {
    // Initialize 18 lovely floating rose petals drifting gently
    const tempPetals = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage left width
      delay: Math.random() * 8, // animations trigger delay
      duration: 6 + Math.random() * 7, // seconds to fall
      size: 10 + Math.random() * 14, // pixels size
    }));
    setPetals(tempPetals);

    const tempSparkles = Array.from({ length: 46 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 92,
      delay: Math.random() * 4.5,
      duration: 1.5 + Math.random() * 2.6,
      size: 4 + Math.random() * 7,
      gold: i % 3 !== 0,
    }));
    setSparkles(tempSparkles);
  }, []);

  return (
    <div 
      className="relative h-dvh w-full overflow-hidden flex flex-col justify-start bg-[#06101c]" 
      id="hero"
    >
      <div
        className="hero-scene absolute inset-0 z-0"
        style={{ backgroundImage: `url('${GOWN_COPPER}')` }}
      />
      {gownPhase !== "copper" && (
        <div className={`absolute inset-0 z-0 ${gownPhase === "wiping" ? "gown-wipe" : ""}`}>
          <img src={GOWN_BLUE} alt="" className="hero-gown" />
        </div>
      )}
      {gownPhase === "wiping" && (
        <div className="gown-magic absolute inset-0 z-[15] overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="gown-edge">
            <div className="gown-feather" aria-hidden="true">
              <div className="gown-feather-blur">
                <div className="gown-feather-shift">
                  <img src={GOWN_BLUE} alt="" className="hero-gown" />
                </div>
              </div>
            </div>
            <div className="gown-haze" />
            <div className="gown-shimmer" />
          </div>
          <div className="gown-edge gown-sparks">
            {CHANGE_ORBS.map((orb) => (
              <span
                key={orb.id}
                className={`change-orb ${orb.gold ? "gold" : ""}`}
                style={{
                  left: `${orb.left}%`,
                  top: `${orb.top}%`,
                  width: `${orb.size}px`,
                  height: `${orb.size}px`,
                  animationDuration: `${orb.duration}s`,
                  animationDelay: `${orb.delay}s`,
                }}
              />
            ))}
            {CHANGE_GLINTS.map((glint) => (
              <span
                key={glint.id}
                className={`change-glitter ${glint.gold ? "gold" : ""} ${glint.dot ? "dot" : ""}`}
                style={{
                  left: `${glint.left}%`,
                  top: `${glint.top}%`,
                  width: `${glint.size}px`,
                  height: `${glint.size}px`,
                  animationDuration: `${glint.duration}s`,
                  animationDelay: `${glint.delay}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {titlesVisible && (
        <>
          <div className="hero-title-in absolute inset-x-0 top-[max(6%,calc(env(safe-area-inset-top)+2.75rem))] z-20 flex justify-center pointer-events-none px-6">
            <div className="relative w-[min(92%,460px)] text-center">
              <div className="hero-name relative z-10 text-[#f3e2b4]">
                <svg aria-hidden="true" className="mx-auto mb-1 h-7 w-14 text-[#f3e2b4]" viewBox="0 0 64 28" fill="none">
                  <path d="M6 22 L14 9 L24 18 L32 4 L40 18 L50 9 L58 22" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M6 22h52" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="32" cy="4" r="1.7" fill="currentColor" />
                  <circle cx="14" cy="9" r="1.2" fill="currentColor" />
                  <circle cx="50" cy="9" r="1.2" fill="currentColor" />
                </svg>
                <div className="relative">
                  <p className="relative font-fairytale text-[2.85rem] sm:text-7xl leading-none">
                    Jaylyn Eirielle
                    <span aria-hidden="true" className="glass-reflect">Jaylyn Eirielle</span>
                  </p>
                  {NAME_GLINTS.map((glint, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={`name-glitter ${glint.gold ? "gold" : ""}`}
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
                <div className={`hero-mark-slot relative mx-auto mt-1 ${heroMark.kind === "digit" || heroMark.kind === "zero" ? "is-digit" : heroMark.kind === "clock" ? "is-clock" : ""}`}>
                  {heroMark.kind === "easing" ? (
                    <>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <p data-gown-mark aria-hidden="true" className="font-playfair leading-none hero-countdown hero-countdown-digit mark-leave">
                          0
                        </p>
                      </div>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <p className="hero-eighteen font-playfair text-[3.2rem] sm:text-6xl leading-none tracking-[0.06em] text-[#f3e2b4] mark-enter">
                          18
                          <span aria-hidden="true" className="glass-reflect late">18</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <p
                      data-gown-mark
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-playfair leading-none tabular-nums ${heroMark.kind === "eighteen" ? "hero-eighteen text-[3.2rem] sm:text-6xl tracking-[0.06em] text-[#f3e2b4]" : `hero-countdown${heroMark.kind === "clock" ? "" : " hero-countdown-digit"}`}`}
                    >
                      {heroMark.text}
                      <span aria-hidden="true" className="glass-reflect late">{heroMark.text}</span>
                    </p>
                  )}
                  {NUMBER_GLINTS.map((glint, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={`name-glitter ${glint.gold ? "gold" : ""}`}
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
                <svg aria-hidden="true" className="mx-auto mt-1 h-4 w-36 text-[#e8d7a8]" viewBox="0 0 144 16" fill="none">
                  <path d="M4 8h52M88 8h52" stroke="currentColor" strokeWidth="0.8" />
                  <path d="M72 8l-3.2 2.4 3.2 2.4 3.2-2.4-3.2-2.4z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          <div className="fairytale-lockup hero-copy-late absolute inset-x-0 bottom-[7%] z-20 flex justify-center pointer-events-none px-6">
            <div className="relative text-center text-[#f6edd6]">
              <div aria-hidden="true" className="fairytale-shine" />
              <p className="relative z-10 font-cinzel text-[15px] sm:text-base tracking-normal sm:tracking-[0.16em] uppercase">Every moment is Your Fairytale</p>
              <p className="relative z-10 font-cinzel text-sm sm:text-base tracking-[0.22em] mt-2">11.07.2026</p>
            </div>
          </div>

          <button
            type="button"
            className="hero-scroll absolute inset-x-0 bottom-4 z-20 flex items-center justify-center text-[#f6edd6]"
            aria-label="Scroll down"
            onClick={() => {
              const next = document.getElementById("hero")?.nextElementSibling;
              next?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <svg aria-hidden="true" className="hero-scroll-chevron h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]" aria-hidden="true">
        {sparkles.map((sparkle) => (
          <span
            key={sparkle.id}
            className={`hero-glitter ${sparkle.gold ? "gold" : ""}`}
            style={{
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              animationDuration: `${sparkle.duration}s`,
              animationDelay: `${sparkle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Floating Petals Layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10" id="petal-container-react">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="absolute rounded-tr-[120%] rounded-bl-[120%] shadow-sm"
            style={{
              left: `${petal.left}%`,
              width: `${petal.size}px`,
              height: `${petal.size * 0.75}px`,
              top: `-30px`,
              animation: `fall ${petal.duration}s linear infinite`,
              animationDelay: `${petal.delay}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
              background: PETAL_FILLS[petal.id % PETAL_FILLS.length],
            }}
          />
        ))}
      </div>

      {/* Custom Styles Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:wght@600;700&display=swap');
        
        .font-cursive-banner {
          font-family: 'Alex Brush', cursive;
        }

        .font-serif-banner {
          font-family: 'Cormorant Garamond', serif;
        }

        /* Replicates the soft white outline/glow around the pink cursive text */
        .pink-text-glow {
          text-shadow: 
            -2px -2px 0px #ffffff,
             2px -2px 0px #ffffff,
            -2px  2px 0px #ffffff,
             2px  2px 0px #ffffff,
             0px  0px 10px rgba(255, 255, 255, 0.9),
             0px  4px 8px rgba(129, 81, 82, 0.15);
        }

        /* Subtle drop shadow to make the gold/sage serif text stand out */
        .gold-text-shadow {
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.45);
        }

        .hero-scene {
          background-repeat: no-repeat;
          background-position: center bottom;
          background-size: auto 100%;
        }

        .hero-gown {
          position: absolute;
          left: 50%;
          bottom: 0;
          height: 100%;
          width: auto;
          max-width: none;
          transform: translateX(-50%);
        }

        @media (max-aspect-ratio: 9/16) {
          .hero-scene {
            background-position: center top;
            background-size: cover;
          }

          .hero-gown {
            left: 0;
            bottom: auto;
            top: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
            transform: none;
          }
        }

        .hero-name {
          text-shadow:
            0 1px 0 rgba(90, 42, 18, 0.35),
            0 8px 22px rgba(6, 16, 32, 0.72);
        }

        .hero-title-in {
          transform-origin: center center;
          animation: heroZoom 1.15s cubic-bezier(0.16, 0.84, 0.24, 1) both;
        }

        .hero-copy-late {
          animation: heroWipe 3.2s cubic-bezier(0.22, 1, 0.36, 1) 1.15s both;
        }

        .hero-scroll {
          opacity: 0;
          animation: heroScrollIn 0.7s ease 4.4s both;
        }

        .hero-scroll-chevron {
          animation: heroScrollBob 1.5s ease-in-out 5.1s infinite;
        }

        @keyframes heroScrollIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes heroScrollBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        @keyframes heroZoom {
          0% { opacity: 0.72; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes heroWipe {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }

        .fairytale-shine {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 125%;
          height: 140%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(6, 14, 32, 0.62) 0%, rgba(6, 14, 32, 0.3) 48%, transparent 74%);
          filter: blur(12px);
          z-index: 0;
        }

        .glass-reflect {
          position: absolute;
          inset: 0;
          color: transparent;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
          background-image: linear-gradient(
            102deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 28%,
            rgba(255, 252, 245, 0.92) 46%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 244, 214, 0.72) 54%,
            rgba(255, 255, 255, 0.08) 72%,
            transparent 100%
          );
          background-repeat: no-repeat;
          background-size: 42% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          animation: glassReflect 3.8s ease-in-out infinite;
          pointer-events: none;
        }

        .glass-reflect.late {
          animation-delay: 0.7s;
        }

        .hero-name::before {
          content: "";
          position: absolute;
          z-index: -1;
          left: 50%;
          top: 48%;
          width: 112%;
          height: 82%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse at center,
            rgba(255, 190, 88, 0.72) 0%,
            rgba(232, 128, 42, 0.38) 36%,
            rgba(176, 72, 18, 0.14) 62%,
            transparent 78%
          );
          filter: blur(16px);
          pointer-events: none;
        }

        .hero-name .font-fairytale,
        .hero-eighteen {
          text-shadow:
            0 0 12px rgba(255, 186, 72, 0.72),
            0 0 28px rgba(214, 108, 28, 0.46);
        }

        .hero-mark-slot {
          height: 3.2rem;
          transition: height 3.2s ease;
        }

        .hero-mark-slot.is-clock {
          height: 2.9rem;
        }

        .hero-mark-slot.is-digit {
          height: 4.5rem;
        }

        .mark-leave,
        .mark-enter {
          animation-duration: 3.2s;
          animation-timing-function: ease;
          animation-fill-mode: forwards;
        }

        .mark-leave {
          animation-name: markLeave;
        }

        .mark-enter {
          animation-name: markEnter;
        }

        @keyframes markLeave {
          0% { opacity: 1; transform: scale(1); }
          68% { opacity: 1; transform: scale(0.71); }
          100% { opacity: 0; transform: scale(0.71); }
        }

        @keyframes markEnter {
          0%, 64% { opacity: 0; }
          100% { opacity: 1; }
        }

        .hero-countdown {
          font-size: 2.9rem;
          letter-spacing: 0.03em;
          color: #fff6d4;
          -webkit-text-stroke: 2px #6a3410;
          paint-order: stroke fill;
          text-shadow:
            0 0 18px rgba(255, 186, 72, 0.95),
            0 3px 0 rgba(62, 28, 8, 0.55);
        }

        .hero-countdown-digit {
          font-size: 4.5rem;
          letter-spacing: 0;
        }

        .hero-countdown .glass-reflect {
          -webkit-text-stroke: 0;
          text-shadow: none;
        }

        @media (min-width: 640px) {
          .hero-countdown { font-size: 3.5rem; }
          .hero-countdown-digit { font-size: 5.3rem; }
          .hero-mark-slot { height: 3.75rem; }
          .hero-mark-slot.is-clock { height: 3.5rem; }
          .hero-mark-slot.is-digit { height: 5.3rem; }
        }

        @keyframes glassReflect {
          0%, 12% { background-position: -70% 0; }
          48%, 100% { background-position: 170% 0; }
        }

        .name-glitter,
        .hero-glitter {
          position: absolute;
          opacity: 0;
          color: #fffdf8;
          background: none;
          -webkit-animation-name: heroGlitter;
          animation-name: heroGlitter;
          -webkit-animation-timing-function: ease-in-out;
          animation-timing-function: ease-in-out;
          -webkit-animation-iteration-count: infinite;
          animation-iteration-count: infinite;
          -webkit-animation-fill-mode: both;
          animation-fill-mode: both;
        }

        .name-glitter { z-index: 2; }

        .name-glitter.gold,
        .hero-glitter.gold { color: #f6e3b0; }

        .name-glitter::before,
        .hero-glitter::before,
        .change-glitter::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 340%;
          height: 340%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 252, 244, 0.95) 0%, rgba(255, 220, 160, 0.55) 28%, rgba(255, 186, 100, 0.16) 52%, transparent 70%);
          -webkit-transform: translate(-50%, -50%);
          transform: translate(-50%, -50%);
        }

        .name-glitter.gold::before,
        .hero-glitter.gold::before,
        .change-glitter.gold::before {
          background: radial-gradient(circle, rgba(255, 244, 210, 0.98) 0%, rgba(255, 196, 110, 0.62) 30%, rgba(226, 140, 60, 0.2) 54%, transparent 72%);
        }

        .name-glitter::after,
        .hero-glitter::after,
        .change-glitter::after {
          content: "";
          position: absolute;
          inset: 0;
          background: currentColor;
          -webkit-clip-path: polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%);
          clip-path: polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%);
        }

        .change-glitter.dot::after {
          inset: 16%;
          border-radius: 50%;
          -webkit-clip-path: none;
          clip-path: none;
        }

        @-webkit-keyframes heroGlitter {
          0%, 100% { opacity: 0; -webkit-transform: translate3d(0, 0, 0) scale(0.35) rotate(0deg); }
          8% { opacity: 1; -webkit-transform: translate3d(0, 0, 0) scale(1) rotate(16deg); }
          16% { opacity: 0; -webkit-transform: translate3d(0, 0, 0) scale(0.45) rotate(28deg); }
        }

        @keyframes heroGlitter {
          0%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.35) rotate(0deg); }
          8% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(16deg); }
          16% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.45) rotate(28deg); }
        }

        .gown-wipe {
          -webkit-clip-path: inset(0 0 100% 0);
          clip-path: inset(0 0 100% 0);
          -webkit-animation: gownWipe ${WIPE_SECONDS}s linear forwards;
          animation: gownWipe ${WIPE_SECONDS}s linear forwards;
          will-change: clip-path;
        }

        @-webkit-keyframes gownWipe {
          0%, 17% { -webkit-clip-path: inset(0 0 100% 0); clip-path: inset(0 0 100% 0); }
          87%, 100% { -webkit-clip-path: inset(0 0 0 0); clip-path: inset(0 0 0 0); }
        }

        @keyframes gownWipe {
          0%, 17% { clip-path: inset(0 0 100% 0); }
          87%, 100% { clip-path: inset(0 0 0 0); }
        }

        .gown-feather {
          position: absolute;
          inset: -8% 0 -42%;
          -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 8%,
            #000 18%,
            #000 34%,
            rgba(0, 0, 0, 0.55) 52%,
            rgba(0, 0, 0, 0.18) 68%,
            transparent 84%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 8%,
            #000 18%,
            #000 34%,
            rgba(0, 0, 0, 0.55) 52%,
            rgba(0, 0, 0, 0.18) 68%,
            transparent 84%,
            transparent 100%
          );
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          transform: translateZ(0);
        }

        .gown-feather-blur {
          position: absolute;
          inset: 0;
          filter: blur(22px);
          transform: translateZ(0);
        }

        .gown-feather-shift {
          position: absolute;
          left: 6.897%;
          width: 86.207%;
          top: 72%;
          height: 196.08%;
          -webkit-animation: gownFeatherLock ${WIPE_SECONDS}s linear forwards;
          animation: gownFeatherLock ${WIPE_SECONDS}s linear forwards;
        }

        @-webkit-keyframes gownFeatherLock {
          from { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); }
          to { -webkit-transform: translate3d(0, -142%, 0); transform: translate3d(0, -142%, 0); }
        }

        @keyframes gownFeatherLock {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(0, -142%, 0); }
        }

        .gown-edge {
          position: absolute;
          left: -8%;
          width: 116%;
          height: 34%;
          top: -34%;
          -webkit-animation: gownEdge ${WIPE_SECONDS}s linear forwards;
          animation: gownEdge ${WIPE_SECONDS}s linear forwards;
          will-change: transform;
        }

        .gown-sparks {
          z-index: 2;
        }

        @-webkit-keyframes gownEdge {
          from { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); }
          to { -webkit-transform: translate3d(0, 417.65%, 0); transform: translate3d(0, 417.65%, 0); }
        }

        @keyframes gownEdge {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(0, 417.65%, 0); }
        }

        .gown-haze {
          position: absolute;
          inset: 8% -4% 10%;
          background: radial-gradient(ellipse at 50% 50%, rgba(255, 236, 196, 0.9), rgba(255, 210, 140, 0.42) 28%, rgba(255, 176, 90, 0.12) 58%, transparent 78%);
        }

        .gown-shimmer {
          position: absolute;
          inset: 22% 0 24%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255, 236, 190, 0.22) 22%,
            rgba(255, 252, 244, 0.92) 50%,
            rgba(255, 214, 140, 0.24) 78%,
            transparent 100%
          );
        }

        .change-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 252, 244, 0.96) 0%, rgba(255, 226, 170, 0.72) 22%, rgba(255, 186, 110, 0.28) 48%, transparent 72%);
          -webkit-animation-name: changeOrb;
          animation-name: changeOrb;
          -webkit-animation-timing-function: ease-in-out;
          animation-timing-function: ease-in-out;
          -webkit-animation-iteration-count: infinite;
          animation-iteration-count: infinite;
          -webkit-animation-fill-mode: both;
          animation-fill-mode: both;
        }

        .change-orb.gold {
          background: radial-gradient(circle, rgba(255, 248, 224, 1) 0%, rgba(255, 204, 120, 0.78) 24%, rgba(226, 146, 64, 0.32) 50%, transparent 72%);
        }

        .change-glitter {
          position: absolute;
          opacity: 0;
          color: #fffdf8;
          background: none;
          -webkit-animation-name: changeGlitter;
          animation-name: changeGlitter;
          -webkit-animation-timing-function: ease-in-out;
          animation-timing-function: ease-in-out;
          -webkit-animation-iteration-count: infinite;
          animation-iteration-count: infinite;
          -webkit-animation-fill-mode: both;
          animation-fill-mode: both;
        }

        .change-glitter.gold { color: #f6e3b0; }

        @-webkit-keyframes changeOrb {
          0%, 100% { opacity: 0.35; -webkit-transform: translate3d(0, 0, 0) scale(0.72); }
          50% { opacity: 1; -webkit-transform: translate3d(0, 0, 0) scale(1.08); }
        }

        @keyframes changeOrb {
          0%, 100% { opacity: 0.35; transform: translate3d(0, 0, 0) scale(0.72); }
          50% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.08); }
        }

        @-webkit-keyframes changeGlitter {
          0%, 100% { opacity: 0; -webkit-transform: translate3d(0, 0, 0) scale(0.3) rotate(0deg); }
          45% { opacity: 1; -webkit-transform: translate3d(0, 0, 0) scale(1.25) rotate(20deg); }
        }

        @keyframes changeGlitter {
          0%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.3) rotate(0deg); }
          45% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.25) rotate(20deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .glass-reflect { animation: none; opacity: 0; }
          .mark-leave { animation: none; opacity: 0; }
          .mark-enter { animation: none; opacity: 1; transform: none; filter: none; }
          .hero-title-in, .hero-copy-late, .hero-scroll, .hero-scroll-chevron { animation: none; }
          .hero-scroll { opacity: 1; }
        }

        @keyframes fall {
          0% {
            transform: translateY(-10px) rotate(0deg) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.65;
          }
          90% {
            opacity: 0.65;
          }
          100% {
            transform: translateY(850px) rotate(360deg) translateX(45px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}