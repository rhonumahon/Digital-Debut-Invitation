import { useEffect, useMemo, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
import {
  drawSyncedTopBlueGlow,
  edgeBeamGlowMix,
  type VideoEdgeBeamWindow,
} from "../utils/videoEdgeBeamGlow";
import {
  ICE_SHARD_SLICE_COUNT,
  processIceShardFrame,
  processRisingSyncBackdropFrame,
} from "../utils/iceShardFrame";

const DEFAULT_PALACE_BG = "/assets/images/elsa-ice-palace-vertical.png";
const SLICE_COUNT = ICE_SHARD_SLICE_COUNT;

export type RisingIceSliceSide = "all" | "left" | "right";

export type RisingIceCrystalsWindow = {
  start: number;
  end: number;
  backgroundImage?: string;
  /** Which vertical slices rise during this window (default all). */
  sliceSide?: RisingIceSliceSide;
  /** Only these columns (0–7; shard 6 = index 5). Overrides sliceSide when set. */
  sliceIndices?: number[];
  /** With sliceIndices: seconds into the window before that rise starts (default 0.2). */
  sliceRiseDelay?: number;
  /** 8-slice cover backdrop; each column gains opacity every time its shard finishes a rise. */
  syncBackdropImage?: string;
  /** Peak opacity for sync backdrop columns (0–1). */
  syncBackdropStrength?: number;
  /** Clip seconds to keep backdrop visible (default 67 = 1:07). */
  syncBackdropHoldUntil?: number;
};

/** Replaces column sync backdrop from `at` with a full image revealed top → bottom. */
export type RisingSyncBackdropReplacement = {
  at: number;
  image: string;
  /** Seconds for the top-down reveal (default 3). */
  revealDuration?: number;
  /** Legacy uniform crossfade; curtain handoff uses `revealDuration` instead. */
  crossfadeDuration?: number;
  /**
   * `pop` (default): fade in only crystal deltas over the sync backdrop.
   * `curtain`: top-down wipe (harder edge).
   */
  revealMode?: "pop" | "curtain";
  /** Clip seconds to keep visible after reveal (default 41.5). */
  holdUntil?: number;
  fadeOutDuration?: number;
  strength?: number;
  /** Clip second to begin fading rising sync back in (often start of zoom). */
  syncRestoreStart?: number;
  /** Seconds to fade rising sync in (default 0.35). */
  syncRestoreFadeDuration?: number;
  /** Keep restored sync visible until this clip second (default 41.5). */
  syncRestoreUntil?: number;
  /** Fade restored sync after `syncRestoreUntil` (0 = hold full strength, no end fade). */
  syncRestoreEndFade?: number;
};

const SYNC_BACKDROP_FADE_IN_S = 0.55;
const DEFAULT_REPLACEMENT_HOLD_UNTIL = 41.5;
const DEFAULT_REPLACEMENT_REVEAL_S = 3;
const SYNC_BACKDROP_FADE_OUT_S = 0.85;
const DEFAULT_SYNC_BACKDROP_HOLD_UNTIL = 67;
const syncBackdropScratch = new WeakMap<
  ProcessedPalace,
  { canvas: HTMLCanvasElement; w: number; h: number }
>();

type PalaceSlice = {
  index: number;
  riseTime: number;
  holdTime: number;
  fadeTime: number;
  cycleGap: number;
  cycleOffset: number;
};

type ProcessedPalace = {
  canvas: HTMLCanvasElement;
  ready: true;
};

function seed(n: number): number {
  const x = Math.sin(n * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildSlices(): PalaceSlice[] {
  return Array.from({ length: SLICE_COUNT }, (_, index) => {
    const r1 = seed(index * 3.1 + 2);
    const r2 = seed(index * 5.7 + 4);
    const r3 = seed(index * 7.3 + 1);
    const r4 = seed(index * 9.1 + 3);
    const r5 = seed(index * 11.7 + 5);
    return {
      index,
      riseTime: 1.05 + r1 * 0.95,
      holdTime: 0.04 + r2 * 0.22,
      fadeTime: 0.28 + r3 * 0.45,
      cycleGap: 1.4 + r4 * 2.4,
      cycleOffset: r5 * 2.8,
    };
  });
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeInCubic(t: number): number {
  return t ** 3;
}

function windowOpacity(t: number, start: number, end: number): number {
  if (t < start || t > end) return 0;
  const span = end - start;
  const fade = Math.min(0.55, span * 0.35);
  const inT = fade > 0 ? Math.min(1, (t - start) / fade) : 1;
  const outT = fade > 0 ? Math.min(1, (end - t) / fade) : 1;
  return Math.min(inT, outT);
}

export function normalizeRisingIceWindows(
  input: RisingIceCrystalsWindow | RisingIceCrystalsWindow[],
): RisingIceCrystalsWindow[] {
  return Array.isArray(input) ? input : [input];
}

/**
 * When the first rising-ice window has finished revealing every sync column that
 * can rise within that window (first shard cycle + column opacity bump).
 */
export function syncBackdropOpeningRevealCompleteAt(
  input: RisingIceCrystalsWindow | RisingIceCrystalsWindow[],
): number {
  const windows = normalizeRisingIceWindows(input);
  const opening = windows
    .filter((w) => w.syncBackdropImage)
    .sort((a, b) => a.start - b.start)[0];
  if (!opening) return 0;

  const slices = buildSlices();
  const span = opening.end - opening.start;
  let latest = opening.start;

  for (const slice of slices) {
    if (!sliceIncludedInWindow(opening, slice.index)) continue;
    const cycleOffset = cycleOffsetForWindowSlice(opening, slice);
    const localEnd = cycleOffset + slice.riseTime;
    if (localEnd > span) continue;
    latest = Math.max(
      latest,
      opening.start + localEnd + SYNC_BACKDROP_FADE_IN_S,
    );
  }

  if (latest <= opening.start) {
    latest = opening.end + SYNC_BACKDROP_FADE_IN_S;
  }

  return latest;
}

function processPalaceImage(
  img: HTMLImageElement,
  outW: number,
  outH: number,
): ProcessedPalace {
  return { canvas: processIceShardFrame(img, outW, outH), ready: true };
}

type SliceFrame = {
  destY: number;
  alpha: number;
};

function sliceFrame(
  slice: PalaceSlice,
  localT: number,
  riseTravel: number,
): SliceFrame | null {
  const { riseTime, holdTime, fadeTime, cycleGap, cycleOffset } = slice;
  const cycleLen = riseTime + holdTime + fadeTime + cycleGap;
  const t = localT - cycleOffset;
  if (t < 0) return null;

  const phase = t % cycleLen;
  const activeEnd = riseTime + holdTime + fadeTime;
  if (phase >= activeEnd) return null;

  if (phase < riseTime) {
    const progress = easeOutCubic(phase / riseTime);
    const appear = easeInOutCubic(Math.min(1, phase / 0.18));
    return {
      destY: riseTravel * (1 - progress),
      alpha: appear * (0.5 + progress * 0.5),
    };
  }

  if (phase < riseTime + holdTime) {
    return {
      destY: 0,
      alpha: 0.88,
    };
  }

  const fadePhase = phase - riseTime - holdTime;
  const fade = 1 - easeInCubic(fadePhase / fadeTime);
  return {
    destY: -riseTravel * 0.12 * (fadePhase / fadeTime),
    alpha: fade * 0.88,
  };
}

function slicesForSide(
  slices: PalaceSlice[],
  side: RisingIceSliceSide = "all",
): PalaceSlice[] {
  if (side === "all") return slices;
  const half = SLICE_COUNT / 2;
  if (side === "right") return slices.filter((s) => s.index >= half);
  return slices.filter((s) => s.index < half);
}

function sliceIndexInSide(index: number, side: RisingIceSliceSide): boolean {
  const half = SLICE_COUNT / 2;
  if (side === "all") return true;
  if (side === "right") return index >= half;
  return index < half;
}

function sliceIncludedInWindow(
  win: RisingIceCrystalsWindow,
  index: number,
): boolean {
  if (win.sliceIndices?.length) return win.sliceIndices.includes(index);
  return sliceIndexInSide(index, win.sliceSide ?? "all");
}

function activeSlicesForWindow(
  slices: PalaceSlice[],
  win: RisingIceCrystalsWindow,
): PalaceSlice[] {
  if (win.sliceIndices?.length) {
    const pick = new Set(win.sliceIndices);
    return slices.filter((s) => pick.has(s.index));
  }
  return slicesForSide(slices, win.sliceSide ?? "all");
}

function sliceForWindow(
  win: RisingIceCrystalsWindow,
  slice: PalaceSlice,
): PalaceSlice {
  if (win.sliceIndices?.includes(slice.index)) {
    return { ...slice, cycleOffset: win.sliceRiseDelay ?? 0.2 };
  }
  return slice;
}

function cycleOffsetForWindowSlice(
  win: RisingIceCrystalsWindow,
  slice: PalaceSlice,
): number {
  if (win.sliceIndices?.includes(slice.index)) {
    return win.sliceRiseDelay ?? 0.2;
  }
  return slice.cycleOffset;
}

function syncBackdropHoldUntil(windows: RisingIceCrystalsWindow[]): number {
  const ends = windows
    .filter((w) => w.syncBackdropImage)
    .map((w) => w.syncBackdropHoldUntil ?? DEFAULT_SYNC_BACKDROP_HOLD_UNTIL);
  return ends.length ? Math.max(...ends) : DEFAULT_SYNC_BACKDROP_HOLD_UNTIL;
}

function sliceCycleLength(slice: PalaceSlice): number {
  return slice.riseTime + slice.holdTime + slice.fadeTime + slice.cycleGap;
}

/** Every clip time this column’s shard finishes a rise (all rising windows, all cycles). */
function columnRiseCompletionTimes(
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  index: number,
): number[] {
  const slice = slices[index];
  if (!slice) return [];

  const times: number[] = [];
  const cycleLen = sliceCycleLength(slice);

  for (const win of windows) {
    if (!win.syncBackdropImage) continue;
    if (!sliceIncludedInWindow(win, index)) continue;

    const cycleOffset = cycleOffsetForWindowSlice(win, slice);
    const windowSpan = win.end - win.start;
    for (let cycle = 0; ; cycle++) {
      const localEnd = cycleOffset + slice.riseTime + cycle * cycleLen;
      if (localEnd > windowSpan) break;
      times.push(win.start + localEnd);
    }
  }

  times.sort((a, b) => a - b);
  return times;
}

function columnRevealStart(
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  index: number,
): number | null {
  const times = columnRiseCompletionTimes(windows, slices, index);
  return times.length ? times[0] : null;
}

function opacityForCompletionCount(completions: number): number {
  if (completions <= 0) return 0;
  return Math.min(1, 0.76 + (completions - 1) * 0.12);
}

function columnRiseCompletionCount(
  t: number,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  index: number,
): number {
  const times = columnRiseCompletionTimes(windows, slices, index);
  let count = 0;
  for (const at of times) {
    if (t >= at) count++;
    else break;
  }
  return count;
}

function syncBackdropTimelineEnd(
  windows: RisingIceCrystalsWindow[],
): number {
  return syncBackdropHoldUntil(windows) + SYNC_BACKDROP_FADE_OUT_S;
}

/** True while any backdrop column should still be on screen (even between palace bursts). */
function syncBackdropTimelineActive(
  t: number,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
): boolean {
  if (!windows.some((win) => win.syncBackdropImage)) return false;
  const end = syncBackdropTimelineEnd(windows);
  for (let index = 0; index < SLICE_COUNT; index++) {
    const revealAt = columnRevealStart(windows, slices, index);
    if (revealAt !== null && t >= revealAt && t <= end) return true;
  }
  return false;
}

function columnBackdropOpacity(
  t: number,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  index: number,
  holdUntil: number,
): number {
  const times = columnRiseCompletionTimes(windows, slices, index);
  if (!times.length || t < times[0]) return 0;

  const count = columnRiseCompletionCount(t, windows, slices, index);
  const target = opacityForCompletionCount(count);
  const prev = opacityForCompletionCount(count - 1);
  const lastAt = times[count - 1];
  const bump = easeOutCubic(
    Math.min(1, (t - lastAt) / SYNC_BACKDROP_FADE_IN_S),
  );
  let level = prev + (target - prev) * bump;

  if (t <= holdUntil) return level;

  const fadeOut = Math.min(
    1,
    Math.max(0, (holdUntil + SYNC_BACKDROP_FADE_OUT_S - t) / SYNC_BACKDROP_FADE_OUT_S),
  );
  return level * fadeOut;
}

function getSyncBackdropScratch(
  backdrop: ProcessedPalace,
  w: number,
  h: number,
): HTMLCanvasElement {
  const key = syncBackdropScratch.get(backdrop);
  if (key && key.w === w && key.h === h) return key.canvas;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(w));
  canvas.height = Math.max(1, Math.floor(h));
  syncBackdropScratch.set(backdrop, { canvas, w, h });
  return canvas;
}

function applyColumnOpacityMask(
  backdrop: ProcessedPalace,
  opacities: number[],
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = getSyncBackdropScratch(backdrop, w, h);
  const octx = out.getContext("2d");
  if (!octx) return backdrop.canvas;

  octx.clearRect(0, 0, w, h);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(backdrop.canvas, 0, 0, w, h);

  const sliceW = w / SLICE_COUNT;
  const imageData = octx.getImageData(0, 0, w, h);
  const px = imageData.data;

  for (let index = 0; index < SLICE_COUNT; index++) {
    const colOp = opacities[index];
    if (colOp >= 0.999) continue;

    const xStart = Math.floor(index * sliceW);
    const xEnd =
      index === SLICE_COUNT - 1 ? w : Math.floor((index + 1) * sliceW);

    for (let y = 0; y < h; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const ai = (y * w + x) * 4 + 3;
        px[ai] = Math.round(px[ai] * colOp);
      }
    }
  }

  octx.putImageData(imageData, 0, 0);
  return out;
}

function syncBackdropCurtainHandoffActive(
  t: number,
  replacement: RisingSyncBackdropReplacement | undefined,
): boolean {
  if (!replacement) return false;
  if (t < replacement.at) return false;
  const duration = replacement.revealDuration ?? DEFAULT_REPLACEMENT_REVEAL_S;
  return t < replacement.at + duration - 0.001;
}

function maxColumnSyncBackdropOpacity(
  t: number,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  holdUntil: number,
): number {
  let peak = 0;
  for (let index = 0; index < SLICE_COUNT; index++) {
    peak = Math.max(
      peak,
      columnBackdropOpacity(t, windows, slices, index, holdUntil),
    );
  }
  return peak;
}

function risingSyncTopLightLevel(
  t: number,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  replacement: RisingSyncBackdropReplacement | undefined,
  opts: {
    backdropOnTimeline: boolean;
    curtainHandoff: boolean;
    syncRestoreLevel: number;
    underCrystalScale: number;
    replAt: number;
  },
): number {
  if (!windows.some((win) => win.syncBackdropImage)) return 0;

  let level = 0;
  if (opts.syncRestoreLevel > 0.004) {
    level = Math.max(level, opts.syncRestoreLevel);
  }
  if (opts.underCrystalScale > 0.004) {
    level = Math.max(level, opts.underCrystalScale);
  }
  if (opts.curtainHandoff) {
    level = Math.max(level, 1);
  }
  if (opts.backdropOnTimeline && t < opts.replAt) {
    level = Math.max(
      level,
      maxColumnSyncBackdropOpacity(
        t,
        windows,
        slices,
        syncBackdropHoldUntil(windows),
      ),
    );
  }
  return level;
}

function drawPersistentSyncBackdrop(
  ctx: CanvasRenderingContext2D,
  backdrop: ProcessedPalace,
  windows: RisingIceCrystalsWindow[],
  slices: PalaceSlice[],
  w: number,
  h: number,
  t: number,
  opacityScale = 1,
  clipBelowY?: number,
  holdUntilOverride?: number,
) {
  if (opacityScale <= 0.004) return false;

  const holdUntil = holdUntilOverride ?? syncBackdropHoldUntil(windows);
  const strength =
    (windows.find((win) => win.syncBackdropImage)?.syncBackdropStrength ?? 0.55) *
    opacityScale;
  let any = false;

  const opacities: number[] = [];
  for (let index = 0; index < SLICE_COUNT; index++) {
    opacities.push(
      columnBackdropOpacity(t, windows, slices, index, holdUntil),
    );
  }

  const active = opacities
    .map((opacity, index) => ({ opacity, index }))
    .filter(({ opacity }) => opacity > 0.004);
  if (!active.length) return false;

  any = true;
  const minO = Math.min(...active.map(({ opacity }) => opacity));
  const maxO = Math.max(...active.map(({ opacity }) => opacity));

  const source =
    maxO - minO < 0.025
      ? backdrop.canvas
      : applyColumnOpacityMask(backdrop, opacities, w, h);

  ctx.save();
  if (clipBelowY != null && clipBelowY < h - 0.5) {
    ctx.beginPath();
    ctx.rect(0, Math.max(0, clipBelowY), w, h - Math.max(0, clipBelowY));
    ctx.clip();
  }
  ctx.globalAlpha = (maxO - minO < 0.025 ? maxO : 1) * strength;
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  ctx.restore();

  return any;
}

function replacementTimelineEnd(replacement: RisingSyncBackdropReplacement): number {
  return replacement.holdUntil ?? DEFAULT_REPLACEMENT_HOLD_UNTIL;
}

function replacementTimelineActive(
  t: number,
  replacement: RisingSyncBackdropReplacement | undefined,
): boolean {
  if (!replacement) return false;
  return t >= replacement.at && t <= replacementTimelineEnd(replacement);
}

function replacementRevealProgress(
  t: number,
  replacement: RisingSyncBackdropReplacement,
): number {
  if (t < replacement.at) return 0;
  const duration = replacement.revealDuration ?? DEFAULT_REPLACEMENT_REVEAL_S;
  return easeInOutCubic(Math.min(1, (t - replacement.at) / duration));
}

function replacementRevealMode(
  replacement: RisingSyncBackdropReplacement,
): "pop" | "curtain" {
  return replacement.revealMode ?? "pop";
}

function crystalPopHandoffAlpha(revealProgress: number): number {
  return easeOutCubic(Math.min(1, Math.max(0, revealProgress)));
}

function replacementLayerAlpha(
  t: number,
  replacement: RisingSyncBackdropReplacement,
  revealProgress: number,
): number {
  if (revealProgress <= 0) return 0;
  const strength = replacement.strength ?? 0.58;
  const holdUntil = replacement.holdUntil ?? DEFAULT_REPLACEMENT_HOLD_UNTIL;
  let alpha = strength;

  const fade = replacement.fadeOutDuration ?? SYNC_BACKDROP_FADE_OUT_S;
  const fadeStart = holdUntil - fade;
  if (t > fadeStart) {
    alpha *= Math.min(1, Math.max(0, (holdUntil - t) / fade));
  }

  return alpha;
}

/** Fades the sync underlay with the crystalled layer during its exit. */
function replacementSyncUnderlayScale(
  t: number,
  replacement: RisingSyncBackdropReplacement,
  revealProgress: number,
): number {
  const strength = replacement.strength ?? 0.58;
  const layerAlpha = replacementLayerAlpha(t, replacement, revealProgress);
  if (layerAlpha <= 0.004 || strength <= 0.004) return 0;
  return Math.min(1, layerAlpha / strength);
}

function syncRestoreStartAt(
  replacement: RisingSyncBackdropReplacement,
): number {
  if (replacement.syncRestoreStart != null) return replacement.syncRestoreStart;
  const hold = replacement.holdUntil ?? DEFAULT_REPLACEMENT_HOLD_UNTIL;
  const fadeIn = replacement.syncRestoreFadeDuration ?? 0.35;
  return hold - fadeIn;
}

function syncRestoreOpacity(
  t: number,
  replacement: RisingSyncBackdropReplacement,
): number {
  const restoreStart = syncRestoreStartAt(replacement);
  if (t < restoreStart) return 0;

  const fadeIn = replacement.syncRestoreFadeDuration ?? 0.35;
  const holdUntil = replacement.syncRestoreUntil ?? DEFAULT_REPLACEMENT_HOLD_UNTIL;
  const fadeOut =
    replacement.syncRestoreEndFade ?? SYNC_BACKDROP_FADE_OUT_S;

  if (fadeIn > 0 && t < restoreStart + fadeIn) {
    return easeInOutCubic((t - restoreStart) / fadeIn);
  }
  if (t <= holdUntil) return 1;
  if (fadeOut <= 0) return 1;
  if (t <= holdUntil + fadeOut) {
    return easeInOutCubic((holdUntil + fadeOut - t) / fadeOut);
  }
  return 0;
}

function drawSyncBackdropReplacement(
  ctx: CanvasRenderingContext2D,
  backdrop: ProcessedPalace,
  w: number,
  h: number,
  t: number,
  replacement: RisingSyncBackdropReplacement,
): boolean {
  const reveal = replacementRevealProgress(t, replacement);
  if (reveal <= 0.002) return false;

  const mode = replacementRevealMode(replacement);
  let alpha = replacementLayerAlpha(t, replacement, reveal);
  if (mode === "pop") {
    alpha *= crystalPopHandoffAlpha(reveal);
  }
  if (alpha <= 0.004) return false;

  ctx.save();
  if (mode === "curtain") {
    ctx.beginPath();
    ctx.rect(0, 0, w, h * reveal);
    ctx.clip();
  }
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(backdrop.canvas, 0, 0, w, h);
  ctx.restore();

  return true;
}

/** Height of the upward spike at the leading (top) edge of a rising column. */
function shardTipHeight(sliceW: number, index: number): number {
  const r = seed(index * 13.17 + 4.2);
  return sliceW * (0.32 + r * 0.26);
}

function clipRisingShardSpike(
  ctx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  sliceW: number,
  h: number,
  index: number,
) {
  const tipH = Math.min(shardTipHeight(sliceW, index), h * 0.14);
  const peakBias = (seed(index * 17.83 + 1.9) - 0.5) * 0.18;
  const peakX = destX + sliceW * (0.5 + peakBias);
  const yBase = destY + tipH;

  ctx.beginPath();
  ctx.moveTo(destX, yBase);
  ctx.lineTo(peakX, destY);
  ctx.lineTo(destX + sliceW, yBase);
  ctx.lineTo(destX + sliceW, destY + h);
  ctx.lineTo(destX, destY + h);
  ctx.closePath();
  ctx.clip();
}

function drawPalaceSlices(
  ctx: CanvasRenderingContext2D,
  palace: ProcessedPalace,
  slices: PalaceSlice[],
  w: number,
  h: number,
  master: number,
  localT: number,
  win: RisingIceCrystalsWindow,
) {
  const sliceW = w / SLICE_COUNT;
  const riseTravel = h * 0.38;
  const active = activeSlicesForWindow(slices, win);

  for (const slice of active) {
    const frame = sliceFrame(sliceForWindow(win, slice), localT, riseTravel);
    if (!frame) continue;

    const destX = slice.index * sliceW;
    const destY = frame.destY;
    const srcX = (palace.canvas.width / SLICE_COUNT) * slice.index;
    const srcW = palace.canvas.width / SLICE_COUNT;

    ctx.save();
    clipRisingShardSpike(ctx, destX, destY, sliceW, h, slice.index);
    ctx.globalAlpha = master * frame.alpha * 0.92;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(
      palace.canvas,
      srcX,
      0,
      srcW,
      palace.canvas.height,
      destX,
      destY,
      sliceW + 0.5,
      h,
    );
    ctx.restore();
  }
}

type RisingIceCrystalsOverlayProps = {
  video: HTMLVideoElement | null;
  windows: RisingIceCrystalsWindow | RisingIceCrystalsWindow[];
  syncBackdropReplacement?: RisingSyncBackdropReplacement;
  /** No sync top wash while snow (or other) full backdrop is up (clip seconds). */
  syncTopGlowSuppressUntil?: number;
  /** Edge beam timing — top wash color tracks bottom beam phase (deep / sky / soft). */
  edgeBeamWindow?: VideoEdgeBeamWindow;
};

export default function RisingIceCrystalsOverlay({
  video,
  windows: windowsInput,
  syncBackdropReplacement,
  syncTopGlowSuppressUntil,
  edgeBeamWindow,
}: RisingIceCrystalsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const palaceRef = useRef<ProcessedPalace | null>(null);
  const backdropRef = useRef<Map<string, ProcessedPalace>>(new Map());
  const slices = useMemo(() => buildSlices(), []);
  const windows = useMemo(
    () => normalizeRisingIceWindows(windowsInput),
    [windowsInput],
  );
  const windowKey = windows
    .map(
      (w) =>
        `${w.start}-${w.end}-${w.backgroundImage ?? ""}-${w.sliceSide ?? "all"}-${(w.sliceIndices ?? []).join(",")}-${w.sliceRiseDelay ?? ""}-${w.syncBackdropImage ?? ""}-${w.syncBackdropStrength ?? ""}-${w.syncBackdropHoldUntil ?? ""}`,
    )
    .join("|");
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const bgSrc = windows[0]?.backgroundImage ?? DEFAULT_PALACE_BG;
  const backdropSrcs = useMemo(
    () =>
      [
        ...new Set(
          [
            ...windows
              .map((w) => w.syncBackdropImage)
              .filter((src): src is string => Boolean(src)),
            ...(syncBackdropReplacement?.image
              ? [syncBackdropReplacement.image]
              : []),
          ],
        ),
      ],
    [windows, syncBackdropReplacement?.image],
  );
  const backdropKey = [
    backdropSrcs.join("|"),
    syncBackdropReplacement?.at ?? "",
    syncBackdropReplacement?.revealDuration ?? "",
  ].join(";");
  const edgeBeamKey = edgeBeamWindow
    ? `${edgeBeamWindow.start}-${edgeBeamWindow.end}-${edgeBeamWindow.dimFrom ?? ""}-${edgeBeamWindow.airyVioletFrom ?? ""}-${edgeBeamWindow.airyVioletUntil ?? ""}`
    : "";

  useEffect(() => {
    palaceRef.current = null;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = bgSrc;

    const ensureProcessed = () => {
      const wrap = wrapRef.current;
      if (cancelled || !wrap || !img.complete) return;
      const pw = Math.max(1, wrap.clientWidth);
      const ph = Math.max(1, wrap.clientHeight);
      palaceRef.current = processPalaceImage(img, pw, ph);
    };

    img.addEventListener("load", ensureProcessed);
    if (img.complete) ensureProcessed();

    const wrap = wrapRef.current;
    const ro = wrap ? new ResizeObserver(ensureProcessed) : null;
    if (wrap && ro) ro.observe(wrap);

    return () => {
      cancelled = true;
      img.removeEventListener("load", ensureProcessed);
      ro?.disconnect();
    };
  }, [bgSrc]);

  const syncBackdropSrc = windows.find((win) => win.syncBackdropImage)?.syncBackdropImage;

  useEffect(() => {
    backdropRef.current = new Map();
    if (!backdropSrcs.length) return;

    let cancelled = false;
    const images = backdropSrcs.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return { src, img };
    });

    const ensureProcessed = () => {
      const wrap = wrapRef.current;
      if (cancelled || !wrap) return;
      const pw = Math.max(1, wrap.clientWidth);
      const ph = Math.max(1, wrap.clientHeight);
      const crystalSrc = syncBackdropReplacement?.image;
      for (const { src, img } of images) {
        if (!img.complete) continue;
        backdropRef.current.set(src, {
          canvas: processRisingSyncBackdropFrame(img, pw, ph, {
            softenEdges: Boolean(crystalSrc && src === crystalSrc),
          }),
          ready: true,
        });
      }

    };

    for (const { img } of images) {
      img.addEventListener("load", ensureProcessed);
      if (img.complete) ensureProcessed();
    }

    const wrap = wrapRef.current;
    const ro = wrap ? new ResizeObserver(ensureProcessed) : null;
    if (wrap && ro) ro.observe(wrap);

    return () => {
      cancelled = true;
      for (const { img } of images) {
        img.removeEventListener("load", ensureProcessed);
      }
      ro?.disconnect();
    };
  }, [backdropKey, backdropSrcs, syncBackdropSrc, syncBackdropReplacement?.image, syncBackdropReplacement?.revealMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let running = false;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

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
      ctx.clearRect(0, 0, w, h);
      if (w <= 0 || h <= 0) {
        wrap.style.opacity = "0";
        wrap.style.visibility = "hidden";
        return;
      }

      const palace = palaceRef.current;
      const replacementActive = replacementTimelineActive(
        t,
        syncBackdropReplacement,
      );
      const backdropOnTimeline = syncBackdropTimelineActive(t, windows, slices);
      const curtainHandoff = syncBackdropCurtainHandoffActive(
        t,
        syncBackdropReplacement,
      );
      const curtainReveal = syncBackdropReplacement
        ? replacementRevealProgress(t, syncBackdropReplacement)
        : 0;
      const curtainY = h * curtainReveal;
      const handoffMode = syncBackdropReplacement
        ? replacementRevealMode(syncBackdropReplacement)
        : "pop";
      const replAt = syncBackdropReplacement?.at ?? Number.POSITIVE_INFINITY;
      const crystalLayerActive = Boolean(
        syncBackdropReplacement &&
          replacementActive &&
          t >= replAt,
      );
      const syncUnderCrystalTime = crystalLayerActive
        ? Math.min(t, replAt - 0.001)
        : t;

      const syncRestoreLevel = syncBackdropReplacement
        ? syncRestoreOpacity(t, syncBackdropReplacement)
        : 0;

      let anyVisible =
        backdropOnTimeline ||
        replacementActive ||
        curtainHandoff ||
        syncRestoreLevel > 0.004;

      const columnOpacityTime =
        curtainHandoff && syncBackdropReplacement
          ? Math.min(t, syncBackdropReplacement.at - 0.001)
          : t;

      const backdropSrc = syncBackdropSrc;
      let underCrystalScale = 0;
      if (backdropSrc) {
        const backdrop = backdropRef.current.get(backdropSrc);
        if (backdrop?.ready) {
          if (
            syncRestoreLevel > 0.004 &&
            syncBackdropReplacement
          ) {
            anyVisible =
              drawPersistentSyncBackdrop(
                ctx,
                backdrop,
                windows,
                slices,
                w,
                h,
                t,
                syncRestoreLevel,
                undefined,
                syncBackdropReplacement.syncRestoreUntil ??
                  DEFAULT_REPLACEMENT_HOLD_UNTIL,
              ) || anyVisible;
          } else if (
            crystalLayerActive &&
            handoffMode === "pop" &&
            syncBackdropReplacement
          ) {
            const underScale = replacementSyncUnderlayScale(
              t,
              syncBackdropReplacement,
              curtainReveal,
            );
            underCrystalScale = underScale;
            if (underScale > 0.004) {
              anyVisible =
                drawPersistentSyncBackdrop(
                  ctx,
                  backdrop,
                  windows,
                  slices,
                  w,
                  h,
                  syncUnderCrystalTime,
                  underScale,
                ) || anyVisible;
            }
          } else if (curtainHandoff) {
            anyVisible =
              drawPersistentSyncBackdrop(
                ctx,
                backdrop,
                windows,
                slices,
                w,
                h,
                columnOpacityTime,
                1,
                curtainY,
              ) || anyVisible;
          } else if (backdropOnTimeline && t < replAt) {
            anyVisible =
              drawPersistentSyncBackdrop(
                ctx,
                backdrop,
                windows,
                slices,
                w,
                h,
                t,
                1,
              ) || anyVisible;
          }
        }
      }

      if (crystalLayerActive && syncBackdropReplacement) {
        const repl = backdropRef.current.get(syncBackdropReplacement.image);
        if (repl?.ready) {
          anyVisible =
            drawSyncBackdropReplacement(
              ctx,
              repl,
              w,
              h,
              t,
              syncBackdropReplacement,
            ) || anyVisible;
        }
      }

      for (const win of windows) {
        const master = windowOpacity(t, win.start, win.end);
        if (master <= 0.002 || !palace?.ready) continue;

        anyVisible = true;
        drawPalaceSlices(
          ctx,
          palace,
          slices,
          w,
          h,
          master,
          t - win.start,
          win,
        );
      }

      const syncTopLevel = risingSyncTopLightLevel(
        t,
        windows,
        slices,
        syncBackdropReplacement,
        {
          backdropOnTimeline,
          curtainHandoff,
          syncRestoreLevel,
          underCrystalScale,
          replAt,
        },
      );
      const snowOpenActive =
        syncTopGlowSuppressUntil != null && t < syncTopGlowSuppressUntil;
      if (syncTopLevel > 0.004 && !snowOpenActive) {
        const { skyMix, softMix } = edgeBeamGlowMix(t, edgeBeamWindow);
        drawSyncedTopBlueGlow(ctx, w, h, syncTopLevel, skyMix, softMix);
      }

      if (!anyVisible) {
        wrap.style.opacity = "0";
        wrap.style.visibility = "hidden";
        return;
      }

      wrap.style.visibility = "visible";
      wrap.style.opacity = "1";
    };

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
      ro.disconnect();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onLoopPoint);
      video.removeEventListener("seeked", onLoopPoint);
      video.removeEventListener("timeupdate", syncClock);
    };
  }, [
    video,
    windowKey,
    windows,
    slices,
    syncBackdropReplacement,
    syncTopGlowSuppressUntil,
    edgeBeamKey,
  ]);

  if (!video || !windows.length) return null;

  return (
    <div
      ref={wrapRef}
      className="rising-ice-crystals video-pan-sync-backdrop pointer-events-none absolute inset-0 z-[19] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
