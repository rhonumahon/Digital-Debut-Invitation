import { useEffect, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
import { ICE_SHARD_BAND_MASK } from "../utils/iceShardFrame";

export type VideoEdgeBeamWindow = {
  start: number;
  end: number;
  /** After this clip time (seconds), crossfade to low-light blue until `end`. */
  dimFrom?: number;
};

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function windowOpacity(t: number, start: number, end: number): number {
  if (t < start || t > end) return 0;
  const fadeIn = Math.min(1, (t - start) / 0.55);
  const fadeOut = Math.min(1, (end - t) / 0.65);
  return Math.min(fadeIn, fadeOut);
}

type LightBeamSpec = {
  id: string;
  side: "left" | "right";
  top: number;
  angle: number;
  length: number;
  thickness: number;
  hue: "violet" | "blue";
};

const BEAM_COLORS: Record<LightBeamSpec["hue"], string> = {
  violet: "rgba(91,33,182,0.62)",
  blue: "rgba(21,62,180,0.92)",
};

const BEAM_GLOW = "rgba(29,78,216,0.55)";

/** Same layout as finale side beams, blue and violet only. */
const EDGE_LIGHT_BEAMS: LightBeamSpec[] = [
  { id: "L-a", side: "left", top: 6, angle: -28, length: 42, thickness: 3.2, hue: "blue" },
  { id: "L-b", side: "left", top: 14, angle: -12, length: 36, thickness: 2.4, hue: "blue" },
  { id: "L-c", side: "left", top: 22, angle: 4, length: 38, thickness: 2.8, hue: "blue" },
  { id: "L-d", side: "left", top: 31, angle: -18, length: 44, thickness: 2.2, hue: "blue" },
  { id: "L-e", side: "left", top: 39, angle: 8, length: 32, thickness: 3.5, hue: "blue" },
  { id: "L-f", side: "left", top: 48, angle: -6, length: 40, thickness: 2.6, hue: "blue" },
  { id: "L-g", side: "left", top: 56, angle: 14, length: 35, thickness: 2, hue: "blue" },
  { id: "L-h", side: "left", top: 64, angle: -22, length: 46, thickness: 3, hue: "blue" },
  { id: "L-i", side: "left", top: 73, angle: 2, length: 34, thickness: 2.5, hue: "violet" },
  { id: "L-j", side: "left", top: 82, angle: -10, length: 39, thickness: 2.8, hue: "blue" },
  { id: "L-k", side: "left", top: 91, angle: 16, length: 33, thickness: 2.2, hue: "blue" },
  { id: "R-a", side: "right", top: 9, angle: 24, length: 41, thickness: 2.9, hue: "blue" },
  { id: "R-b", side: "right", top: 18, angle: 11, length: 37, thickness: 2.3, hue: "blue" },
  { id: "R-c", side: "right", top: 27, angle: -5, length: 43, thickness: 3.1, hue: "blue" },
  { id: "R-d", side: "right", top: 35, angle: 19, length: 31, thickness: 2.6, hue: "violet" },
  { id: "R-e", side: "right", top: 44, angle: -14, length: 39, thickness: 2.4, hue: "blue" },
  { id: "R-f", side: "right", top: 52, angle: 7, length: 36, thickness: 3.3, hue: "blue" },
  { id: "R-g", side: "right", top: 61, angle: 22, length: 42, thickness: 2.1, hue: "blue" },
  { id: "R-h", side: "right", top: 69, angle: -8, length: 34, thickness: 2.7, hue: "blue" },
  { id: "R-i", side: "right", top: 78, angle: 13, length: 38, thickness: 2.5, hue: "blue" },
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

const EDGE_SOFT_BLOCKS: SoftBlockSpec[] = [
  {
    id: "T1",
    edge: "top",
    left: 4,
    width: 28,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(135deg, rgba(21,62,180,0.88), rgba(29,78,216,0.72) 55%, rgba(91,33,182,0.38))",
  },
  {
    id: "T2",
    edge: "top",
    left: 32,
    width: 22,
    height: 11,
    rotate: 3,
    gradient:
      "linear-gradient(120deg, rgba(30,64,175,0.85), rgba(37,99,235,0.62), rgba(109,40,217,0.32))",
  },
  {
    id: "T3",
    edge: "top",
    left: 54,
    width: 26,
    height: 16,
    rotate: -2,
    gradient:
      "linear-gradient(145deg, rgba(29,78,216,0.82), rgba(21,62,180,0.68), rgba(91,33,182,0.35))",
  },
  {
    id: "T4",
    edge: "top",
    left: 76,
    width: 20,
    height: 12,
    rotate: 5,
    gradient:
      "linear-gradient(130deg, rgba(21,62,180,0.84), rgba(37,99,235,0.58), rgba(124,58,237,0.28))",
  },
  {
    id: "B1",
    edge: "bottom",
    left: 8,
    width: 24,
    height: 13,
    rotate: 3,
    gradient:
      "linear-gradient(215deg, rgba(21,62,180,0.86), rgba(29,78,216,0.7), rgba(109,40,217,0.34))",
  },
  {
    id: "B2",
    edge: "bottom",
    left: 28,
    width: 30,
    height: 15,
    rotate: -3,
    gradient:
      "linear-gradient(200deg, rgba(30,64,175,0.82), rgba(37,99,235,0.64), rgba(91,33,182,0.3))",
  },
  {
    id: "B3",
    edge: "bottom",
    left: 58,
    width: 21,
    height: 12,
    rotate: 2,
    gradient:
      "linear-gradient(225deg, rgba(29,78,216,0.8), rgba(21,62,180,0.65), rgba(124,58,237,0.28))",
  },
  {
    id: "B4",
    edge: "bottom",
    left: 72,
    width: 25,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(210deg, rgba(21,62,180,0.88), rgba(30,64,175,0.62), rgba(109,40,217,0.32))",
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
          background: `linear-gradient(${direction}, ${color}, rgba(147,197,253,0.28) 32%, transparent 100%)`,
          filter: "blur(7px)",
          boxShadow: `0 0 20px ${color}, 0 0 36px ${BEAM_GLOW}`,
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
            ? "linear-gradient(90deg, rgba(21,62,180,0.52), rgba(29,78,216,0.32) 50%, rgba(91,33,182,0.14) 68%, transparent)"
            : "linear-gradient(270deg, rgba(21,62,180,0.5), rgba(37,99,235,0.3) 50%, rgba(109,40,217,0.12) 68%, transparent)",
        filter: "blur(10px)",
        maskImage:
          "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
      }}
    />
  );
}

