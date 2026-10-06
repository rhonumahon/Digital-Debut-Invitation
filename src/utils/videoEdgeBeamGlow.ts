/** Top edge wash height as a fraction of frame height (50% − 8%). */
export const TOP_EDGE_GLOW_HEIGHT_RATIO = 0.46;

export type VideoEdgeBeamWindow = {
  start: number;
  end: number;
  dimFrom?: number;
  airyVioletFrom?: number;
  airyVioletUntil?: number;
  pinkGlowFrom?: number;
  pinkGlowUntil?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
};

export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function airyVioletMix(t: number, window: VideoEdgeBeamWindow): number {
  const from = window.airyVioletFrom;
  if (from == null) return 0;
  const until = window.airyVioletUntil ?? window.end;
  if (t < from || t > until) return 0;

  const fadeIn = 1.05;
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

/** Matches edge-beam layer crossfade: deep navy vs sky vs soft low-light (bottom sync). */
export function edgeBeamGlowMix(
  t: number,
  window: VideoEdgeBeamWindow | undefined,
): { skyMix: number; softMix: number } {
  if (!window || t < window.start || t > window.end) {
    return { skyMix: 0, softMix: 0 };
  }

  const dimFrom = window.dimFrom ?? window.end;
  let softMix = 0;
  if (t > dimFrom && window.end > dimFrom) {
    softMix = smoothstep01((t - dimFrom) / (window.end - dimFrom));
  }
  const skyMix = airyVioletMix(t, window) * (1 - softMix);
  return { skyMix, softMix };
}

type Rgba = [number, number, number, number];

function lerpRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

function rgbaString(c: Rgba, strength: number): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3] * strength})`;
}

/** Top wash colors mirror VideoEdgeBeams bottom gradients (180deg). */
const DEEP_STOPS: { p: number; c: Rgba }[] = [
  { p: 0, c: [21, 62, 180, 0.52] },
  { p: 0.5, c: [29, 78, 216, 0.38] },
  { p: 0.62, c: [29, 78, 216, 0.1] },
  { p: 1, c: [125, 211, 252, 0] },
];

const SKY_STOPS: { p: number; c: Rgba }[] = [
  { p: 0, c: [14, 165, 233, 0.52] },
  { p: 0.5, c: [56, 189, 248, 0.38] },
  { p: 0.62, c: [56, 189, 248, 0.1] },
  { p: 1, c: [186, 230, 253, 0] },
];

const SOFT_STOPS: { p: number; c: Rgba }[] = [
  { p: 0, c: [186, 230, 253, 0.2] },
  { p: 0.55, c: [125, 211, 252, 0.1] },
  { p: 1, c: [125, 211, 252, 0] },
];

function blendStopSets(
  skyMix: number,
  softMix: number,
): { p: number; c: Rgba }[] {
  return DEEP_STOPS.map((deepStop, i) => {
    const skyStop = SKY_STOPS[i] ?? SKY_STOPS[SKY_STOPS.length - 1];
    const softStop = SOFT_STOPS[i] ?? SOFT_STOPS[SOFT_STOPS.length - 1];
    const navySky = lerpRgba(deepStop.c, skyStop.c, skyMix);
    const c = lerpRgba(navySky, softStop.c, softMix);
    return { p: deepStop.p, c };
  });
}

export function drawSyncedTopBlueGlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number,
  skyMix: number,
  softMix: number,
) {
  if (strength <= 0.004 || w <= 0 || h <= 0) return;

  const glowH = h * TOP_EDGE_GLOW_HEIGHT_RATIO;
  const gradient = ctx.createLinearGradient(0, 0, 0, glowH);
  for (const stop of blendStopSets(skyMix, softMix)) {
    gradient.addColorStop(stop.p, rgbaString(stop.c, strength));
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, glowH);
  ctx.restore();
}
