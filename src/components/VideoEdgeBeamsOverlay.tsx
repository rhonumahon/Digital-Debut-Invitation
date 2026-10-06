import { useEffect, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
import { ICE_SHARD_BAND_MASK } from "../utils/iceShardFrame";
import {
  airyVioletMix,
  smoothstep01,
  type VideoEdgeBeamWindow,
} from "../utils/videoEdgeBeamGlow";

export type { VideoEdgeBeamWindow };

function pinkGlowMix(t: number, window: VideoEdgeBeamWindow): number {
  const from = window.pinkGlowFrom;
  if (from == null) return 0;
  const until =
    window.pinkGlowUntil ?? window.airyVioletUntil ?? window.end;
  if (t < from || t > until) return 0;

  const fadeIn = 3.5;
  const fadeOut = 1.35;
  let mix = 1;
  if (t < from + fadeIn) {
    mix = smoothstep01((t - from) / fadeIn);
  }
  if (until - from > fadeIn + fadeOut && t > until - fadeOut) {
    mix *= smoothstep01((until - t) / fadeOut);
  }
  return mix;
}

function windowOpacity(t: number, window: VideoEdgeBeamWindow): number {
  const { start, end } = window;
  if (t < start || t > end) return 0;

  const fadeIn = window.fadeInDuration ?? 1.2;
  const fadeOut = window.fadeOutDuration ?? 0.65;
  let alpha = 1;

  if (fadeIn > 0 && t < start + fadeIn) {
    alpha *= smoothstep01((t - start) / fadeIn);
  }
  if (fadeOut > 0 && t > end - fadeOut) {
    alpha *= smoothstep01((end - t) / fadeOut);
  }

  return alpha;
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

/** Same beam strength as navy edge — lighter sky-blue hue, not lower opacity. */
const SKY_BEAM_COLORS: Record<LightBeamSpec["hue"], string> = {
  violet: "rgba(124,58,237,0.78)",
  blue: "rgba(14,165,233,0.9)",
};

const SKY_BEAM_GLOW = "rgba(56,189,248,0.58)";

const EXTRA_VIOLET_ACCENT_BEAMS: LightBeamSpec[] = [
  { id: "V-L1", side: "left", top: 18, angle: -8, length: 34, thickness: 2.6, hue: "violet" },
  { id: "V-L2", side: "left", top: 42, angle: 12, length: 38, thickness: 2.2, hue: "violet" },
  { id: "V-L3", side: "left", top: 58, angle: -16, length: 36, thickness: 2.8, hue: "violet" },
  { id: "V-R1", side: "right", top: 24, angle: 10, length: 35, thickness: 2.4, hue: "violet" },
  { id: "V-R2", side: "right", top: 46, angle: -11, length: 40, thickness: 2.5, hue: "violet" },
  { id: "V-R3", side: "right", top: 62, angle: 18, length: 33, thickness: 2.3, hue: "violet" },
];

function SoftLightBeam({
  beam,
  palette = "saturated",
}: {
  beam: LightBeamSpec;
  palette?: "saturated" | "sky";
}) {
  const origin = beam.side === "left" ? "0% 50%" : "100% 50%";
  const direction = beam.side === "left" ? "90deg" : "270deg";
  const color =
    palette === "sky" ? SKY_BEAM_COLORS[beam.hue] : BEAM_COLORS[beam.hue];
  const glow = palette === "sky" ? SKY_BEAM_GLOW : BEAM_GLOW;

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
          background: `linear-gradient(${direction}, ${color}, rgba(186,230,253,${palette === "sky" ? "0.38" : "0.22"}) 32%, transparent 100%)`,
          filter: "blur(7px)",
          boxShadow: `0 0 20px ${color}, 0 0 36px ${glow}`,
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

function CornerBeamFill({
  corner,
  tone = "navy",
}: {
  corner: CornerSpec;
  tone?: "navy" | "sky";
}) {
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
        boxShadow:
          tone === "sky"
            ? "0 0 40px rgba(56,189,248,0.46), 0 0 24px rgba(14,165,233,0.32)"
            : "0 0 40px rgba(21,62,180,0.48), 0 0 24px rgba(29,78,216,0.32)",
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
        className="absolute inset-x-0 top-0 h-[46%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(186,230,253,0.2), rgba(125,211,252,0.1) 55%, transparent)",
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

const SKY_EDGE_SOFT_BLOCKS: SoftBlockSpec[] = [
  {
    id: "T1",
    edge: "top",
    left: 4,
    width: 28,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(135deg, rgba(14,165,233,0.86), rgba(56,189,248,0.72) 55%, rgba(124,58,237,0.42)",
  },
  {
    id: "T2",
    edge: "top",
    left: 32,
    width: 22,
    height: 11,
    rotate: 3,
    gradient:
      "linear-gradient(120deg, rgba(2,132,199,0.84), rgba(56,189,248,0.66), rgba(139,92,246,0.36)",
  },
  {
    id: "T3",
    edge: "top",
    left: 54,
    width: 26,
    height: 16,
    rotate: -2,
    gradient:
      "linear-gradient(145deg, rgba(56,189,248,0.82), rgba(14,165,233,0.68), rgba(124,58,237,0.38)",
  },
  {
    id: "T4",
    edge: "top",
    left: 76,
    width: 20,
    height: 12,
    rotate: 5,
    gradient:
      "linear-gradient(130deg, rgba(14,165,233,0.84), rgba(125,211,252,0.62), rgba(167,139,250,0.32))",
  },
  {
    id: "B1",
    edge: "bottom",
    left: 8,
    width: 24,
    height: 13,
    rotate: 3,
    gradient:
      "linear-gradient(215deg, rgba(14,165,233,0.85), rgba(56,189,248,0.7), rgba(139,92,246,0.36)",
  },
  {
    id: "B2",
    edge: "bottom",
    left: 28,
    width: 30,
    height: 15,
    rotate: -3,
    gradient:
      "linear-gradient(200deg, rgba(2,132,199,0.82), rgba(56,189,248,0.66), rgba(124,58,237,0.34)",
  },
  {
    id: "B3",
    edge: "bottom",
    left: 58,
    width: 21,
    height: 12,
    rotate: 2,
    gradient:
      "linear-gradient(225deg, rgba(56,189,248,0.8), rgba(14,165,233,0.66), rgba(167,139,250,0.3))",
  },
  {
    id: "B4",
    edge: "bottom",
    left: 72,
    width: 25,
    height: 14,
    rotate: -4,
    gradient:
      "linear-gradient(210deg, rgba(14,165,233,0.86), rgba(2,132,199,0.64), rgba(139,92,246,0.34))",
  },
];

const SKY_CORNER_FILLS: CornerSpec[] = [
  {
    id: "TL",
    top: 0,
    left: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 0% 0%, rgba(14,165,233,0.88) 0%, rgba(56,189,248,0.68) 40%, rgba(124,58,237,0.32) 58%, transparent 74%)",
  },
  {
    id: "TR",
    top: 0,
    right: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 100% 0%, rgba(14,165,233,0.86) 0%, rgba(125,211,252,0.64) 40%, rgba(139,92,246,0.3) 58%, transparent 74%)",
  },
  {
    id: "BL",
    bottom: 0,
    left: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 0% 100%, rgba(14,165,233,0.86) 0%, rgba(56,189,248,0.66) 40%, rgba(124,58,237,0.3) 58%, transparent 74%)",
  },
  {
    id: "BR",
    bottom: 0,
    right: 0,
    gradient:
      "radial-gradient(ellipse 115% 120% at 100% 100%, rgba(2,132,199,0.88) 0%, rgba(56,189,248,0.64) 40%, rgba(167,139,250,0.28) 58%, transparent 74%)",
  },
];

function SkyEdgeAura({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="absolute inset-y-0 w-[20%]"
      style={{
        left: side === "left" ? 0 : undefined,
        right: side === "right" ? 0 : undefined,
        background:
          side === "left"
            ? "linear-gradient(90deg, rgba(14,165,233,0.52), rgba(56,189,248,0.34) 50%, rgba(124,58,237,0.18) 68%, transparent)"
            : "linear-gradient(270deg, rgba(14,165,233,0.5), rgba(125,211,252,0.32) 50%, rgba(139,92,246,0.16) 68%, transparent)",
        filter: "blur(10px)",
        maskImage:
          "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
      }}
    />
  );
}

function SkySoftIceBlock({ block }: { block: SoftBlockSpec }) {
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
          "0 0 34px rgba(56,189,248,0.56), 0 0 48px rgba(14,165,233,0.4)",
      }}
    />
  );
}