type CornerSpec = {
  id: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  gradient: string;
};

const CORNER_FILLS: CornerSpec[] = [
  {
    id: "TL",
    top: 0,
    left: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 0% 0%, rgba(21,62,180,0.9) 0%, rgba(29,78,216,0.68) 40%, rgba(91,33,182,0.28) 58%, transparent 74%)",
  },
  {
    id: "TR",
    top: 0,
    right: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 100% 0%, rgba(21,62,180,0.88) 0%, rgba(37,99,235,0.65) 40%, rgba(109,40,217,0.26) 58%, transparent 74%)",
  },
  {
    id: "BL",
    bottom: 0,
    left: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 0% 100%, rgba(21,62,180,0.88) 0%, rgba(29,78,216,0.66) 40%, rgba(91,33,182,0.26) 58%, transparent 74%)",
  },
  {
    id: "BR",
    bottom: 0,
    right: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 100% 100%, rgba(30,64,175,0.9) 0%, rgba(29,78,216,0.64) 40%, rgba(124,58,237,0.24) 58%, transparent 74%)",
  },
];

function CornerBeamFill({ corner }: { corner: CornerSpec }) {
  return (
    <div
      className="absolute"
      style={{
        top: corner.top,
        bottom: corner.bottom,
        left: corner.left,
        right: corner.right,
        width: "38%",
        height: "24%",
        background: corner.gradient,
        filter: "blur(10px)",
        boxShadow: "0 0 40px rgba(21,62,180,0.48), 0 0 24px rgba(29,78,216,0.32)",
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
          "0 0 34px rgba(21,62,180,0.58), 0 0 48px rgba(29,78,216,0.42)",
      }}
    />
  );
}

function LowLightBlueEdgeBeamLayer() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-x-0 top-0 h-[24%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(186,230,253,0.22), rgba(147,197,253,0.12) 60%, transparent)",
          filter: "blur(18px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[24%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(186,230,253,0.2), rgba(125,211,252,0.1) 55%, transparent)",
          filter: "blur(18px)",
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-[18%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(147,197,253,0.16), rgba(186,230,253,0.08) 50%, transparent)",
          filter: "blur(12px)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[18%]"
        style={{
          background:
            "linear-gradient(270deg, rgba(147,197,253,0.16), rgba(186,230,253,0.08) 50%, transparent)",
          filter: "blur(12px)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        }}
      />
      <div
        className="absolute left-0 top-0 h-[22%] w-[34%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 0% 0%, rgba(186,230,253,0.2), transparent 72%)",
          filter: "blur(10px)",
        }}
      />
      <div
        className="absolute right-0 top-0 h-[22%] w-[34%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 100% 0%, rgba(186,230,253,0.2), transparent 72%)",
          filter: "blur(10px)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 h-[22%] w-[34%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 0% 100%, rgba(186,230,253,0.18), transparent 72%)",
          filter: "blur(10px)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-[22%] w-[34%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 100% 100%, rgba(186,230,253,0.18), transparent 72%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}

