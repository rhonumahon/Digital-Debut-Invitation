import { useEffect, useRef } from "react";
import { estimatedVideoPlaybackTime } from "../utils/videoPlaybackTime";

export type CrystalMoment = {
  start: number;
  end: number;
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

type CrystalTransformOverlayProps = {
  video: HTMLVideoElement | null;
  moments: CrystalMoment[];
};

export default function CrystalTransformOverlay({
  video,
  moments,
}: CrystalTransformOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const momentKey = moments.map((m) => `${m.start}-${m.end}`).join("|");

  useEffect(() => {
    if (!video || !moments.length) return;

    const clock = { media: 0, wall: 0 };
    const syncClock = () => {
      clock.media = video.currentTime;
      clock.wall = performance.now();
    };

    const maxIntensity = (time: number) =>
      moments.reduce(
        (peak, moment) =>
          Math.max(peak, crystalIntensity(time, moment.start, moment.end)),
        0,
      );

    const paint = (level: number) => {
      const root = overlayRef.current;
      if (!root) return;
      if (level <= 0.008) {
        root.style.opacity = "0";
        root.style.visibility = "hidden";
        return;
      }
      root.style.visibility = "visible";
      root.style.opacity = String(level * 0.92);
    };

    let rafId = 0;
    let running = false;

    const tick = () => {
      if (clock.media && video.currentTime + 0.35 < clock.media) {
        syncClock();
      }
      const time = estimatedVideoPlaybackTime(video, clock);
      paint(maxIntensity(time));
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
      paint(maxIntensity(video.currentTime));
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onPause);
    video.addEventListener("timeupdate", syncClock);
    syncClock();
    paint(maxIntensity(video.currentTime));
    if (!video.paused) onPlay();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onPause);
      video.removeEventListener("timeupdate", syncClock);
      paint(0);
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
      <div className="crystal-edge-glow absolute inset-0">
        <EdgeAura side="left" />
        <EdgeAura side="right" />
        {LIGHT_BEAMS.map((beam) => (
          <SoftLightBeam key={beam.id} beam={beam} />
        ))}
      </div>
    </div>
  );
}
