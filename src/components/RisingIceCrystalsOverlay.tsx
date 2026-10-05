import { useEffect, useMemo, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
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
  /** Crossfade from column sync backdrop (default: same as revealDuration). */
  crossfadeDuration?: number;
  /** Clip seconds to keep visible after reveal (default 41.5). */
  holdUntil?: number;
  fadeOutDuration?: number;
  strength?: number;
};

const SYNC_BACKDROP_FADE_IN_S = 0.55;
const DEFAULT_REPLACEMENT_HOLD_UNTIL = 41.5;
const DEFAULT_REPLACEMENT_REVEAL_S = 3;
const SYNC_BACKDROP_FADE_OUT_S = 0.85;
const DEFAULT_SYNC_BACKDROP_HOLD_UNTIL = 67;
/** Clip padding so adjacent column passes overlap (no vertical gaps). */
const SYNC_BACKDROP_COLUMN_CLIP_PAD_PX = 2;

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

/** One column: clip a vertical band and paint the full backdrop (avoids slice seam lines). */
function drawSyncBackdropColumnClipped(
  ctx: CanvasRenderingContext2D,
  backdrop: ProcessedPalace,
  index: number,
  w: number,
  h: number,
  alpha: number,
) {
  const sliceW = w / SLICE_COUNT;
  const pad = SYNC_BACKDROP_COLUMN_CLIP_PAD_PX;
  const x0 = index * sliceW;
  const clipX = index === 0 ? 0 : x0 - pad;
  const clipW =
    index === SLICE_COUNT - 1 ? w - clipX : sliceW + pad * 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, 0, clipW, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(backdrop.canvas, 0, 0, w, h);
  ctx.restore();
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
) {
  if (opacityScale <= 0.004) return false;

  const holdUntil = syncBackdropHoldUntil(windows);
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

  if (maxO - minO < 0.025) {
    ctx.save();
    ctx.globalAlpha = maxO * strength;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(backdrop.canvas, 0, 0, w, h);
    ctx.restore();
    return any;
  }

  for (const { opacity, index } of active) {
    drawSyncBackdropColumnClipped(
      ctx,
      backdrop,
      index,
      w,
      h,
      opacity * strength,
    );
  }

  return any;
}

function replacementTimelineEnd(replacement: RisingSyncBackdropReplacement): number {
  const hold = replacement.holdUntil ?? DEFAULT_REPLACEMENT_HOLD_UNTIL;
  const fade = replacement.fadeOutDuration ?? SYNC_BACKDROP_FADE_OUT_S;
  return hold + fade;
}

function replacementTimelineActive(
  t: number,
  replacement: RisingSyncBackdropReplacement | undefined,
): boolean {
  if (!replacement) return false;
  return t >= replacement.at && t <= replacementTimelineEnd(replacement);
}

function syncBackdropHandoffCrossfade(
  t: number,
  replacement: RisingSyncBackdropReplacement | undefined,
): { outgoing: number; incoming: number } {
  if (!replacement) return { outgoing: 1, incoming: 0 };

  const at = replacement.at;
  const duration =
    replacement.crossfadeDuration ??
    replacement.revealDuration ??
    DEFAULT_REPLACEMENT_REVEAL_S;

  if (t < at) return { outgoing: 1, incoming: 0 };
  if (t >= at + duration) return { outgoing: 0, incoming: 1 };

  const u = easeInOutCubic((t - at) / duration);
  return { outgoing: 1 - u, incoming: u };
}

function replacementRevealProgress(
  t: number,
  replacement: RisingSyncBackdropReplacement,
): number {
  if (t < replacement.at) return 0;
  const duration = replacement.revealDuration ?? DEFAULT_REPLACEMENT_REVEAL_S;
  return easeInOutCubic(Math.min(1, (t - replacement.at) / duration));
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

  if (t > holdUntil) {
    const fade = replacement.fadeOutDuration ?? SYNC_BACKDROP_FADE_OUT_S;
    alpha *= Math.min(
      1,
      Math.max(0, (replacementTimelineEnd(replacement) - t) / fade),
    );
  }

  return alpha;
}

function drawSyncBackdropReplacement(
  ctx: CanvasRenderingContext2D,
  backdrop: ProcessedPalace,
  w: number,
  h: number,
  t: number,
  replacement: RisingSyncBackdropReplacement,
  incomingScale = 1,
): boolean {
  const reveal = replacementRevealProgress(t, replacement);
  if (reveal <= 0.002 || incomingScale <= 0.004) return false;

  const alpha = replacementLayerAlpha(t, replacement, reveal) * incomingScale;
  if (alpha <= 0.004) return false;

  const revealH = h * reveal;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, revealH);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(backdrop.canvas, 0, 0, w, h);
  ctx.restore();

  return true;
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
    ctx.globalAlpha = master * frame.alpha * 0.82;
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
};

export default function RisingIceCrystalsOverlay({
  video,
  windows: windowsInput,
  syncBackdropReplacement,
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
      for (const { src, img } of images) {
        if (!img.complete) continue;
        backdropRef.current.set(src, {
          canvas: processRisingSyncBackdropFrame(img, pw, ph),
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
  }, [backdropKey, backdropSrcs]);

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
      const handoff = syncBackdropHandoffCrossfade(t, syncBackdropReplacement);
      const replacementActive = replacementTimelineActive(
        t,
        syncBackdropReplacement,
      );
      const backdropOnTimeline = syncBackdropTimelineActive(t, windows, slices);
      const crossfadeOutgoing =
        syncBackdropReplacement &&
        t >= syncBackdropReplacement.at &&
        handoff.outgoing > 0.004;
      let anyVisible =
        backdropOnTimeline || replacementActive || Boolean(crossfadeOutgoing);

      const columnOpacityTime =
        crossfadeOutgoing && syncBackdropReplacement
          ? Math.min(t, syncBackdropReplacement.at - 0.001)
          : t;

      const showColumnSync =
        handoff.outgoing > 0.004 &&
        (backdropOnTimeline || crossfadeOutgoing);

      const backdropSrc = windows.find((win) => win.syncBackdropImage)?.syncBackdropImage;
      if (showColumnSync && backdropSrc) {
        const backdrop = backdropRef.current.get(backdropSrc);
        if (backdrop?.ready) {
          anyVisible =
            drawPersistentSyncBackdrop(
              ctx,
              backdrop,
              windows,
              slices,
              w,
              h,
              columnOpacityTime,
              handoff.outgoing,
            ) || anyVisible;
        }
      }

      if (syncBackdropReplacement && replacementActive) {
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
              handoff.incoming,
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
  }, [video, windowKey, windows, slices, syncBackdropReplacement]);

  if (!video || !windows.length) return null;

  return (
    <div
      ref={wrapRef}
      className="rising-ice-crystals pointer-events-none absolute inset-0 z-[19] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
