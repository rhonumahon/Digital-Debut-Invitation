import { useEffect, useRef } from "react";
import { estimatedVideoPlaybackTime } from "../utils/videoPlaybackTime";

export type CrystalMomentStyle = "side" | "finale";

export type CrystalMoment = {
  start: number;
  end: number;
  style?: CrystalMomentStyle;
  /** Center glitter on the dress (seconds, within the video). */
  dressShimmer?: { start: number; end: number };
};

function crystalIntensity(t: number, start: number, end: number): number {
  if (t < start || t > end) return 0;
  const rise = Math.min(1, (t - start) / 0.45);
  const fall = Math.min(1, (end - t) / 1.4);
  return Math.min(rise, fall);
}

type LightBeamSpec = {
  id: string;
  side: "left" | "right";
  top: number;
  angle: number;
  length: number;
  thickness: number;
  hue: "pink" | "violet" | "blue" | "blend";
};

const BEAM_COLORS: Record<LightBeamSpec["hue"], string> = {
  pink: "rgba(244,114,182,0.75)",
  violet: "rgba(196,181,253,0.72)",
  blue: "rgba(125,211,252,0.7)",
  blend: "rgba(216,180,254,0.68)",
};

const LIGHT_BEAMS: LightBeamSpec[] = [
  { id: "L-a", side: "left", top: 6, angle: -28, length: 42, thickness: 3.2, hue: "violet" },
  { id: "L-b", side: "left", top: 14, angle: -12, length: 36, thickness: 2.4, hue: "pink" },
  { id: "L-c", side: "left", top: 22, angle: 4, length: 38, thickness: 2.8, hue: "blue" },
  { id: "L-d", side: "left", top: 31, angle: -18, length: 44, thickness: 2.2, hue: "blend" },
  { id: "L-e", side: "left", top: 39, angle: 8, length: 32, thickness: 3.5, hue: "violet" },
  { id: "L-f", side: "left", top: 48, angle: -6, length: 40, thickness: 2.6, hue: "pink" },
  { id: "L-g", side: "left", top: 56, angle: 14, length: 35, thickness: 2, hue: "blue" },
  { id: "L-h", side: "left", top: 64, angle: -22, length: 46, thickness: 3, hue: "blend" },
  { id: "L-i", side: "left", top: 73, angle: 2, length: 34, thickness: 2.5, hue: "violet" },
  { id: "L-j", side: "left", top: 82, angle: -10, length: 39, thickness: 2.8, hue: "pink" },
  { id: "L-k", side: "left", top: 91, angle: 16, length: 33, thickness: 2.2, hue: "blue" },
  { id: "R-a", side: "right", top: 9, angle: 24, length: 41, thickness: 2.9, hue: "pink" },
  { id: "R-b", side: "right", top: 18, angle: 11, length: 37, thickness: 2.3, hue: "blue" },
  { id: "R-c", side: "right", top: 27, angle: -5, length: 43, thickness: 3.1, hue: "violet" },
  { id: "R-d", side: "right", top: 35, angle: 19, length: 31, thickness: 2.6, hue: "blend" },
  { id: "R-e", side: "right", top: 44, angle: -14, length: 39, thickness: 2.4, hue: "pink" },
  { id: "R-f", side: "right", top: 52, angle: 7, length: 36, thickness: 3.3, hue: "blue" },
  { id: "R-g", side: "right", top: 61, angle: 22, length: 42, thickness: 2.1, hue: "violet" },
  { id: "R-h", side: "right", top: 69, angle: -8, length: 34, thickness: 2.7, hue: "blend" },
  { id: "R-i", side: "right", top: 78, angle: 13, length: 38, thickness: 2.5, hue: "pink" },
  { id: "R-j", side: "right", top: 86, angle: -18, length: 40, thickness: 3, hue: "blue" },
];

type SoftBlockSpec = {
  id: string;
  edge: "top" | "bottom";
  left: number;
  width: number;
  height: number;
  rotate: number;
  gradient: string;
};

