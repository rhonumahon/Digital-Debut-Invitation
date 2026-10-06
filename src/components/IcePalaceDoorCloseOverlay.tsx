import { useEffect, useRef, type RefObject } from "react";
import {
  estimatedVideoPlaybackTime,
  isVideoLoopJump,
} from "../utils/videoPlaybackTime";

export type IcePalaceDoorCloseConfig = {
  image: string;
  /** When the faint palace preview begins (clip seconds). */
  peekAt?: number;
  /** Door slam starts (clip seconds). */
  closeAt: number;
  peekOpacity?: number;
  closeDuration?: number;
  /** Opacity of each door panel once closed (0–1). */
  closedOpacity?: number;
  objectPosition?: string;
  /** Skip full-frame palace preview; doors begin at `closeAt` only. */
  skipPeek?: boolean;
};

function easeInCubic(t: number): number {
  return t * t * t;
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

type IcePalaceDoorCloseOverlayProps = {
  video: HTMLVideoElement | null;
  config: IcePalaceDoorCloseConfig;
};

export default function IcePalaceDoorCloseOverlay({
  video,
  config,
}: IcePalaceDoorCloseOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<{ media: number; wall: number } | undefined>(undefined);

  const {
    image,
    peekAt = config.closeAt - 1.2,
    closeAt,
    peekOpacity = 0.3,
    closeDuration = 0.36,
    closedOpacity = 0.68,
    objectPosition = "center center",
    skipPeek = false,
  } = config;

  const configKey = `${image}-${peekAt}-${closeAt}-${peekOpacity}-${closeDuration}-${skipPeek}-${closedOpacity}`;

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
      const peek = peekRef.current;
      const left = leftDoorRef.current;
      const right = rightDoorRef.current;
      const seam = seamRef.current;
      if (!peek || !left || !right || !seam) return;

      const peekRamp =
        skipPeek || t < peekAt
          ? 0
          : smoothstep01(Math.min(1, (t - peekAt) / 0.55));
      const closeProgress =
        t < closeAt ? 0 : easeInCubic(Math.min(1, (t - closeAt) / closeDuration));
      const closed = closeProgress >= 0.999;
      const active = skipPeek ? t >= closeAt : peekRamp > 0.004 || closeProgress > 0.004;

      if (!active) {
        root.style.visibility = "hidden";
        root.style.opacity = "0";
        peek.style.opacity = "0";
        left.style.opacity = "0";
        right.style.opacity = "0";
        seam.style.opacity = "0";
        return;
      }

      root.style.visibility = "visible";
      root.style.opacity = "1";

      const doorOpacity =
        closedOpacity * (closed ? 1 : 0.42 + closeProgress * 0.58);

      if (closeProgress <= 0.004) {
        peek.style.opacity = String(peekOpacity * peekRamp);
        left.style.opacity = "0";
        right.style.opacity = "0";
        left.style.transform = "translateX(-102%)";
        right.style.transform = "translateX(102%)";
        seam.style.opacity = "0";
        return;
      }

      peek.style.opacity = "0";
      left.style.opacity = String(doorOpacity);
      right.style.opacity = String(doorOpacity);
      const travel = 102 * (1 - closeProgress);
      left.style.transform = `translateX(${-travel}%)`;
      right.style.transform = `translateX(${travel}%)`;
      seam.style.opacity = closed
        ? "0.35"
        : String(0.12 + closeProgress * 0.28);
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
  }, [
    video,
    configKey,
    closeAt,
    closeDuration,
    peekAt,
    peekOpacity,
    closedOpacity,
    skipPeek,
  ]);

  if (!video) return null;

  const bg = {
    backgroundImage: `url(${image})`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  };

  function DoorPanel({
    panelRef,
    side,
  }: {
    panelRef: RefObject<HTMLDivElement | null>;
    side: "left" | "right";
  }) {
    const horizontal =
      side === "left" ? ("left center" as const) : ("right center" as const);
    return (
      <div
        ref={panelRef}
        className={`ice-palace-door-panel absolute top-0 h-full w-[50.5%] ${
          side === "left" ? "left-0 origin-left" : "right-0 origin-right"
        }`}
        style={{
          opacity: 0,
          transform:
            side === "left" ? "translateX(-102%)" : "translateX(102%)",
          willChange: "transform, opacity",
        }}
      >
        <div
          className="ice-palace-door-panel__art absolute inset-0"
          style={{
            ...bg,
            backgroundPosition: horizontal,
          }}
        />
        <div
          className={`ice-palace-door-panel__tint ice-palace-door-panel__tint--${side} absolute inset-0`}
          aria-hidden
        />
        <div className="ice-palace-door-panel__lift absolute inset-0" aria-hidden />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="ice-palace-door-close pointer-events-none absolute inset-0 z-[24] overflow-hidden"
      aria-hidden
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <div ref={peekRef} className="absolute inset-0 opacity-0">
        <div
          className="ice-palace-door-panel__art absolute inset-0"
          style={{ ...bg, backgroundPosition: objectPosition }}
        />
        <div className="ice-palace-door-panel__tint absolute inset-0" aria-hidden />
        <div className="ice-palace-door-panel__lift absolute inset-0" aria-hidden />
      </div>
      <DoorPanel panelRef={leftDoorRef} side="left" />
      <DoorPanel panelRef={rightDoorRef} side="right" />
      <div
        ref={seamRef}
        className="ice-palace-door-seam absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
