/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import type { NameMatch } from "../attendance/types";
import NameLookup from "./NameLookup";

interface EnvelopeExperienceProps {
  onEnter: (guestId: string) => void;
  onPrepare?: (guestId: string) => void;
  onOpen?: () => void;
}

// Set your background and wax seal image paths here
const ENVELOPE_IMAGE = "/assets/images/envelop-closed.png?v=6";
const SEAL_IMAGE = "/assets/images/seal.png";
const ROSES_SCENE_IMAGE = "/assets/images/fall-wedding.png";
const PETAL_FILLS = [
  "radial-gradient(ellipse at 40% 30%, #f0c48a, #d4894a 42%, #b87333)",
  "radial-gradient(ellipse at 40% 30%, #f2b56a, #e07a3d 40%, #c45a22)",
  "radial-gradient(ellipse at 40% 30%, #e8c49a, #c9956b 36%, #d4783a)",
];

export default function EnvelopeExperience({ onEnter, onPrepare, onOpen }: EnvelopeExperienceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scenePhase, setScenePhase] = useState<"sealed" | "wash" | "roses">("sealed");
  const [isCardUp, setIsCardUp] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [pickedGuest, setPickedGuest] = useState<NameMatch | null>(null);

  // Simple particle system for the landing overlay
  const [bgPetals, setBgPetals] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);
  const [glints, setGlints] = useState<Array<{ id: number; left: number; top: number; delay: number; duration: number; size: number; gold: boolean }>>([]);
  const [cardGlints, setCardGlints] = useState<Array<{ id: number; left: number; top: number; delay: number; duration: number; size: number; gold: boolean }>>([]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.left = "0";
    body.style.top = `-${scrollY}px`;
    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.width = previous.bodyWidth;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const tempPetals = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 6,
      size: 10 + Math.random() * 12,
    }));
    setBgPetals(tempPetals);

    const tempGlints = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      top: 3 + Math.random() * 62,
      delay: -(Math.random() * 3.2),
      duration: 1.8 + Math.random() * 2.2,
      size: 5 + Math.random() * 3,
      gold: i % 2 === 0,
    }));
    setGlints(tempGlints);

    const tempCardGlints = Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: 8 + Math.random() * 84,
      delay: -(Math.random() * 3.2),
      duration: 1.8 + Math.random() * 2.2,
      size: 3 + Math.random() * 2.5,
      gold: i % 2 === 0,
    }));
    setCardGlints(tempCardGlints);
  }, []);

  const handleOpenFlap = () => {
    if (isOpen) return;
    setIsOpen(true);
    setScenePhase("roses");
    onOpen?.();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flap = document.querySelector<HTMLElement>(".env-slice.bottom");
    if (reduceMotion || !flap) {
      window.setTimeout(() => setIsCardUp(true), reduceMotion ? 320 : 3050);
      return;
    }

    let shown = false;
    const showCard = () => {
      if (shown) return;
      shown = true;
      flap.removeEventListener("transitionend", onFlapOpen);
      setIsCardUp(true);
    };
    const onFlapOpen = (event: Event) => {
      const transition = event as TransitionEvent;
      if (transition.target !== flap || transition.propertyName !== "transform") return;
      showCard();
    };
    flap.addEventListener("transitionend", onFlapOpen);
    window.setTimeout(showCard, 3050);
  };

  const handleEnterCelebration = () => {
    if (!pickedGuest) return;
    onPrepare?.(pickedGuest.id);
    setIsFading(true);

    setTimeout(() => {
      setIsDismissed(true);
      onEnter(pickedGuest.id);
    }, 950);
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Styled block injection */}
      <style>{`
        /* Envelope design and keyframe animations compiled cleanly in component style block */
        #envelope-wrapper {
          --rose:        #e8a0b4;
          --rose-light:  #f2c4d0;
          --rose-pale:   #fdeef3;
          --rose-deep:   #c4607a;
          --rose-dark:   #8b3a52;
          --petal:       #fff5f8;
          --petal2:      #fad8e5;
          --petal3:      #f7c8d8;
          --gold:        #c9a878;
          --gold-light:  #e8d4a8;
          --cream:       #fffbfc;
          --ink:         #3d1a26;
          --ink-mid:     #7a3f55;
          --ink-soft:    #b07888;
          --blush:       #f9e0e8;
          --blush2:      #f4c8d8;
          --warm:        #fef0e0;
        }

        .photo-env {
          position: absolute;
          inset: 0;
          z-index: 12;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .photo-env.is-open {
          pointer-events: none;
        }

        .photo-frame {
          --jx: 54.9%;
          --jy: 47%;
          position: relative;
          width: 100dvw;
          height: calc(100dvw * 1347 / 862);
          perspective: 1400px;
          transform-style: preserve-3d;
        }

        .env-slice {
          position: absolute;
          inset: 0;
          background: url("/assets/images/envelop-closed.png?v=6") center / 100% 100% no-repeat;
          backface-visibility: hidden;
          transform-style: preserve-3d;
          transition: transform 1.7s ease 1.35s, opacity 0.7s ease 2.85s;
        }

        .env-slice.top {
          clip-path: polygon(0 0, 100% 0, var(--jx) var(--jy));
          transform-origin: center top;
        }

        .env-slice.bottom {
          clip-path: polygon(0 100%, 100% 100%, var(--jx) var(--jy));
          transform-origin: center bottom;
        }

        .env-slice.left {
          clip-path: polygon(0 0, 0 100%, var(--jx) var(--jy));
          transform-origin: left center;
        }

        .env-slice.right {
          clip-path: polygon(100% 0, 100% 100%, var(--jx) var(--jy));
          transform-origin: right center;
        }

        .photo-env.is-open .env-slice.top { transform: rotateX(-128deg); transition-delay: 1.15s, 2.65s; }
        .photo-env.is-open .env-slice.left { transform: rotateY(128deg); transition-delay: 1.25s, 2.75s; }
        .photo-env.is-open .env-slice.right { transform: rotateY(-128deg); transition-delay: 1.25s, 2.75s; }
        .photo-env.is-open .env-slice.bottom { transform: rotateX(128deg); transition-delay: 1.35s, 2.85s; }
        .photo-env.is-open .env-slice { opacity: 0; }

        .env-seal {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 4;
          width: min(132px, 30%);
          height: auto;
          transform: translate(-50%, -50%);
          pointer-events: none;
          filter: drop-shadow(0 10px 12px rgba(20, 8, 4, 0.4));
          transition: left 1.2s ease, opacity 1.2s ease;
        }

        .photo-env.is-open .env-seal {
          left: 88%;
          opacity: 0;
        }

        .photo-hint {
          position: absolute;
          left: 50%;
          bottom: 6%;
          transform: translateX(-50%);
          z-index: 3;
          pointer-events: none;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #f09060;
          background: rgba(6, 16, 32, 0.72);
          padding: 6px 12px;
          border: 1px solid rgba(240, 144, 96, 0.7);
          white-space: nowrap;
        }

        /* Invitation card appears after the envelope has opened */
        .roses-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 100lvh;
          background: center / cover no-repeat;
          opacity: 0;
          z-index: 1;
          pointer-events: none;
          transition: opacity 1.8s ease;
        }

        .roses-layer.show {
          opacity: 1;
          filter: brightness(0.42);
          animation: backdropLight 3.4s ease forwards;
        }

        @keyframes backdropLight {
          0% { filter: brightness(0.42); }
          78% { filter: brightness(1.35); }
          100% { filter: brightness(1.05); }
        }

        .scene-light {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(ellipse at center, rgba(255, 220, 170, 0.62) 0%, rgba(240, 144, 96, 0.28) 32%, rgba(7, 24, 46, 0) 68%);
          mix-blend-mode: screen;
        }

        .scene-light.on {
          animation: sceneLight 3.4s ease forwards;
        }

        @keyframes sceneLight {
          0% { opacity: 0; }
          78% { opacity: 1; }
          100% { opacity: 0.42; }
        }

        .scene-wash {
          position: absolute;
          inset: 0;
          background: #fff;
          opacity: 0;
          z-index: 40;
          pointer-events: none;
          transition: opacity 0.7s ease;
        }

        .scene-wash.wash {
          opacity: 1;
        }

        .scene-wash.roses {
          opacity: 0;
          transition: opacity 1.15s ease;
        }

        .inv-card {
          --fit: min(1, (100dvw - 48px) / 432px, (100dvh - 40px) / 630px);
          position: fixed;
          top: 50%; left: 50%;
          width: 360px;
          height: 520px;
          z-index: 50;
          opacity: 0;
          visibility: hidden;
          transform: translate(-50%, -50%) scale(var(--fit));
          transform-origin: center center;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: visible;
        }

        .inv-card.up {
          visibility: visible;
          animation: cardAppear 0.5s ease forwards;
        }

        @keyframes cardAppear {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .inv-card-bg {
          position: absolute;
          inset: 0;
          background-color: #07182e;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E"),
            repeating-linear-gradient(0deg, rgba(255,248,236,0.14) 0 1px, transparent 1px 3px),
            repeating-linear-gradient(90deg, rgba(8,22,38,0.16) 0 1px, transparent 1px 5px);
          background-size: 180px 180px, auto, auto;
          background-blend-mode: soft-light, soft-light, multiply;
          border: 1px solid rgba(232,150,86,0.7);
          box-shadow:
            0 30px 70px rgba(2,8,20,0.62),
            0 10px 24px rgba(0,0,0,0.4),
            0 0 36px rgba(212,165,116,0.22),
            inset 0 1px 0 rgba(255,244,230,0.22),
            inset 0 0 0 6px rgba(18,52,80,0.4),
            inset 0 0 0 7px rgba(215,165,122,0.38);
          z-index: 0;
          overflow: hidden;
        }

        .inv-card-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E");
          opacity: 0.28;
          mix-blend-mode: multiply;
          pointer-events: none;
        }

        .inv-card-bg::after {
          content: '';
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(232,150,86,0.45);
          pointer-events: none;
        }

        /* Flower Clusters on invitation card */
        .inv-card-flowers-top {
          position: absolute;
          top: -100px; left: -36px;
          width: 156px;
          height: auto;
          aspect-ratio: 717 / 1074;
          max-width: none;
          max-height: none;
          object-fit: contain;
          pointer-events: none;
          z-index: 40;
          opacity: 0;
          transform: translateY(-26px) scale(0.9);
          transform-origin: 28% 0%;
        }

        .inv-card.up .inv-card-flowers-top {
          animation: flowerEase 1.25s ease 0.2s both;
        }

        .inv-card-flowers-top.mirror {
          left: auto;
          right: -36px;
          transform: translateY(-26px) scale(0.9) scaleX(-1);
          transform-origin: top center;
        }

        .inv-card.up .inv-card-flowers-top.mirror {
          animation-name: flowerEaseMirror;
          animation-delay: 0.38s;
        }

        @keyframes flowerEase {
          from { opacity: 0; transform: translateY(-26px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes flowerEaseMirror {
          from { opacity: 0; transform: translateY(-26px) scale(0.9) scaleX(-1); }
          to { opacity: 1; transform: scaleX(-1); }
        }

        .card-glitter {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 4;
        }

        .inv-inner {
          position: relative;
          z-index: 10;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          width: 100%;
          height: 100%;
        }

        .scene-glitter {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }

        .scene-glint {
          position: absolute;
          opacity: 0;
          background: #fffdf6;
          clip-path: polygon(50% 0%, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0% 50%, 42% 42%);
          filter: drop-shadow(0 0 5px rgba(255, 236, 200, 0.95));
          animation-name: sceneGlint;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .scene-glint.gold {
          background: #f0c48a;
          filter: drop-shadow(0 0 6px rgba(226, 158, 86, 0.95));
        }

        @keyframes sceneGlint {
          0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
          6% { opacity: 1; transform: scale(1) rotate(12deg); }
          22% { opacity: 0; transform: scale(0.35) rotate(24deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .scene-glint { animation: none; opacity: 0; }
          .inv-card.up {
            animation: none;
            opacity: 1;
            transform: translate(-50%, -50%) scale(var(--fit));
          }
          .inv-card-flowers-top,
          .inv-card.up .inv-card-flowers-top {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .inv-card-flowers-top.mirror,
          .inv-card.up .inv-card-flowers-top.mirror {
            animation: none;
            opacity: 1;
            transform: scaleX(-1);
          }
          .photo-env.is-open .env-slice {
            transform: none;
            opacity: 0;
            transition: opacity 0.3s linear;
          }
          .photo-env.is-open .env-seal {
            left: 50%;
            opacity: 0;
            transition: opacity 0.2s linear;
          }
          .roses-layer.show {
            animation: none;
            filter: none;
            opacity: 1;
          }
          .scene-light,
          .scene-light.on {
            animation: none;
            opacity: 0;
          }
        }

        /* Overlay floating petals fall */
        .overlay-petal {
          position: absolute;
          top: -30px;
          opacity: 0;
          background: radial-gradient(ellipse at 40% 30%, #f0c48a, #d4894a 42%, #e07a3d);
          border-radius: 60% 40% 70% 30% / 50% 60% 40% 70%;
          animation: petalFall linear infinite;
          pointer-events: none;
        }

        @keyframes petalFall {
          0% {
            opacity: 0;
            transform: translateY(0) rotate(0deg) translateX(0);
          }
          8% {
            opacity: 0.85;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            transform: translateY(110vh) rotate(640deg) translateX(70px);
          }
        }
      `}</style>

      {/* Primary Overlay screen loading your scenic painting as a full backdrop */}
      <div 
        id="envelope-wrapper"
        className={`fixed left-0 top-0 z-[9999] h-[100lvh] min-h-[100lvh] w-full overflow-hidden overscroll-none select-none transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ backgroundColor: "#06101c", width: "100%", height: "100lvh", minHeight: "100lvh" }}
      >
        <div className="scene-glitter" aria-hidden="true">
          {glints.map((glint) => (
            <span
              key={glint.id}
              className={`scene-glint ${glint.gold ? "gold" : ""}`}
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

        <div
          className={`roses-layer ${scenePhase === "roses" ? "show" : ""}`}
          style={{ backgroundImage: `url(${ROSES_SCENE_IMAGE})` }}
        />
        <div className={`scene-light ${scenePhase === "roses" ? "on" : ""}`} aria-hidden="true" />
        <div className={`scene-wash ${scenePhase === "sealed" ? "" : scenePhase}`} />

        <div className={`inv-card ${isCardUp ? "up" : ""}`}>
          <div className="inv-card-bg" />
          <div className="card-glitter" aria-hidden="true">
            {cardGlints.map((glint) => (
              <span
                key={glint.id}
                className={`scene-glint ${glint.gold ? "gold" : ""}`}
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
          <img src="/assets/images/top_flower.png?v=2" alt="" className="inv-card-flowers-top" />
          <img src="/assets/images/top_flower.png?v=2" alt="" className="inv-card-flowers-top mirror" />
          <div className="inv-inner py-6 px-3">
            <span className="font-serif text-[18px] text-[#f09060]">❧</span>
            <div>
              <span className="font-cinzel text-sm tracking-[0.16em] text-[#f09060] uppercase block mb-1">
                You are invited to
              </span>
              <span className="h-[1px] w-12 bg-[#f09060]/70 mx-auto block mb-3" />
              <img
                src="/assets/images/18th-text.png"
                alt="Jaylyn Eirielle 18th Birthday"
                className="w-full max-w-[240px] h-auto mx-auto object-contain"
              />
            </div>
            <div className="font-garamond text-white text-base leading-snug">
              <p>Saturday, November 7, 2026</p>
              <p className="text-[#f09060]">5:00 PM</p>
              <p className="mt-1 text-base text-[#f0d7b4]">Angelitos Event Center<br />Batangas City</p>
            </div>
            <div className="w-full px-1">
              <NameLookup tone="card" onChange={setPickedGuest} />
            </div>
            <button
              id="enterBtn"
              type="button"
              disabled={!pickedGuest}
              onClick={handleEnterCelebration}
              className="invite-btn mt-2"
            >
              Enter the Celebration
            </button>
            <span className="font-serif text-[18px] text-[#f09060] transform rotate-180 block">❧</span>
          </div>
        </div>

        {/* Falling petals inside overlay view */}
        {bgPetals.map((petal) => (
          <div 
            key={petal.id}
            className="overlay-petal z-10"
            style={{
              left: `${petal.left}%`,
              width: `${petal.size}px`,
              height: `${petal.size * 1.3}px`,
              animationDuration: `${petal.duration}s`,
              animationDelay: `${petal.delay}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
              background: PETAL_FILLS[petal.id % PETAL_FILLS.length],
            }}
          />
        ))}

        <button
          type="button"
          className={`photo-env ${isOpen ? "is-open" : ""}`}
          onClick={handleOpenFlap}
          aria-label="Open the invitation"
        >
          <span className="photo-frame">
            <span className="env-slice top" />
            <span className="env-slice right" />
            <span className="env-slice bottom" />
            <span className="env-slice left" />
            <img src={SEAL_IMAGE} alt="" className="env-seal" />
            {!isOpen && <span className="photo-hint">tap to open</span>}
          </span>
        </button>
      </div>
    </>
  );
}