const FINALE_BLOCKS: SoftBlockSpec[] = [
  {
    id: "T1",
    edge: "top",
    left: 4,
    width: 28,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(135deg, rgba(244,114,182,0.72), rgba(196,181,253,0.55) 50%, rgba(125,211,252,0.45))",
  },
  {
    id: "T2",
    edge: "top",
    left: 32,
    width: 22,
    height: 11,
    rotate: 3,
    gradient:
      "linear-gradient(120deg, rgba(125,211,252,0.68), rgba(216,180,254,0.52))",
  },
  {
    id: "T3",
    edge: "top",
    left: 54,
    width: 26,
    height: 16,
    rotate: -2,
    gradient:
      "linear-gradient(145deg, rgba(196,181,253,0.7), rgba(244,114,182,0.48), rgba(186,230,253,0.42))",
  },
  {
    id: "T4",
    edge: "top",
    left: 76,
    width: 20,
    height: 12,
    rotate: 5,
    gradient:
      "linear-gradient(130deg, rgba(249,168,212,0.65), rgba(147,197,253,0.5))",
  },
  {
    id: "B1",
    edge: "bottom",
    left: 8,
    width: 24,
    height: 13,
    rotate: 3,
    gradient:
      "linear-gradient(215deg, rgba(125,211,252,0.7), rgba(196,181,253,0.55))",
  },
  {
    id: "B2",
    edge: "bottom",
    left: 28,
    width: 30,
    height: 15,
    rotate: -3,
    gradient:
      "linear-gradient(200deg, rgba(244,114,182,0.68), rgba(165,180,252,0.52), rgba(186,230,253,0.4))",
  },
  {
    id: "B3",
    edge: "bottom",
    left: 58,
    width: 21,
    height: 12,
    rotate: 2,
    gradient:
      "linear-gradient(225deg, rgba(216,180,254,0.66), rgba(125,211,252,0.48))",
  },
  {
    id: "B4",
    edge: "bottom",
    left: 72,
    width: 25,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(210deg, rgba(196,181,253,0.72), rgba(249,168,212,0.45))",
  },
];

function SoftLightBeam({ beam }: { beam: LightBeamSpec }) {
  const origin = beam.side === "left" ? "0% 50%" : "100% 50%";
  const direction = beam.side === "left" ? "90deg" : "270deg";
  const color = BEAM_COLORS[beam.hue];

  return (
    <div
      className="absolute"
      style={{
        top: `${beam.top}%`,
        left: beam.side === "left" ? 0 : undefined,
        right: beam.side === "right" ? 0 : undefined,
        width: `${beam.length}%`,
        height: `${beam.thickness}px`,
        transform: `rotate(${beam.angle}deg)`,
        transformOrigin: origin,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          background: `linear-gradient(${direction}, ${color}, rgba(255,255,255,0.35) 35%, transparent 100%)`,
          filter: "blur(7px)",
          boxShadow: `0 0 18px ${color}, 0 0 32px rgba(186,230,253,0.25)`,
        }}
      />
    </div>
  );
}

function EdgeAura({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="absolute inset-y-0 w-[20%]"
      style={{
        left: side === "left" ? 0 : undefined,
        right: side === "right" ? 0 : undefined,
        background:
          side === "left"
            ? "linear-gradient(90deg, rgba(196,181,253,0.28), rgba(244,114,182,0.12) 45%, transparent)"
            : "linear-gradient(270deg, rgba(125,211,252,0.26), rgba(196,181,253,0.12) 45%, transparent)",
        filter: "blur(10px)",
        maskImage:
          "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
      }}
    />
  );
}

function SoftIceBlock({ block }: { block: SoftBlockSpec }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${block.left}%`,
        width: `${block.width}%`,
        height: `${block.height}%`,
        top: block.edge === "top" ? "1%" : undefined,
        bottom: block.edge === "bottom" ? "1%" : undefined,
        transform: `rotate(${block.rotate}deg)`,
        borderRadius: "28px",
        background: block.gradient,
        filter: "blur(14px)",
        boxShadow:
          "0 0 28px rgba(196,181,253,0.45), 0 0 42px rgba(125,211,252,0.28)",
      }}
    />
  );
}

type DressGlitterSpec = {
  id: string;
  x: number;
  y: number;
  size: number;
  delay: number;
};

function dressGlitterSeed(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Center dress silhouette — ellipse around mid-frame body. */
const DRESS_GLITTERS: DressGlitterSpec[] = Array.from({ length: 16 }, (_, i) => {
  const r1 = dressGlitterSeed(i * 3.1);
  const r2 = dressGlitterSeed(i * 5.7 + 2);
  const r3 = dressGlitterSeed(i * 7.3 + 4);
  const angle = r1 * Math.PI * 2;
  const radius = 0.35 + r2 * 0.65;
  const cx = 50;
  const cy = 58;
  const rx = 20;
  const ry = 24;
  return {
    id: `g-${i}`,
    x: cx + Math.cos(angle) * rx * radius + (r3 - 0.5) * 4,
    y: cy + Math.sin(angle) * ry * radius + (dressGlitterSeed(i + 9) - 0.5) * 5,
    size: 1.4 + r3 * 2.2,
    delay: r2 * 2.8,
  };
});

function DressShimmerLayer() {
  return (
    <div className="dress-shimmer-layer pointer-events-none absolute inset-0">
      {DRESS_GLITTERS.map((g) => (
        <span
          key={g.id}
          className="dress-shimmer-spark absolute block rounded-full"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: g.size,
            height: g.size,
            animationDelay: `${g.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function dressShimmerIntensity(
  t: number,
  moments: CrystalMoment[],
): number {
  return moments.reduce((peak, moment) => {
    const span = moment.dressShimmer;
    if (!span) return peak;
    return Math.max(peak, crystalIntensity(t, span.start, span.end));
  }, 0);
}

function SideBeamLayer() {
  return (
    <div className="crystal-edge-glow absolute inset-0">
      <EdgeAura side="left" />
      <EdgeAura side="right" />
      {LIGHT_BEAMS.map((beam) => (
        <SoftLightBeam key={beam.id} beam={beam} />
      ))}
    </div>
  );
}

function FinaleBeamLayer() {
  return (
    <div className="crystal-edge-glow absolute inset-0">
      <div
        className="absolute inset-x-0 top-0 h-[26%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(196,181,253,0.38), rgba(125,211,252,0.22) 55%, transparent)",
          filter: "blur(16px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[26%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(244,114,182,0.32), rgba(165,180,252,0.24) 50%, transparent)",
          filter: "blur(16px)",
        }}
      />
      {FINALE_BLOCKS.map((block) => (
        <SoftIceBlock key={block.id} block={block} />
      ))}
      <EdgeAura side="left" />
      <EdgeAura side="right" />
      {LIGHT_BEAMS.map((beam) => (
        <SoftLightBeam key={`f-${beam.id}`} beam={beam} />
      ))}
    </div>
  );
}

