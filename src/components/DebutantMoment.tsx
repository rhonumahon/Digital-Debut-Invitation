import { useEffect, useRef, useState } from "react";
import FadeSlides from "./FadeSlides";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";
import {
  INVITATION_USER_ACTIVATED,
  useInvitationVideoAudio,
} from "../contexts/InvitationAudioContext";
import IceCrystalVideoOverlay, {
  type IceCrystalTrigger,
} from "./IceCrystalVideoOverlay";
import RisingIceCrystalsOverlay, {
  type RisingIceCrystalsWindow,
} from "./RisingIceCrystalsOverlay";
import VideoEdgeBeamsOverlay, {
  type VideoEdgeBeamWindow,
} from "./VideoEdgeBeamsOverlay";
import VioletShardBurstOverlay, {
  type VioletShardTrigger,
} from "./VioletShardBurstOverlay";
import CrystalTransformOverlay, {
  type CrystalMoment,
} from "./CrystalTransformOverlay";
import {
  estimatedVideoPlaybackTime,
  syncVideoPlaybackClock,
  type VideoPlaybackClock,
} from "../utils/videoPlaybackTime";

type Slide = {
  src: string;
  alt: string;
  fit?: string;
};

export type VideoPanKeyframe = {
  /** Seconds into the clip */
  time: number;
  /** Horizontal focus for object-position (0 = left edge, 50 = center) */
  xPercent: number;
  yPercent?: number;
  /** Zoom scale (1 = no zoom) */
  scale?: number;
  /** Easing from the previous keyframe (default: smooth). */
  ease?: "smooth" | "linear";
};

type PanState = { x: number; y: number; scale: number };

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function panStateAtTime(t: number, keyframes: VideoPanKeyframe[]): PanState {
  if (!keyframes.length) return { x: 50, y: 50, scale: 1 };
  const sorted = keyframes;
  const pick = (k: VideoPanKeyframe): PanState => ({
    x: k.xPercent,
    y: k.yPercent ?? 50,
    scale: k.scale ?? 1,
  });
  if (t <= sorted[0].time) return pick(sorted[0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t > b.time) continue;
    const span = b.time - a.time;
    const linear = span <= 0 ? 1 : (t - a.time) / span;
    const u = b.ease === "linear" ? linear : easeInOutSine(linear);
    const pa = pick(a);
    const pb = pick(b);
    return {
      x: pa.x + u * (pb.x - pa.x),
      y: pa.y + u * (pb.y - pa.y),
      scale: pa.scale + u * (pb.scale - pa.scale),
    };
  }
  return pick(sorted[sorted.length - 1]);
}

type DebutantMomentProps = {
  image: string;
  alt: string;
  kicker: string;
  motto: string;
  reason: string;
  video?: string;
  videos?: string[];
  slides?: Slide[];
  wide?: boolean;
  tall?: boolean;
  flip?: boolean;
  heading?: string;
  headingKicker?: string;
  /** When true, unmute clips while this block is on screen (after autoplay starts). */
  videoSound?: boolean;
  /** Shorter video frame (~9:14.4). Default is full portrait (9:16). */
  compactVideo?: boolean;
  /** Smooth horizontal pan while the clip plays (timestamps in seconds). */
  videoPanKeyframes?: VideoPanKeyframe[];
  /** Clip times (seconds) to flash ice crystals on the first video. */
  iceCrystalAt?: IceCrystalTrigger[];
  /** Sustained rising shiny ice crystals between start and end (clip seconds). */
  risingIceCrystals?: RisingIceCrystalsWindow | RisingIceCrystalsWindow[];
  /** Ice/crystal color wash on the video between start and end (clip seconds). */
  videoCrystalMoments?: CrystalMoment[];
  /** Steady dark-blue light beams along the top and bottom (clip seconds). */
  videoEdgeBeams?: VideoEdgeBeamWindow;
  violetShardAt?: VioletShardTrigger[];
  /** Hide site-wide falling petals while this block’s video is on screen. */
  hideGlobalPetalsWhileInView?: boolean;
};