function BlueVioletEdgeBeamLayer() {
  return (
    <div className="crystal-edge-glow absolute inset-0">
      <div
        className="absolute inset-x-0 top-0 h-[26%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(21,62,180,0.55), rgba(29,78,216,0.4) 55%, rgba(91,33,182,0.18) 72%, transparent)",
          filter: "blur(16px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[26%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(21,62,180,0.52), rgba(29,78,216,0.38) 50%, rgba(109,40,217,0.16) 68%, transparent)",
          filter: "blur(16px)",
        }}
      />
      {EDGE_SOFT_BLOCKS.map((block) => (
        <SoftIceBlock key={block.id} block={block} />
      ))}
      {CORNER_FILLS.map((corner) => (
        <CornerBeamFill key={corner.id} corner={corner} />
      ))}
      <EdgeAura side="left" />
      <EdgeAura side="right" />
      {EDGE_LIGHT_BEAMS.map((beam) => (
        <SoftLightBeam key={beam.id} beam={beam} />
      ))}
    </div>
  );
}

type VideoEdgeBeamsOverlayProps = {
  video: HTMLVideoElement | null;
  window: VideoEdgeBeamWindow;
};

export default function VideoEdgeBeamsOverlay({
  video,
  window: timeWindow,
}: VideoEdgeBeamsOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fullLayerRef = useRef<HTMLDivElement>(null);
  const lowLayerRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const dimFrom = timeWindow.dimFrom ?? timeWindow.end;
  const windowKey = `${timeWindow.start}-${timeWindow.end}-${dimFrom}`;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !video) return;

    const syncClock = () => {
      const prev = clockRef.current?.media;
      const media = video.currentTime;
      if (isVideoLoopJump(prev, media)) {
        clockRef.current = { media, wall: performance.now() };
        return;
      }
      clockRef.current = { media, wall: performance.now() };
    };

    const mediaTime = () => {
      if (
        clockRef.current &&
        isVideoLoopJump(clockRef.current.media, video.currentTime)
      ) {
        clockRef.current = { media: video.currentTime, wall: performance.now() };
      }
      return estimatedVideoPlaybackTime(video, clockRef.current);
    };

    const paint = (t: number) => {
      const fullLayer = fullLayerRef.current;
      const lowLayer = lowLayerRef.current;
      const glass = glassRef.current;
      const alpha = windowOpacity(t, timeWindow.start, timeWindow.end);
      if (alpha <= 0.004) {
        root.style.visibility = "hidden";
        root.style.opacity = "0";
        if (fullLayer) fullLayer.style.opacity = "0";
        if (lowLayer) lowLayer.style.opacity = "0";
        if (glass) glass.style.opacity = "0";
        return;
      }

      let lowMix = 0;
      if (t > dimFrom && timeWindow.end > dimFrom) {
        lowMix = smoothstep01((t - dimFrom) / (timeWindow.end - dimFrom));
      }

      root.style.visibility = "visible";
      root.style.opacity = "1";
      if (fullLayer) {
        fullLayer.style.opacity = String(alpha * (1 - lowMix));
      }
      if (lowLayer) {
        const lowStrength = 0.32 + 0.68 * lowMix;
        lowLayer.style.opacity = String(alpha * lowStrength);
      }
      if (glass) {
        glass.style.opacity = String(0.35 * alpha * (1 - lowMix * 0.75));
      }
    };

    let rafId = 0;
    let running = false;

    const tick = () => {
      syncClock();
      paint(mediaTime());
      if (running && !video.paused) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onPlay = () => {
      syncClock();
      running = true;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    const onPause = () => {
      running = false;
      cancelAnimationFrame(rafId);
      syncClock();
      paint(video.currentTime);
    };

    const onLoopPoint = () => {
      syncClock();
      paint(video.currentTime);
      if (!video.paused && !running) onPlay();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onLoopPoint);
    video.addEventListener("seeked", onLoopPoint);
    video.addEventListener("timeupdate", syncClock);
    syncClock();
    paint(video.currentTime);
    if (!video.paused) onPlay();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onLoopPoint);
      video.removeEventListener("seeked", onLoopPoint);
      video.removeEventListener("timeupdate", syncClock);
    };
  }, [video, dimFrom, windowKey, timeWindow.end, timeWindow.start]);

  if (!video) return null;

  const bandMask = {
    WebkitMaskImage: ICE_SHARD_BAND_MASK,
    maskImage: ICE_SHARD_BAND_MASK,
  };

  return (
    <div
      ref={rootRef}
      className="video-edge-beams pointer-events-none absolute inset-0 z-[14] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden", ...bandMask }}
    >
      <div ref={fullLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <BlueVioletEdgeBeamLayer />
      </div>
      <div ref={lowLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <LowLightBlueEdgeBeamLayer />
      </div>
      <div
        ref={glassRef}
        className="video-edge-beam-glass-reflect absolute inset-0 opacity-35"
      />
    </div>
  );
}
