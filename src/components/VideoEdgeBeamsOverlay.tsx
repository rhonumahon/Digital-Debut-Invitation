import { useEffect, useRef, useState } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
import { processVideoEdgeFrameDataUrl } from "../utils/iceShardFrame";

const DEFAULT_FRAME_IMAGE = "/assets/images/elsa-ice-frame-shards.jpg";

export type VideoEdgeBeamWindow = {
  start: number;
  end: number;
  frameImage?: string;
};

function windowOpacity(t: number, start: number, end: number): number {
  if (t < start || t > end) return 0;
  const fadeIn = Math.min(1, (t - start) / 0.55);
  const fadeOut = Math.min(1, (end - t) / 0.65);
  return Math.min(fadeIn, fadeOut);
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
  const [textureUrl, setTextureUrl] = useState("");
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const frameSrc = timeWindow.frameImage ?? DEFAULT_FRAME_IMAGE;
  const windowKey = `${timeWindow.start}-${timeWindow.end}-${frameSrc}`;

  useEffect(() => {
    setTextureUrl("");
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = frameSrc;

    const build = () => {
      const root = rootRef.current;
      if (cancelled || !root || !img.complete) return;
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      setTextureUrl(processVideoEdgeFrameDataUrl(img, w, h));
    };

    img.addEventListener("load", build);
    if (img.complete) build();

    const root = rootRef.current;
    const ro = root ? new ResizeObserver(build) : null;
    if (root && ro) ro.observe(root);

    return () => {
      cancelled = true;
      img.removeEventListener("load", build);
      ro?.disconnect();
    };
  }, [frameSrc]);

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
      const alpha = windowOpacity(t, timeWindow.start, timeWindow.end);
      if (alpha <= 0.004) {
        root.style.visibility = "hidden";
        root.style.opacity = "0";
        return;
      }
      root.style.visibility = "visible";
      root.style.opacity = String(alpha);
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
  }, [video, windowKey, timeWindow.end, timeWindow.start]);

  if (!video) return null;

  return (
    <div
      ref={rootRef}
      className="video-edge-beams pointer-events-none absolute inset-0 z-[14] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      {textureUrl ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${textureUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div
            className="video-edge-beam-glass-reflect absolute inset-0 opacity-35"
            style={{
              WebkitMaskImage:
                "linear-gradient(180deg, #000 0%, #000 9%, transparent 20%, transparent 80%, #000 91%, #000 100%)",
              maskImage:
                "linear-gradient(180deg, #000 0%, #000 9%, transparent 20%, transparent 80%, #000 91%, #000 100%)",
            }}
          />
        </>
      ) : null}
    </div>
  );
}