export default function DebutantMoment({
  image,
  alt,
  kicker,
  motto,
  reason,
  video,
  videos,
  slides,
  wide = false,
  tall = false,
  flip = false,
  heading,
  headingKicker,
  videoSound = false,
  compactVideo = false,
  videoPanKeyframes,
  iceCrystalAt,
  risingIceCrystals,
  videoCrystalMoments,
  videoEdgeBeams,
  violetShardAt,
  hideGlobalPetalsWhileInView = false,
}: DebutantMomentProps) {
  const videoSources = videos?.length ? videos : video ? [video] : [];
  const hasVideo = videoSources.length > 0;
  const figureRef = useRef<HTMLElement>(null);
  const [crystalVideoEl, setCrystalVideoEl] = useState<HTMLVideoElement | null>(
    null,
  );
  const { setMomentVideosVisible, setFloatingPetalsSuppressed } =
    useInvitationVideoAudio();

  useEffect(() => {
    const root = figureRef.current;
    if (!root || !hasVideo) return;

    let visibleClips = 0;
    const syncMomentVisibility = (delta: number) => {
      const wasVisible = visibleClips > 0;
      visibleClips = Math.max(0, visibleClips + delta);
      const nowVisible = visibleClips > 0;
      if (wasVisible !== nowVisible) {
        setMomentVideosVisible(nowVisible);
        if (hideGlobalPetalsWhileInView) {
          setFloatingPetalsSuppressed(nowVisible);
        }
      }
    };

    const playClip = async (el: HTMLVideoElement) => {
      el.muted = true;
      try {
        await el.play();
        if (!videoSound) return;
        el.muted = false;
        await el.play();
      } catch {
        el.muted = true;
        await el.play().catch(() => {});
      }
    };

    const unmutePlayingClips = () => {
      if (!videoSound) return;
      root.querySelectorAll("video").forEach((el) => {
        if (el.paused) return;
        el.muted = false;
        el.play().catch(() => {});
      });
    };

    const clips = Array.from(root.querySelectorAll("video"));
    const clipInView = new WeakMap<HTMLVideoElement, boolean>();
    const observers = clips.map((el) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const wasInView = clipInView.get(el) ?? false;
          const inView = entry.isIntersecting;
          if (wasInView === inView) return;
          clipInView.set(el, inView);
          if (inView) {
            syncMomentVisibility(1);
            void playClip(el);
          } else {
            el.pause();
            el.muted = true;
            syncMomentVisibility(-1);
          }
        },
        { threshold: 0.35 },
      );
      observer.observe(el);
      return observer;
    });

    window.addEventListener(INVITATION_USER_ACTIVATED, unmutePlayingClips);
    return () => {
      window.removeEventListener(INVITATION_USER_ACTIVATED, unmutePlayingClips);
      if (visibleClips > 0) {
        setMomentVideosVisible(false);
        if (hideGlobalPetalsWhileInView) setFloatingPetalsSuppressed(false);
      }
      observers.forEach((observer) => observer.disconnect());
    };
  }, [
    hasVideo,
    videoSound,
    hideGlobalPetalsWhileInView,
    setMomentVideosVisible,
    setFloatingPetalsSuppressed,
    videoSources.join("|"),
  ]);

  const panKey =
    videoPanKeyframes
      ?.map((k) => `${k.time}:${k.xPercent}:${k.scale ?? 1}`)
      .join("|") ?? "";

  useEffect(() => {
    const root = figureRef.current;
    if (!root || !videoPanKeyframes?.length) return;

    const clocks = new WeakMap<HTMLVideoElement, VideoPlaybackClock>();
    const stopHandles = new WeakMap<HTMLVideoElement, () => void>();

    const applyPan = (el: HTMLVideoElement) => {
      const clock = clocks.get(el);
      if (clock && el.currentTime + 0.35 < clock.media) {
        syncVideoPlaybackClock(el, clocks);
      }
      const t = estimatedVideoPlaybackTime(el, clocks.get(el));
      const { x, y, scale } = panStateAtTime(t, videoPanKeyframes);
      el.style.objectPosition = `${x}% ${y}%`;
      el.style.transformOrigin = `${x}% ${y}%`;
      el.style.transform = scale > 1.001 ? `scale(${scale})` : "";
    };

    const stopPanLoop = (el: HTMLVideoElement) => {
      stopHandles.get(el)?.();
      stopHandles.delete(el);
    };

    const startPanLoop = (el: HTMLVideoElement) => {
      stopPanLoop(el);
      syncVideoPlaybackClock(el, clocks);

      type VideoWithRvfc = HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: DOMHighResTimeStamp, meta: VideoFrameCallbackMetadata) => void) => number;
        cancelVideoFrameCallback?: (handle: number) => void;
      };

      let rafId = 0;
      let rvfcId = 0;
      let running = true;

      const tick = () => {
        if (!running) return;
        applyPan(el);
      };

      const loopRvfc = () => {
        const video = el as VideoWithRvfc;
        if (!video.requestVideoFrameCallback) {
          const frame = () => {
            if (!running || el.paused) return;
            syncVideoPlaybackClock(el, clocks);
            tick();
            rafId = requestAnimationFrame(frame);
          };
          rafId = requestAnimationFrame(frame);
          return;
        }
        rvfcId = video.requestVideoFrameCallback(() => {
          if (!running) return;
          syncVideoPlaybackClock(el, clocks);
          tick();
          if (!el.paused) loopRvfc();
        });
      };

      loopRvfc();

      stopHandles.set(el, () => {
        running = false;
        cancelAnimationFrame(rafId);
        const video = el as VideoWithRvfc;
        if (rvfcId && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(rvfcId);
        }
      });
    };

    const onPlay = (event: Event) => {
      const el = event.currentTarget as HTMLVideoElement;
      syncVideoPlaybackClock(el, clocks);
      startPanLoop(el);
    };

    const onPause = (event: Event) => {
      const el = event.currentTarget as HTMLVideoElement;
      stopPanLoop(el);
      syncVideoPlaybackClock(el, clocks);
      applyPan(el);
    };

    const onLoopPoint = (event: Event) => {
      const el = event.currentTarget as HTMLVideoElement;
      syncVideoPlaybackClock(el, clocks);
      applyPan(el);
      if (!el.paused && !stopHandles.has(el)) {
        startPanLoop(el);
      }
    };

    const clips = Array.from(root.querySelectorAll("video"));
    clips.forEach((el) => {
      el.classList.add("debutant-moment-video--pan");
      syncVideoPlaybackClock(el, clocks);
      applyPan(el);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onLoopPoint);
      el.addEventListener("seeked", onLoopPoint);
      el.addEventListener("timeupdate", () => syncVideoPlaybackClock(el, clocks));
      if (!el.paused) startPanLoop(el);
    });

    return () => {
      clips.forEach((el) => {
        stopPanLoop(el);
        el.classList.remove("debutant-moment-video--pan");
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onLoopPoint);
        el.removeEventListener("seeked", onLoopPoint);
        el.style.objectPosition = "";
        el.style.transform = "";
        el.style.transformOrigin = "";
      });
    };
  }, [hasVideo, panKey, videoSources.join("|"), videoPanKeyframes]);

  const columns = wide
    ? flip
      ? "max-w-5xl md:grid-cols-[0.85fr_1.15fr]"
      : "max-w-5xl md:grid-cols-[1.15fr_0.85fr]"
    : "max-w-4xl md:grid-cols-2";

  const panVideo = Boolean(videoPanKeyframes?.length);
  const videoFrame = compactVideo
    ? `aspect-[9/14.4] object-cover${panVideo ? "" : " object-center"}`
    : `aspect-[9/16] object-cover${panVideo ? "" : " object-center"}`;

  const frame = wide
    ? "aspect-[4/3] object-[center_18%]"
    : hasVideo
      ? videoFrame
      : tall
        ? "aspect-[2/3]"
        : "aspect-[3/4] object-[center_12%]";

  const seam = flip
    ? "border-t border-[#c4894a]/45 md:border-t-0 md:border-r"
    : "border-t border-[#c4894a]/45 md:border-t-0 md:border-l";

  return (
    <section className="px-6 md:px-12 pt-6 pb-16">
      <SectionFlourish />
      {heading && (
        <Reveal className="text-center mb-10">
          {headingKicker && (
            <span className="font-cinzel text-sm tracking-[0.22em] uppercase text-white block mb-2 drop-shadow-[0_1px_8px_rgba(7,24,46,0.45)]">
              {headingKicker}
            </span>
          )}
          <h2 className="font-playfair text-[42px] md:text-6xl text-white italic font-medium leading-tight drop-shadow-[0_2px_12px_rgba(7,24,46,0.4)]">
            {heading}
          </h2>
        </Reveal>
      )}
      <Reveal className={`bronze-card mx-auto grid items-stretch gap-0 overflow-hidden rounded-3xl ${columns}`}>
        <figure ref={figureRef} className={`relative overflow-hidden ${flip ? "md:order-2" : ""}`}>
          {slides && slides.length > 0 && (
            <div className={`relative overflow-hidden bg-[#07182e] ${hasVideo ? "aspect-[2/3]" : frame}`}>
              <FadeSlides slides={slides} />
            </div>
          )}
          {hasVideo
            ? videoSources.map((src, index) => (
                <div
                  key={src}
                  className={`relative overflow-hidden ${
                    slides?.length && index === 0
                      ? "border-t border-[#f09060]/35"
                      : index > 0
                        ? "border-t border-[#f09060]/35"
                        : ""
                  }`}
                >
                  <video
                    ref={index === 0 ? setCrystalVideoEl : undefined}
                    src={src}
                    poster={index === 0 ? image : undefined}
                    aria-label={alt}
                    className={`debutant-moment-video w-full object-cover bg-[#07182e] ${frame}`}
                    playsInline
                    muted
                    loop
                    preload="auto"
                    disablePictureInPicture
                    disableRemotePlayback
                    onPlaying={(e) => e.currentTarget.removeAttribute("poster")}
                  />
                  {index === 0 && videoCrystalMoments?.length ? (
                    <CrystalTransformOverlay
                      video={crystalVideoEl}
                      moments={videoCrystalMoments}
                    />
                  ) : null}
                  {index === 0 && iceCrystalAt?.length ? (
                    <IceCrystalVideoOverlay
                      video={crystalVideoEl}
                      triggers={iceCrystalAt}
                    />
                  ) : null}
                  {index === 0 && risingIceCrystals ? (
                    <RisingIceCrystalsOverlay
                      video={crystalVideoEl}
                      windows={risingIceCrystals}
                    />
                  ) : null}
                  {index === 0 && videoEdgeBeams ? (
                    <VideoEdgeBeamsOverlay
                      video={crystalVideoEl}
                      window={videoEdgeBeams}
                    />
                  ) : null}
                  {index === 0 && violetShardAt?.length ? (
                    <VioletShardBurstOverlay
                      video={crystalVideoEl}
                      triggers={violetShardAt}
                    />
                  ) : null}
                </div>
              ))
            : !slides?.length ? (
            <img src={image} alt={alt} className={`w-full object-cover ${frame}`} />
          ) : null}
        </figure>
        <div className={`relative flex flex-col justify-center p-7 md:p-9 text-center ${seam} ${flip ? "md:order-1" : ""}`}>
          <p className="relative text-[#a8642c] font-garamond text-sm font-bold uppercase tracking-[0.16em]">
            {kicker}
          </p>
          <h2 className="relative font-playfair italic text-[#7a3e18] text-3xl md:text-4xl leading-snug mt-3">
            {motto}
          </h2>
          <div className="relative h-px w-16 bg-gradient-to-r from-transparent via-[#c4894a]/70 to-transparent mx-auto mt-4" />
          <p className="relative font-garamond italic text-[#5c3418] text-lg leading-relaxed mt-4">
            {reason}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
