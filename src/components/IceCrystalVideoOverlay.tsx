import { useEffect, useRef, useState } from "react";
import { estimatedVideoPlaybackTime } from "../utils/videoPlaybackTime";

export type IceCrystalVariant = "standard" | "grand" | "quick";

export type IceCrystalTrigger = {
  time: number;
  variant?: IceCrystalVariant;
};

type Burst = { id: number; wallStart: number; variant: IceCrystalVariant };

type IceTiming = { pop: number; hold: number; fade: number };

const TIMING: Record<IceCrystalVariant, IceTiming> = {
  standard: { pop: 120, hold: 1000, fade: 2000 },
  grand: { pop: 100, hold: 1100, fade: 2100 },
  quick: { pop: 80, hold: 450, fade: 1100 },
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
  { x: 38, y: 52 },
  { x: 62, y: 44 },
  { x: 50, y: 68 },
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function flakesForBurst(burstId: number, variant: IceCrystalVariant): FlakeSeed[] {
  const count =
    variant === "grand" ? 42 : variant === "quick" ? 16 : 28;
  const vortexCount = variant === "grand" ? 3 : 2;
  const flakes: FlakeSeed[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = pseudoRandom(burstId * 17 + i * 3.1);
    const r2 = pseudoRandom(burstId * 31 + i * 5.7);
    const r3 = pseudoRandom(burstId * 47 + i * 2.3);
    const r4 = pseudoRandom(burstId * 61 + i * 4.1);
    const r5 = pseudoRandom(burstId * 73 + i * 6.3);
    const vortex = VORTICES[i % vortexCount];
    const spin =
      variant === "quick"
        ? (i % 2 === 0 ? 1 : -1) * (1.6 + r2 * 1.2)
        : (i % 2 === 0 ? 1 : -1) * (1.1 + r2 * 1.4);
    flakes.push({
      phase: r1 * Math.PI * 2,
      orbitRadius: 8 + r3 * (variant === "grand" ? 22 : 16),
      orbitSpeed: spin,
      vortexX: vortex.x + (r4 - 0.5) * 10,
      vortexY: vortex.y + (r5 - 0.5) * 10,
      windFactor: 0.55 + r3 * 0.65,
      size: 2.5 + r3 * (variant === "quick" ? 3.5 : 4.5),
      rot: r4 * 360,
      dot: r4 > 0.62,
      depth: 0.25 + r5 * 0.75,
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
  const windStrength = variant === "quick" ? 9 : variant === "grand" ? 11 : 10;

  const windX = t * windStrength;
  const windY = -t * 2.2 + Math.sin(t * 1.3 + flake.phase) * 1.2;

  const cx = flake.vortexX + Math.sin(t * 0.85 + flake.phase) * 5.5;
  const cy = flake.vortexY + Math.cos(t * 1.05 + flake.phase * 0.8) * 4.5;

  const radius = flake.orbitRadius * (0.4 + life * 0.85);
  const angle = flake.phase + t * flake.orbitSpeed;
  const orbitX = Math.cos(angle) * radius;
  const orbitY = Math.sin(angle) * radius * 0.62;

  const sway = Math.sin(t * 2.2 + flake.phase) * 3.5;
  const lift = Math.cos(t * 1.6 + flake.phase * 1.2) * 2.2;

  const x = cx + orbitX + windX * flake.windFactor * 0.22 + sway;
  const y = cy + orbitY + windY * flake.windFactor * 0.25 + lift;
  const rot = flake.rot + t * 48 + angle * 28;

  return { x, y, rot };
}

function TinySnowflake({ size, alpha }: { size: number; alpha: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      style={{ opacity: alpha }}
    >
      <g
        fill="none"
        stroke="rgba(248,250,252,0.95)"
        strokeWidth="0.55"
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
}: {
  opacity: number;
  elapsedMs: number;
  grand: boolean;
}) {
  const t = elapsedMs / 1000;
  const spin = t * 22;
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          opacity: opacity * 0.35,
          transform: `translate(-50%, -50%) rotate(${spin}deg)`,
          background:
            "conic-gradient(from 0deg, transparent, rgba(224,242,254,0.14), transparent, rgba(186,230,253,0.1), transparent)",
        }}
      />
      {grand ? (
        <div
          className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
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
  elapsedMs,
  opacity,
}: {
  burstId: number;
  variant: IceCrystalVariant;
  elapsedMs: number;
  opacity: number;
}) {
  const flakes = flakesForBurst(burstId, variant);
  const isGrand = variant === "grand";
  const fadeIn = Math.min(1, elapsedMs / 180);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SwirlMist opacity={opacity} elapsedMs={elapsedMs} grand={isGrand} />
      {flakes.map((flake, i) => {
        const { x, y, rot } = swirlMotion(flake, elapsedMs, variant);
        const alpha =
          opacity * fadeIn * (0.25 + flake.depth * 0.55) * (0.85 + (i % 3) * 0.05);
        const blur = flake.depth < 0.45 ? 0.6 : 0;
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
                  isGrand && i % 5 === 0 ? "bg-sky-100/90" : "bg-white/90"
                }`}
                style={{
                  width: flake.size * 0.5,
                  height: flake.size * 0.5,
                  opacity: alpha,
                }}
              />
            ) : (
              <TinySnowflake size={flake.size} alpha={alpha} />
            )}
          </div>
        );
      })}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_45%_40%,rgba(224,242,254,0.1),transparent_60%)]"
        style={{ opacity: opacity * 0.55 }}
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
  const triggerKey = triggers.map((t) => `${t.time}:${t.variant ?? "standard"}`).join("|");

  useEffect(() => {
    firedRef.current.clear();
    setBursts([]);
  }, [triggerKey, video?.src]);

  useEffect(() => {
    if (!video || !triggers.length) return;

    const syncClock = () => {
      clockRef.current = { media: video.currentTime, wall: performance.now() };
    };

    const mediaTime = () => {
      if (clockRef.current && video.currentTime + 0.35 < clockRef.current.media) {
        clockRef.current = { media: video.currentTime, wall: performance.now() };
      }
      return estimatedVideoPlaybackTime(video, clockRef.current);
    };

    const maybeFire = (t: number) => {
      if (t < 0.25) firedRef.current.clear();
      for (const trigger of triggers) {
        const mark = trigger.time;
        if (firedRef.current.has(mark)) continue;
        if (t >= mark && t - mark < 0.2) {
          firedRef.current.add(mark);
          const id = ++nextIdRef.current;
          setBursts((prev) => [
            ...prev,
            {
              id,
              wallStart: performance.now(),
              variant: trigger.variant ?? "standard",
            },
          ]);
        }
      }
    };

    let rafId = 0;
    const tick = () => {
      syncClock();
      maybeFire(mediaTime());
      if (!video.paused && !video.ended) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onPlay = () => {
      syncClock();
      rafId = requestAnimationFrame(tick);
    };
    const onPause = () => {
      cancelAnimationFrame(rafId);
      syncClock();
      maybeFire(video.currentTime);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", syncClock);
    video.addEventListener("timeupdate", syncClock);
    if (!video.paused) onPlay();

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", syncClock);
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
              elapsedMs={elapsed}
              opacity={opacity}
            />
          </div>
        );
      })}
    </div>
  );
}
