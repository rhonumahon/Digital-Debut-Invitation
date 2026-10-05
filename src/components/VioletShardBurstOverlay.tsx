import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";
import {
  ICE_RISING_STRIP_WIDTH_PERCENT,
  processIceShardFrameDataUrl,
} from "../utils/iceShardFrame";

const DEFAULT_SHARD_IMAGE = "/assets/images/elsa-ice-palace-vertical.png";

export type VioletShardTrigger = {
  time: number;
};

const BURST_DURATION = 0.72;
const RISE_DURATION = 0.36;

const shardLayerStyle = (textureUrl: string): CSSProperties => ({
  backgroundImage: textureUrl ? `url(${textureUrl})` : undefined,
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  mixBlendMode: "screen",
});

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t ** 3;
}

function shardMotion(elapsed: number): { lift: number; opacity: number } | null {
  if (elapsed < 0 || elapsed > BURST_DURATION) return null;

  const riseT = easeOutCubic(Math.min(1, elapsed / RISE_DURATION));
  const lift = (1 - riseT) * 108;

  let opacity = Math.min(1, elapsed / 0.05);
  if (elapsed > RISE_DURATION * 0.65) {
    opacity *= 1 - easeInCubic(
      (elapsed - RISE_DURATION * 0.65) / (BURST_DURATION - RISE_DURATION * 0.65),
    );
  }

  return { lift, opacity };
}

type VioletShardBurstOverlayProps = {
  video: HTMLVideoElement | null;
  triggers: VioletShardTrigger[];
  /** Same art as rising ice crystals (palace vertical). */
  shardImage?: string;
};

export default function VioletShardBurstOverlay({
  video,
  triggers,
  shardImage = DEFAULT_SHARD_IMAGE,
}: VioletShardBurstOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftLayerRef = useRef<HTMLDivElement>(null);
  const rightLayerRef = useRef<HTMLDivElement>(null);
  const [textureUrl, setTextureUrl] = useState("");
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);
  const triggerKey = `${triggers.map((t) => t.time).join(",")}-${shardImage}`;

  useEffect(() => {
    setTextureUrl("");
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = shardImage;

    const syncFullBleedWidth = () => {
      const root = rootRef.current;
      const leftLayer = leftLayerRef.current;
      const rightLayer = rightLayerRef.current;
      if (!root || !leftLayer || !rightLayer) return;
      const w = Math.max(1, root.clientWidth);
      leftLayer.style.width = `${w}px`;
      rightLayer.style.width = `${w}px`;
    };

    const build = () => {
      const root = rootRef.current;
      if (cancelled || !root || !img.complete) return;
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      setTextureUrl(processIceShardFrameDataUrl(img, w, h));
      syncFullBleedWidth();
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
  }, [shardImage]);

  useEffect(() => {
    const root = rootRef.current;
    const leftLayer = leftLayerRef.current;
    const rightLayer = rightLayerRef.current;
    if (!root || !leftLayer || !rightLayer || !video || !triggers.length) return;

    const applyMotion = (motion: { lift: number; opacity: number }) => {
      const transform = `translateY(${motion.lift}%)`;
      leftLayer.style.transform = transform;
      rightLayer.style.transform = transform;
      leftLayer.style.opacity = String(motion.opacity);
      rightLayer.style.opacity = String(motion.opacity);
    };

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
      let active: { lift: number; opacity: number } | null = null;
      for (const trigger of triggers) {
        const motion = shardMotion(t - trigger.time);
        if (motion && (!active || motion.opacity > active.opacity)) {
          active = motion;
        }
      }

      if (!active || !textureUrl) {
        root.style.visibility = "hidden";
        leftLayer.style.opacity = "0";
        rightLayer.style.opacity = "0";
        return;
      }

      root.style.visibility = "visible";
      applyMotion(active);
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
  }, [video, triggerKey, triggers, textureUrl]);

  if (!video || !triggers.length) return null;

  const stripWidth = `${ICE_RISING_STRIP_WIDTH_PERCENT}%`;

  return (
    <div
      ref={rootRef}
      className="violet-shard-burst pointer-events-none absolute inset-0 z-[18] overflow-hidden"
      aria-hidden
      style={{ visibility: "hidden" }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-0 overflow-hidden"
        style={{ width: stripWidth, height: "100%" }}
      >
        <div
          ref={leftLayerRef}
          className="absolute bottom-0 left-0 opacity-0"
          style={{
            height: "100%",
            willChange: "transform, opacity",
            ...shardLayerStyle(textureUrl),
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute bottom-0 right-0 overflow-hidden"
        style={{ width: stripWidth, height: "100%" }}
      >
        <div
          ref={rightLayerRef}
          className="absolute bottom-0 right-0 opacity-0"
          style={{
            height: "100%",
            willChange: "transform, opacity",
            ...shardLayerStyle(textureUrl),
          }}
        />
      </div>
    </div>
  );
}
