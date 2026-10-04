import { useEffect, useMemo, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";

const DEFAULT_PALACE_BG = "/assets/images/elsa-ice-palace-vertical.png";
const SLICE_COUNT = 8;

export type RisingIceSliceSide = "all" | "left" | "right";

export type RisingIceCrystalsWindow = {
  start: number;
  end: number;
  backgroundImage?: string;
  /** Which vertical slices rise during this window (default all). */
  sliceSide?: RisingIceSliceSide;
};

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

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function processPalaceImage(
  img: HTMLImageElement,
  outW: number,
  outH: number,
): ProcessedPalace {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { canvas, ready: true };
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(outW / iw, outH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, outW, outH);
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const L = luminance(r, g, b);
    let alpha = Math.max(0, (L - 0.08) * 1.85);
    if (b > r * 0.8 && b > g * 0.75) alpha *= 1.12;
    if (L < 0.06) alpha = 0;
    px[i + 3] = Math.min(255, Math.round(alpha * 210));
  }

  ctx.putImageData(data, 0, 0);
  return { canvas, ready: true };
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

function drawPalaceSlices(
  ctx: CanvasRenderingContext2D,
  palace: ProcessedPalace,
  slices: PalaceSlice[],
  w: number,
  h: number,
  master: number,
  localT: number,
  sliceSide: RisingIceSliceSide = "all",
) {
  const sliceW = w / SLICE_COUNT;
  const riseTravel = h * 0.38;
  const active = slicesForSide(slices, sliceSide);

  for (const slice of active) {
    const frame = sliceFrame(slice, localT, riseTravel);
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
};

export default function RisingIceCrystalsOverlay({
  video,
  windows: windowsInput,
}: RisingIceCrystalsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const palaceRef = useRef<ProcessedPalace | null>(null);
  const slices = useMemo(() => buildSlices(), []);
  const windows = useMemo(
    () => normalizeRisingIceWindows(windowsInput),
    [windowsInput],
  );
  const windowKey = windows
    .map(
      (w) =>
        `${w.start}-${w.end}-${w.backgroundImage ?? ""}-${w.sliceSide ?? "all"}`,
    )
    .join("|");
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const bgSrc = windows[0]?.backgroundImage ?? DEFAULT_PALACE_BG;

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
      let anyVisible = false;

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
          win.sliceSide ?? "all",
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
  }, [video, windowKey, windows, slices]);

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