type CrystalTransformOverlayProps = {
  video: HTMLVideoElement | null;
  moments: CrystalMoment[];
};

export default function CrystalTransformOverlay({
  video,
  moments,
}: CrystalTransformOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sideLayerRef = useRef<HTMLDivElement>(null);
  const finaleLayerRef = useRef<HTMLDivElement>(null);
  const dressLayerRef = useRef<HTMLDivElement>(null);
  const momentKey = moments
    .map(
      (m) =>
        `${m.start}-${m.end}-${m.style ?? "side"}-${m.dressShimmer?.start ?? ""}-${m.dressShimmer?.end ?? ""}`,
    )
    .join("|");

  useEffect(() => {
    if (!video || !moments.length) return;

    const clock = { media: 0, wall: 0 };
    const syncClock = () => {
      clock.media = video.currentTime;
      clock.wall = performance.now();
    };

    const intensityForStyle = (time: number, style: CrystalMomentStyle) =>
      moments
        .filter((moment) => (moment.style ?? "side") === style)
        .reduce(
          (peak, moment) =>
            Math.max(peak, crystalIntensity(time, moment.start, moment.end)),
          0,
        );

    const paint = (time: number) => {
      const root = overlayRef.current;
      const sideLayer = sideLayerRef.current;
      const finaleLayer = finaleLayerRef.current;
      const dressLayer = dressLayerRef.current;
      if (!root || !sideLayer || !finaleLayer || !dressLayer) return;

      const side = intensityForStyle(time, "side");
      const finale = intensityForStyle(time, "finale");
      const dress = dressShimmerIntensity(time, moments);
      const active = side > 0.008 || finale > 0.008 || dress > 0.008;

      if (!active) {
        root.style.visibility = "hidden";
        sideLayer.style.opacity = "0";
        finaleLayer.style.opacity = "0";
        dressLayer.style.opacity = "0";
        return;
      }

      root.style.visibility = "visible";
      root.style.opacity = "1";
      sideLayer.style.opacity = String(side * 0.92);
      finaleLayer.style.opacity = String(finale * 0.96);
      dressLayer.style.opacity = String(Math.min(1, dress * 1.05));
    };

    let rafId = 0;
    let running = false;

    const tick = () => {
      if (clock.media && video.currentTime + 0.35 < clock.media) {
        syncClock();
      }
      const time = estimatedVideoPlaybackTime(video, clock);
      paint(time);
      if (!video.paused && running) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onPlay = () => {
      syncClock();
      running = true;
      rafId = requestAnimationFrame(tick);
    };

    const onPause = () => {
      running = false;
      cancelAnimationFrame(rafId);
      syncClock();
      paint(video.currentTime);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onPause);
    video.addEventListener("timeupdate", syncClock);
    syncClock();
    paint(video.currentTime);
    if (!video.paused) onPlay();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onPause);
      video.removeEventListener("timeupdate", syncClock);
      paint(-1);
    };
  }, [video, momentKey, moments]);

  if (!video || !moments.length) return null;

  return (
    <div
      ref={overlayRef}
      className="crystal-edge-overlay pointer-events-none absolute inset-0 z-[15] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <div ref={sideLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <SideBeamLayer />
      </div>
      <div ref={finaleLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <FinaleBeamLayer />
      </div>
      <div ref={dressLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <DressShimmerLayer />
      </div>
    </div>
  );
}
