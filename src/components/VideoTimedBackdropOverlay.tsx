import { useEffect, useRef } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";

export type VideoTimedBackdropWindow = {
  start: number;
  end: number;
  image: string;
  /** Peak layer opacity (default 0.9). */
  opacity?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  /** Zoom on top of object-cover (default 1.35). */
  coverScale?: number;
  /** object-position vertical % (default 50). */
  objectPositionY?: number;
  /** Shift image up on screen (cm). */
  offsetUpCm?: number;
  /** Shift image left on screen (cm). */
  offsetLeftCm?: number;
};

function backdropTransform(
  coverScale: number,
  offsetUpCm: number,
  offsetLeftCm: number,
): string {
  const parts: string[] = [];
  if (offsetLeftCm > 0) parts.push(`translateX(-${offsetLeftCm}cm)`);
  if (offsetUpCm > 0) parts.push(`translateY(-${offsetUpCm}cm)`);
  parts.push(`scale(${coverScale})`);
  return parts.join(" ");
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function layerOpacity(t: number, window: VideoTimedBackdropWindow): number {
  const { start, end } = window;
  if (t < start || t > end) return 0;

  const peak = window.opacity ?? 0.9;
  const fadeIn =
    window.fadeInDuration === undefined ? 0.4 : window.fadeInDuration;
  const fadeOut = window.fadeOutDuration ?? 1;

  let alpha = peak;
  if (fadeIn > 0 && t < start + fadeIn) {
    alpha *= smoothstep01((t - start) / fadeIn);
  }
  if (fadeOut > 0 && t > end - fadeOut) {
    alpha *= smoothstep01((end - t) / fadeOut);
  }
  return alpha;
}

type VideoTimedBackdropOverlayProps = {
  video: HTMLVideoElement | null;
  window: VideoTimedBackdropWindow;
};

export default function VideoTimedBackdropOverlay({
  video,
  window: backdropWindow,
}: VideoTimedBackdropOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);

  const coverScale = backdropWindow.coverScale ?? 1.35;
  const objectY = backdropWindow.objectPositionY ?? 50;
  const offsetUpCm = backdropWindow.offsetUpCm ?? 0;
  const offsetLeftCm = backdropWindow.offsetLeftCm ?? 0;

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img || !video) return;

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
      const alpha = layerOpacity(t, backdropWindow);
      if (alpha <= 0.004) {
        wrap.style.opacity = "0";
        wrap.style.visibility = "hidden";
        return;
      }
      wrap.style.visibility = "visible";
      wrap.style.opacity = String(alpha);
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
  }, [video, backdropWindow]);

  if (!video) return null;

  return (
    <div
      ref={wrapRef}
      className="video-timed-backdrop pointer-events-none absolute inset-0 z-[13] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <img
        ref={imgRef}
        src={backdropWindow.image}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full max-w-none object-cover"
        style={{
          objectPosition: `50% ${objectY}%`,
          transform: backdropTransform(coverScale, offsetUpCm, offsetLeftCm),
          transformOrigin: `${50}% ${objectY}%`,
        }}
      />
    </div>
  );
}
