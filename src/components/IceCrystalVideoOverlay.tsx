import { useEffect, useRef, useState } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";

export type IceCrystalVariant =
  | "standard"
  | "grand"
  | "quick"
  | "finale"
  | "topBreeze";

export type IceCrystalSwirl = "left" | "right" | "center";

export type IceCrystalTrigger = {
  time: number;
  variant?: IceCrystalVariant;
  /** Pairs of top breezes (e.g. 0:51 left / 0:52 right) get distinct circular centers. */
  swirl?: IceCrystalSwirl;
};

type Burst = {
  id: number;
  wallStart: number;
  variant: IceCrystalVariant;
  swirl?: IceCrystalSwirl;
};

type IceTiming = { pop: number; hold: number; fade: number };

const TIMING: Record<IceCrystalVariant, IceTiming> = {
  standard: { pop: 120, hold: 1000, fade: 2000 },
  grand: { pop: 100, hold: 1100, fade: 2100 },
  quick: { pop: 80, hold: 450, fade: 1100 },
  finale: { pop: 100, hold: 1200, fade: 2200 },
  topBreeze: { pop: 110, hold: 1050, fade: 2100 },
};

function totalMs(variant: IceCrystalVariant) {
  const t = TIMING[variant];
  return t.pop + t.hold + t.fade;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function burstOpacity(elapsedMs: number, variant: IceCrystalVariant): number | null {
  const { pop, hold, fade } = TIMING[variant];
  const total = pop + hold + fade;
  if (elapsedMs >= total) return null;
  if (elapsedMs < pop) {
    return easeOutCubic(elapsedMs / pop);
  }
  if (elapsedMs < pop + hold) {
    return 1;
  }
  const fadeT = (elapsedMs - pop - hold) / fade;
  return 1 - easeInOutSine(fadeT);
}

type FlakeSeed = {
  phase: number;
  orbitRadius: number;
  orbitSpeed: number;
  vortexX: number;
  vortexY: number;
  windFactor: number;
  size: number;
  rot: number;
  dot: boolean;
  depth: number;
};

const VORTICES = [
  { x: 30, y: 52 },
  { x: 54, y: 44 },
  { x: 42, y: 68 },
];

/** Upper third — circular breezes (visible orbit, not pinned to the very top edge). */
const VORTICES_TOP_LEFT = [
  { x: 24, y: 22 },
  { x: 36, y: 16 },
  { x: 30, y: 30 },
];

const VORTICES_TOP_RIGHT = [
  { x: 48, y: 16 },
  { x: 62, y: 22 },
  { x: 54, y: 28 },
];

const VORTICES_TOP_CENTER = [
  { x: 34, y: 20 },
  { x: 44, y: 14 },
  { x: 52, y: 20 },
  { x: 44, y: 26 },
];

const VORTICES_FINALE = [
  { x: 20, y: 18 },
  { x: 42, y: 12 },
  { x: 64, y: 18 },
  { x: 30, y: 26 },
  { x: 54, y: 26 },
  { x: 42, y: 22 },
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function vortexPool(variant: IceCrystalVariant, swirl: IceCrystalSwirl) {
  if (variant === "topBreeze") {
    if (swirl === "left") return VORTICES_TOP_LEFT;
    if (swirl === "right") return VORTICES_TOP_RIGHT;
    return VORTICES_TOP_CENTER;
  }
  if (variant === "finale") return VORTICES_FINALE;
  return VORTICES;
}

function flakesForBurst(
  burstId: number,
  variant: IceCrystalVariant,
  swirl: IceCrystalSwirl = "center",
): FlakeSeed[] {
  const count =
    variant === "grand"
      ? 42
      : variant === "quick"
        ? 16
        : variant === "finale"
          ? 48
          : variant === "topBreeze"
            ? 56
            : 42;
  const pool = vortexPool(variant, swirl);
  const vortexCount =
    variant === "standard" ||
    variant === "grand" ||
    variant === "finale" ||
    variant === "topBreeze"
      ? pool.length
      : 2;
  const flakes: FlakeSeed[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = pseudoRandom(burstId * 17 + i * 3.1);
    const r2 = pseudoRandom(burstId * 31 + i * 5.7);
    const r3 = pseudoRandom(burstId * 47 + i * 2.3);
    const r4 = pseudoRandom(burstId * 61 + i * 4.1);
    const r5 = pseudoRandom(burstId * 73 + i * 6.3);
    const base = pool[i % vortexCount];
    const spread =
      variant === "topBreeze" ? 9 : variant === "finale" ? 11 : 10;
    const vortex = {
      x: base.x + (r4 - 0.5) * spread,
      y: base.y + (r5 - 0.5) * spread,
    };
    const spinBase =
      variant === "quick"
        ? 1.6 + r2 * 1.2
        : variant === "topBreeze" || variant === "finale"
          ? 1.45 + r2 * 1.5
          : 1.1 + r2 * 1.4;
    const spin = (i % 2 === 0 ? 1 : -1) * spinBase;
    const orbitMax =
      variant === "grand"
        ? 22
        : variant === "topBreeze"
          ? 18
          : variant === "finale"
            ? 24
            : 24;
    let size =
      2.5 +
      r3 *
        (variant === "quick"
          ? 3.5
          : variant === "finale"
            ? 4.8
            : variant === "topBreeze"
              ? 4.2
              : variant === "grand"
                ? 5.2
                : 6.75);
    if (variant === "topBreeze" && r2 > 0.82) {
      size += 0.8 + r1 * 1.2;
    }
    flakes.push({
      phase: r1 * Math.PI * 2,
      orbitRadius: 10 + r3 * orbitMax,
      orbitSpeed: spin,
      vortexX: vortex.x,
      vortexY: vortex.y,
      windFactor: 0.55 + r3 * 0.65,
      size,
      rot: r4 * 360,
      dot: variant === "topBreeze" ? r4 > 0.88 : r4 > 0.58,
      depth: variant === "topBreeze" ? 0.45 + r5 * 0.55 : 0.25 + r5 * 0.75,
    });
  }
  return flakes;
}

function swirlMotion(
  flake: FlakeSeed,
  elapsedMs: number,
  variant: IceCrystalVariant,
) {
  const t = elapsedMs / 1000;
  const life = Math.min(1, elapsedMs / totalMs(variant));
  const circular =
    variant === "topBreeze" || variant === "finale" || variant === "grand";

  const windStrength =
    variant === "quick" ? 9 : variant === "grand" ? 11 : circular ? 6 : 10;

  const windX = circular ? t * windStrength * 0.35 : t * windStrength;
  const windY =
    -t * (circular ? 1.4 : 2.2) + Math.sin(t * 1.3 + flake.phase) * 1.2;

  const wobble = circular ? 3.2 : 5.5;
  const cx = flake.vortexX + Math.sin(t * 0.85 + flake.phase) * wobble;
  const cy = flake.vortexY + Math.cos(t * 1.05 + flake.phase * 0.8) * wobble;

  const radius = flake.orbitRadius * (0.55 + life * 0.9);
  const angle = flake.phase + t * flake.orbitSpeed;
  const orbitEllipse = variant === "topBreeze" || variant === "finale" ? 0.88 : 0.62;
  const orbitX = Math.cos(angle) * radius;
  const orbitY = Math.sin(angle) * radius * orbitEllipse;

  const sway = Math.sin(t * 2.2 + flake.phase) * (circular ? 2 : 3.5);
  const lift = Math.cos(t * 1.6 + flake.phase * 1.2) * (circular ? 2.4 : 2.2);

  const windScale = circular ? 0.12 : 0.22;
  const x = cx + orbitX + windX * flake.windFactor * windScale + sway;
  const y = cy + orbitY + windY * flake.windFactor * 0.25 + lift;
  const rot = flake.rot + t * 48 + angle * 28;

  return { x, y, rot };
}

function TinySnowflake({
  size,
  alpha,
  bold = false,
}: {
  size: number;
  alpha: number;
  bold?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      style={{
        opacity: alpha,
        filter: bold
          ? "drop-shadow(0 0 2px rgba(224,242,254,0.95)) drop-shadow(0 0 5px rgba(186,230,253,0.55))"
          : undefined,
      }}
    >
      <g
        fill="none"
        stroke="rgba(248,250,252,0.98)"
        strokeWidth={bold ? 0.85 : 0.55}
        strokeLinecap="round"
      >
        <path d="M6 1.5v9M1.5 6h9M3 3l6 6M9 3L3 9" />
      </g>
    </svg>
  );
}

function SwirlMist({
  opacity,
  elapsedMs,
  grand,
  topHeavy,
  compactTop,
  mistCenterX = 50,
}: {
  opacity: number;
  elapsedMs: number;
  grand: boolean;
  topHeavy?: boolean;
  compactTop?: boolean;
  mistCenterX?: number;
}) {
  const t = elapsedMs / 1000;
  const spin = t * (topHeavy ? 28 : 22);
  const anchor = topHeavy ? "top-[20%]" : "top-1/2";
  const size = compactTop
    ? "h-[44%] w-[56%]"
    : topHeavy
      ? "h-[58%] w-[72%]"
      : "h-[85%] w-[85%]";
  return (
    <>
      <div
        className={`absolute ${anchor} ${size} -translate-y-1/2 rounded-full opacity-70`}
        style={{
          left: `${mistCenterX}%`,
          opacity: opacity * (topHeavy ? 0.48 : 0.35),
          transform: `translate(-50%, -50%) rotate(${spin}deg)`,
          background:
            "conic-gradient(from 0deg, transparent, rgba(224,242,254,0.14), transparent, rgba(186,230,253,0.1), transparent)",
        }}
      />
      {grand || (topHeavy && !compactTop) ? (
        <div
          className={`absolute ${anchor} ${topHeavy ? "h-[50%] w-[66%]" : "h-[70%] w-[70%]"} -translate-y-1/2 rounded-full`}
          style={{
            left: `${mistCenterX}%`,
            opacity: opacity * 0.45,
            transform: `translate(-50%, -50%) rotate(${-spin * 1.35}deg)`,
            background:
              "conic-gradient(from 40deg, transparent, rgba(56,189,248,0.12), transparent, rgba(224,242,254,0.16), transparent)",
          }}
        />
      ) : null}
    </>
  );
}

function SnowBreezeBurst({
  burstId,
  variant,
  swirl = "center",
  elapsedMs,
  opacity,
}: {
  burstId: number;
  variant: IceCrystalVariant;
  swirl?: IceCrystalSwirl;
  elapsedMs: number;
  opacity: number;
}) {
  const flakes = flakesForBurst(burstId, variant, swirl);
  const isTop = variant === "topBreeze";
  const isFinale = variant === "finale";
  const isGrand = variant === "grand";
  const mistCenterX =
    swirl === "left" ? 32 : swirl === "right" ? 56 : 44;
  const fadeIn = Math.min(1, elapsedMs / 180);
  const flakeAlphaBoost = isFinale ? 1.1 : isTop ? 1.08 : 1.12;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SwirlMist
        opacity={opacity}
        elapsedMs={elapsedMs}
        grand={isGrand || isFinale}
        topHeavy={isTop || isFinale}
        compactTop={isTop}
        mistCenterX={isTop ? mistCenterX : 50}
      />
      {flakes.map((flake, i) => {
        const { x, y, rot } = swirlMotion(flake, elapsedMs, variant);
        const alpha =
          opacity *
          fadeIn *
          flakeAlphaBoost *
          (isTop ? 0.42 + flake.depth * 0.58 : 0.25 + flake.depth * 0.55) *
          (0.85 + (i % 3) * 0.05);
        const blur = isTop ? 0 : flake.depth < 0.45 ? 0.6 : 0;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              filter: blur ? `blur(${blur}px)` : undefined,
            }}
          >
            {flake.dot ? (
              <span
                className={`block rounded-full shadow-[0_0_5px_rgba(224,242,254,0.85)] ${
                  (isGrand || isTop || isFinale) && i % 4 === 0
                    ? "bg-sky-100/95 shadow-[0_0_8px_rgba(186,230,253,0.9)]"
                    : "bg-white/90"
                }`}
                style={{
                  width: flake.size * (isTop ? 0.62 : 0.5),
                  height: flake.size * (isTop ? 0.62 : 0.5),
                  opacity: alpha,
                }}
              />
            ) : (
              <TinySnowflake
                size={flake.size}
                alpha={alpha}
                bold={isTop && flake.size >= 5.5}
              />
            )}
          </div>
        );
      })}
      <div
        className={`absolute inset-0 ${
          !isTop && !isFinale
            ? "bg-[radial-gradient(circle_at_45%_40%,rgba(224,242,254,0.1),transparent_60%)]"
            : ""
        }`}
        style={{
          opacity: opacity * (isTop || isFinale ? 0.6 : 0.55),
          ...(isFinale
            ? {
                background:
                  "radial-gradient(ellipse 100% 55% at 50% 18%, rgba(224,242,254,0.14), transparent 58%)",
              }
            : isTop
              ? {
                  background: `radial-gradient(ellipse 52% 38% at ${mistCenterX}% 18%, rgba(224,242,254,0.09), transparent 52%)`,
                }
              : undefined),
        }}
      />
    </div>
  );
}