type PinkBeamSpec = {
  id: string;
  side: "left" | "right";
  top: number;
  angle: number;
  length: number;
  thickness: number;
};

const PINK_GLOW_BEAMS: PinkBeamSpec[] = [
  { id: "P-L1", side: "left", top: 12, angle: -10, length: 36, thickness: 2.8 },
  { id: "P-L2", side: "left", top: 28, angle: 6, length: 32, thickness: 2.2 },
  { id: "P-L3", side: "left", top: 52, angle: -14, length: 38, thickness: 2.5 },
  { id: "P-R1", side: "right", top: 16, angle: 12, length: 34, thickness: 2.6 },
  { id: "P-R2", side: "right", top: 38, angle: -8, length: 37, thickness: 2.3 },
  { id: "P-R3", side: "right", top: 58, angle: 15, length: 33, thickness: 2.4 },
];

function PinkSoftBeam({ beam, delaySec }: { beam: PinkBeamSpec; delaySec: number }) {
  const origin = beam.side === "left" ? "0% 50%" : "100% 50%";
  const direction = beam.side === "left" ? "90deg" : "270deg";
  const color = "rgba(244,114,182,0.78)";

  return (
    <div
      className="video-edge-pink-pulse absolute"
      style={{
        top: `${beam.top}%`,
        left: beam.side === "left" ? 0 : undefined,
        right: beam.side === "right" ? 0 : undefined,
        width: `${beam.length}%`,
        height: `${beam.thickness}px`,
        transform: `rotate(${beam.angle}deg)`,
        transformOrigin: origin,
        animationDelay: `${delaySec}s`,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          background: `linear-gradient(${direction}, ${color}, rgba(251,207,232,0.42) 34%, transparent 100%)`,
          filter: "blur(8px)",
          boxShadow:
            "0 0 22px rgba(244,114,182,0.55), 0 0 38px rgba(236,72,153,0.32)",
        }}
      />
    </div>
  );
}