type IceCrystalVideoOverlayProps = {
  video: HTMLVideoElement | null;
  triggers?: IceCrystalTrigger[];
};

export default function IceCrystalVideoOverlay({
  video,
  triggers = [],
}: IceCrystalVideoOverlayProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [, setFrame] = useState(0);
  const firedRef = useRef<Set<number>>(new Set());
  const nextIdRef = useRef(0);
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const triggerKey = triggers
    .map((t) => `${t.time}:${t.variant ?? "standard"}:${t.swirl ?? "c"}`)
    .join("|");

  useEffect(() => {
    firedRef.current.clear();
    setBursts([]);
  }, [triggerKey, video?.src]);

  useEffect(() => {
    if (!video || !triggers.length) return;

    const resetForLoop = () => {
      firedRef.current.clear();
      setBursts([]);
    };

    const syncClock = () => {
      const prev = clockRef.current?.media;
      const media = video.currentTime;
      if (isVideoLoopJump(prev, media)) {
        resetForLoop();
      }
      clockRef.current = { media, wall: performance.now() };
    };

    const mediaTime = () => {
      if (clockRef.current && isVideoLoopJump(clockRef.current.media, video.currentTime)) {
        resetForLoop();
        clockRef.current = { media: video.currentTime, wall: performance.now() };
      }
      return estimatedVideoPlaybackTime(video, clockRef.current);
    };

    const maybeFire = (t: number) => {
      if (t < 0.25) firedRef.current.clear();
      for (const trigger of triggers) {
        const mark = trigger.time;
        if (firedRef.current.has(mark)) continue;
        if (t >= mark && t - mark < 0.32) {
          firedRef.current.add(mark);
          const id = ++nextIdRef.current;
          setBursts((prev) => [
            ...prev,
            {
              id,
              wallStart: performance.now(),
              variant: trigger.variant ?? "standard",
              swirl: trigger.swirl,
            },
          ]);
        }
      }
    };

    let rafId = 0;
    let ticking = false;

    const tick = () => {
      syncClock();
      maybeFire(mediaTime());
      if (!video.paused && ticking) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const startTick = () => {
      if (ticking) return;
      ticking = true;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    const stopTick = () => {
      ticking = false;
      cancelAnimationFrame(rafId);
    };

    const onPlay = () => {
      syncClock();
      startTick();
    };
    const onPause = () => {
      stopTick();
      syncClock();
      maybeFire(video.currentTime);
    };
    const onLoopPoint = () => {
      syncClock();
      maybeFire(video.currentTime);
      if (!video.paused) startTick();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onLoopPoint);
    video.addEventListener("seeked", onLoopPoint);
    video.addEventListener("timeupdate", syncClock);
    if (!video.paused) startTick();

    return () => {
      stopTick();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onLoopPoint);
      video.removeEventListener("seeked", onLoopPoint);
      video.removeEventListener("timeupdate", syncClock);
    };
  }, [video, triggerKey, triggers]);

  useEffect(() => {
    if (!bursts.length) return;
    let rafId = 0;
    let lastPaint = 0;
    const animate = (now: number) => {
      if (now - lastPaint >= 33) {
        lastPaint = now;
        setBursts((prev) =>
          prev.filter((b) => now - b.wallStart < totalMs(b.variant)),
        );
        setFrame((n) => n + 1);
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [bursts.length]);

  if (!triggers.length || !bursts.length) return null;

  const now = performance.now();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden ice-snow-overlay"
      aria-hidden
    >
      {bursts.map((burst) => {
        const elapsed = now - burst.wallStart;
        const opacity = burstOpacity(elapsed, burst.variant);
        if (opacity === null) return null;

        return (
          <div key={burst.id} className="absolute inset-0">
            <SnowBreezeBurst
              burstId={burst.id}
              variant={burst.variant}
              swirl={burst.swirl}
              elapsedMs={elapsed}
              opacity={opacity}
            />
          </div>
        );
      })}
    </div>
  );
}