function SlowPinkGlowEdgeLayer() {
  return (
    <div className="absolute inset-0">
      <div
        className="video-edge-pink-pulse absolute inset-x-0 top-0 h-[24%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(244,114,182,0.42), rgba(251,207,232,0.22) 55%, transparent)",
          filter: "blur(16px)",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute inset-x-0 bottom-0 h-[24%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(236,72,153,0.38), rgba(249,168,212,0.2) 52%, transparent)",
          filter: "blur(16px)",
          animationDelay: "1.4s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute left-[6%] top-[8%] h-[14%] w-[22%] rounded-[28px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(244,114,182,0.55), rgba(251,207,232,0.38))",
          filter: "blur(14px)",
          animationDelay: "0.6s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute right-[8%] top-[10%] h-[12%] w-[20%] rounded-[28px]"
        style={{
          background:
            "linear-gradient(120deg, rgba(236,72,153,0.5), rgba(249,168,212,0.34))",
          filter: "blur(14px)",
          animationDelay: "2.1s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute bottom-[9%] left-[18%] h-[13%] w-[24%] rounded-[28px]"
        style={{
          background:
            "linear-gradient(200deg, rgba(244,114,182,0.48), rgba(251,207,232,0.32))",
          filter: "blur(14px)",
          animationDelay: "1.8s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute left-0 top-0 h-[26%] w-[32%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 0% 0%, rgba(244,114,182,0.36), transparent 72%)",
          filter: "blur(12px)",
          animationDelay: "0.3s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute right-0 top-0 h-[26%] w-[32%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 100% 0%, rgba(236,72,153,0.34), transparent 72%)",
          filter: "blur(12px)",
          animationDelay: "1.1s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute inset-y-0 left-0 w-[16%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(244,114,182,0.28), rgba(251,207,232,0.12) 55%, transparent)",
          filter: "blur(11px)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          animationDelay: "0.9s",
        }}
      />
      <div
        className="video-edge-pink-pulse absolute inset-y-0 right-0 w-[16%]"
        style={{
          background:
            "linear-gradient(270deg, rgba(236,72,153,0.26), rgba(249,168,212,0.11) 55%, transparent)",
          filter: "blur(11px)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          animationDelay: "2.4s",
        }}
      />
      {PINK_GLOW_BEAMS.map((beam, i) => (
        <PinkSoftBeam key={beam.id} beam={beam} delaySec={i * 0.55} />
      ))}
    </div>
  );
}

function SkyBlueVioletEdgeBeamLayer() {
  const skyBeams = EDGE_LIGHT_BEAMS.map((beam, i) => ({
    ...beam,
    hue:
      beam.hue === "violet" || i % 2 === 0
        ? ("violet" as const)
        : ("blue" as const),
  }));

  return (
    <div className="crystal-edge-glow absolute inset-0">
      <div
        className="absolute inset-x-0 top-0 h-[46%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,165,233,0.52), rgba(56,189,248,0.38) 50%, rgba(56,189,248,0.1) 62%, transparent)",
          filter: "blur(16px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[26%]"
        style={{
          background:
            "linear-gradient(0deg, rgba(14,165,233,0.52), rgba(56,189,248,0.38) 50%, rgba(139,92,246,0.18) 68%, transparent)",
          filter: "blur(16px)",
        }}
      />
      {SKY_EDGE_SOFT_BLOCKS.map((block) => (
        <SkySoftIceBlock key={block.id} block={block} />
      ))}
      {SKY_CORNER_FILLS.map((corner) => (
        <CornerBeamFill key={corner.id} corner={corner} tone="sky" />
      ))}
      <SkyEdgeAura side="left" />
      <SkyEdgeAura side="right" />
      {skyBeams.map((beam) => (
        <SoftLightBeam key={`sky-${beam.id}`} beam={beam} palette="sky" />
      ))}
      {EXTRA_VIOLET_ACCENT_BEAMS.map((beam) => (
        <SoftLightBeam key={beam.id} beam={beam} palette="sky" />
      ))}
    </div>
  );
}

function BlueVioletEdgeBeamLayer() {
  return (
    <div className="crystal-edge-glow absolute inset-0">
      <div
        className="absolute inset-x-0 top-0 h-[46%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(21,62,180,0.52), rgba(29,78,216,0.38) 50%, rgba(29,78,216,0.1) 62%, transparent)",
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
  const airyLayerRef = useRef<HTMLDivElement>(null);
  const pinkLayerRef = useRef<HTMLDivElement>(null);
  const lowLayerRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const dimFrom = timeWindow.dimFrom ?? timeWindow.end;
  const windowKey = `${timeWindow.start}-${timeWindow.end}-${dimFrom}-${timeWindow.airyVioletFrom ?? ""}-${timeWindow.airyVioletUntil ?? ""}-${timeWindow.pinkGlowFrom ?? ""}-${timeWindow.pinkGlowUntil ?? ""}-${timeWindow.fadeInDuration ?? ""}-${timeWindow.fadeOutDuration ?? ""}`;

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
      const airyLayer = airyLayerRef.current;
      const pinkLayer = pinkLayerRef.current;
      const lowLayer = lowLayerRef.current;
      const glass = glassRef.current;
      const alpha = windowOpacity(t, timeWindow);
      if (alpha <= 0.004) {
        root.style.visibility = "hidden";
        root.style.opacity = "0";
        if (fullLayer) fullLayer.style.opacity = "0";
        if (airyLayer) airyLayer.style.opacity = "0";
        if (pinkLayer) pinkLayer.style.opacity = "0";
        if (lowLayer) lowLayer.style.opacity = "0";
        if (glass) glass.style.opacity = "0";
        return;
      }

      let lowMix = 0;
      if (t > dimFrom && timeWindow.end > dimFrom) {
        lowMix = smoothstep01((t - dimFrom) / (timeWindow.end - dimFrom));
      }
      const airyMix = airyVioletMix(t, timeWindow);
      const pinkMix = pinkGlowMix(t, timeWindow) * airyMix;

      root.style.visibility = "visible";
      root.style.opacity = "1";
      if (fullLayer) {
        fullLayer.style.opacity = String(
          alpha * (1 - lowMix) * (1 - airyMix),
        );
      }
      if (airyLayer) {
        airyLayer.style.opacity = String(alpha * airyMix);
      }
      if (pinkLayer) {
        pinkLayer.style.opacity = String(alpha * pinkMix * 0.92);
      }
      if (lowLayer) {
        const lowStrength = 0.32 + 0.68 * lowMix;
        lowLayer.style.opacity = String(alpha * lowStrength * (1 - airyMix));
      }
      if (glass) {
        glass.style.opacity = String(
          0.35 * alpha * (1 - lowMix * 0.75),
        );
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
      <div ref={airyLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <SkyBlueVioletEdgeBeamLayer />
      </div>
      <div ref={pinkLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
        <SlowPinkGlowEdgeLayer />
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
