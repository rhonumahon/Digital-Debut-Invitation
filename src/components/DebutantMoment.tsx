import { useEffect, useRef, useState } from "react";
import FadeSlides from "./FadeSlides";
import Reveal from "./Reveal";
import SectionFlourish from "./SectionFlourish";
import {
  INVITATION_USER_ACTIVATED,
  notifyInvitationUserActivation,
  useInvitationVideoAudio,
} from "../contexts/InvitationAudioContext";
import {
  isMomentVideoActuallyPlaying,
  playMomentVideoClip,
  tryUnmuteMomentVideo,
  primeMomentVideo,
} from "../utils/momentVideoPlayback";
import {
  hasInvitationUserActivated,
  INVITATION_CELEBRATION_VISIBLE,
} from "../utils/momentVideoRegistry";
import IceCrystalVideoOverlay, {
  type IceCrystalTrigger,
} from "./IceCrystalVideoOverlay";
import RisingIceCrystalsOverlay, {
  type RisingIceCrystalsWindow,
  type RisingSyncBackdropReplacement,
} from "./RisingIceCrystalsOverlay";
import VideoTimedBackdropOverlay, {
  type VideoTimedBackdropWindow,
} from "./VideoTimedBackdropOverlay";
import VideoEdgeBeamsOverlay, {
  type VideoEdgeBeamWindow,
} from "./VideoEdgeBeamsOverlay";
import VioletShardBurstOverlay, {
  type VioletShardTrigger,
} from "./VioletShardBurstOverlay";
import CrystalTransformOverlay, {
  type CrystalMoment,
} from "./CrystalTransformOverlay";
import IcePalaceDoorCloseOverlay, {
  type IcePalaceDoorCloseConfig,
} from "./IcePalaceDoorCloseOverlay";
import {
  estimatedVideoPlaybackTime,
  resyncVideoPlaybackClockIfMediaAdvanced,
  syncVideoPlaybackClock,
  type VideoPlaybackClock,
} from "../utils/videoPlaybackTime";
import {
  backdropZoomTransformStyle,
  panLayerLayoutStyle,
} from "../utils/videoObjectCoverPan";

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
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
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
  /** Full backdrop swap (e.g. top-down reveal at 0:27). */
  risingSyncBackdropReplacement?: RisingSyncBackdropReplacement;
  /** Full-frame backdrop for a clip time range (e.g. opening snow). */
  videoTimedBackdrop?: VideoTimedBackdropWindow;
  /** Ice/crystal color wash on the video between start and end (clip seconds). */
  videoCrystalMoments?: CrystalMoment[];
  /** Steady dark-blue light beams along the top and bottom (clip seconds). */
  videoEdgeBeams?: VideoEdgeBeamWindow;
  violetShardAt?: VioletShardTrigger[];
  /** Ice palace doors closing at end of clip (Let It Go–style). */
  icePalaceDoorClose?: IcePalaceDoorCloseConfig;
  /** Hide site-wide falling petals while this block’s video is on screen. */
  hideGlobalPetalsWhileInView?: boolean;
  /**
   * Light CSS polish (contrast/saturation). Cannot add pixels beyond the source file;
   * use a higher-quality re-encode for real HD.
   */
  videoEnhance?: "off" | "subtle" | "vivid";
  /** Show a still (slides) stacked above the clip; avoids duplicating it as the video poster. */
  stillAboveVideo?: boolean;
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
  risingSyncBackdropReplacement,
  videoTimedBackdrop,
  videoCrystalMoments,
  videoEdgeBeams,
  violetShardAt,
  icePalaceDoorClose,
  hideGlobalPetalsWhileInView = false,
  videoEnhance = "off",
  stillAboveVideo = false,
}: DebutantMomentProps) {
  const videoSources = videos?.length ? videos : video ? [video] : [];
  const hasVideo = videoSources.length > 0;
  const showSlideStack = Boolean(
    slides?.length &&
      !(hasVideo && slides.length === 1 && !stillAboveVideo),
  );
  const videoPoster = (index: number) =>
    index === 0 && image && !showSlideStack ? image : undefined;
  const figureRef = useRef<HTMLElement>(null);
  const [crystalVideoEl, setCrystalVideoEl] = useState<HTMLVideoElement | null>(
    null,
  );
  const [playHintIndex, setPlayHintIndex] = useState<Record<number, true>>({});
  const playClipRef = useRef<(el: HTMLVideoElement) => Promise<void>>(
    async () => {},
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

    const videoIndex = (el: HTMLVideoElement) => {
      const raw = el.dataset.momentVideoIndex;
      if (raw === undefined) return -1;
      const idx = Number(raw);
      return Number.isFinite(idx) ? idx : -1;
    };

    const setPlayHint = (el: HTMLVideoElement, show: boolean) => {
      const idx = videoIndex(el);
      if (idx < 0) return;
      setPlayHintIndex((prev) => {
        if (show) {
          if (prev[idx]) return prev;
          return { ...prev, [idx]: true };
        }
        if (!prev[idx]) return prev;
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    };

    /** Start playback when a slice of the clip enters view (tall Elsa clip needs a low bar). */
    const playVisibleFraction = 0.12;
    /** Unmute only when most of the clip is on screen — avoids sound on initial page load. */
    const soundVisibleFraction = 0.38;

    const visibleFraction = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      if (visible <= 0 || rect.height <= 0) return 0;
      return visible / rect.height;
    };

    const isPlayableInView = (el: Element) =>
      visibleFraction(el) >= playVisibleFraction;

    const isProminentInView = (el: Element) =>
      visibleFraction(el) >= soundVisibleFraction;

    const mayAutoUnmuteClip = (el: HTMLVideoElement) =>
      videoSound &&
      hasInvitationUserActivated() &&
      (clipInView.get(el) ?? false) &&
      isProminentInView(el);

    const playClip = async (el: HTMLVideoElement) => {
      await playMomentVideoClip(el);
      if (mayAutoUnmuteClip(el)) {
        await tryUnmuteMomentVideo(el);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      if (isMomentVideoActuallyPlaying(el)) {
        setPlayHint(el, false);
        return;
      }
      if (clipInView.get(el) ?? false) {
        setPlayHint(el, true);
      }
    };

    playClipRef.current = playClip;

    const syncProminentUnmute = () => {
      if (!videoSound || !hasInvitationUserActivated()) return;
      clips.forEach((el) => {
        if (el.paused || !el.muted || !mayAutoUnmuteClip(el)) return;
        void tryUnmuteMomentVideo(el);
      });
    };

    const unmutePlayingClips = () => {
      syncProminentUnmute();
    };

    const retryInViewClips = () => {
      clips.forEach((el) => {
        if ((clipInView.get(el) ?? false) && el.paused) {
          void playClip(el);
        }
      });
    };

    const onUserActivated = () => {
      clips.forEach((el) => {
        void primeMomentVideo(el);
      });
      unmutePlayingClips();
      retryInViewClips();
    };

    const clips = Array.from(root.querySelectorAll("video"));
    const clipInView = new WeakMap<HTMLVideoElement, boolean>();

    const isMostlyInView = (el: Element) => isPlayableInView(el);

    const setInView = (el: HTMLVideoElement, inView: boolean) => {
      const wasInView = clipInView.get(el) ?? false;
      if (wasInView === inView) return;
      clipInView.set(el, inView);
      el.dataset.inView = inView ? "true" : "false";
      if (inView) {
        syncMomentVisibility(1);
        void playClip(el);
      } else {
        el.pause();
        el.muted = true;
        setPlayHint(el, false);
        syncMomentVisibility(-1);
      }
    };

    const onMediaReady = (event: Event) => {
      const el = event.target;
      if (!(el instanceof HTMLVideoElement) || !root.contains(el)) return;
      if ((clipInView.get(el) ?? false) && el.paused) {
        void playClip(el);
        return;
      }
      if (!clipInView.get(el)) {
        void primeMomentVideo(el);
      }
    };

    root.addEventListener("canplay", onMediaReady);
    root.addEventListener("loadeddata", onMediaReady);

    const stallTimers = new Map<HTMLVideoElement, number>();
    const scheduleStallCheck = (el: HTMLVideoElement) => {
      const prev = stallTimers.get(el);
      if (prev) window.clearTimeout(prev);
      stallTimers.set(
        el,
        window.setTimeout(() => {
          if ((clipInView.get(el) ?? false) && !isMomentVideoActuallyPlaying(el)) {
            setPlayHint(el, true);
          }
        }, 900),
      );
    };

    const setInViewWithStall = (el: HTMLVideoElement, inView: boolean) => {
      setInView(el, inView);
      if (inView) scheduleStallCheck(el);
      else {
        const t = stallTimers.get(el);
        if (t) window.clearTimeout(t);
        stallTimers.delete(el);
      }
    };

    const observers = clips.map((el) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setInViewWithStall(el, entry.isIntersecting);
        },
        { threshold: 0.08, rootMargin: "80px 0px" },
      );
      observer.observe(el);
      return observer;
    });

    const bootstrapClips = () => {
      clips.forEach((el) => {
        if (isMostlyInView(el)) {
          setInViewWithStall(el, true);
        } else if (hasInvitationUserActivated()) {
          void primeMomentVideo(el);
        }
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(bootstrapClips);
    });
    window.setTimeout(bootstrapClips, 500);

    if (hasInvitationUserActivated()) {
      onUserActivated();
    }

    const onCelebrationVisible = () => {
      onUserActivated();
      bootstrapClips();
    };

    const onScrollOrResize = () => {
      syncProminentUnmute();
    };

    window.addEventListener(INVITATION_USER_ACTIVATED, onUserActivated);
    window.addEventListener(INVITATION_CELEBRATION_VISIBLE, onCelebrationVisible);
    document.addEventListener("visibilitychange", retryInViewClips);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener(INVITATION_USER_ACTIVATED, onUserActivated);
      window.removeEventListener(
        INVITATION_CELEBRATION_VISIBLE,
        onCelebrationVisible,
      );
      document.removeEventListener("visibilitychange", retryInViewClips);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      root.removeEventListener("canplay", onMediaReady);
      root.removeEventListener("loadeddata", onMediaReady);
      if (visibleClips > 0) {
        setMomentVideosVisible(false);
        if (hideGlobalPetalsWhileInView) setFloatingPetalsSuppressed(false);
      }
      observers.forEach((observer) => observer.disconnect());
      stallTimers.forEach((id) => window.clearTimeout(id));
      stallTimers.clear();
    };
  }, [
    hasVideo,
    videoSound,
    hideGlobalPetalsWhileInView,
    setMomentVideosVisible,
    setFloatingPetalsSuppressed,
    videoSources.join("|"),
  ]);

  const onPlayHintClick = (el: HTMLVideoElement) => {
    notifyInvitationUserActivation();
    const idx = Number(el.dataset.momentVideoIndex);
    void (async () => {
      try {
        await playMomentVideoClip(el);
        if (videoSound) {
          await tryUnmuteMomentVideo(el);
        }
      } catch {
        await playClipRef.current(el);
        return;
      }
      if (Number.isFinite(idx)) {
        setPlayHintIndex((prev) => {
          if (!prev[idx]) return prev;
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      }
    })();
  };

  const panKey =
    videoPanKeyframes
      ?.map((k) => `${k.time}:${k.xPercent}:${k.scale ?? 1}`)
      .join("|") ?? "";

  useEffect(() => {
    const root = figureRef.current;
    if (!root || !videoPanKeyframes?.length) return;

    const clocks = new WeakMap<HTMLVideoElement, VideoPlaybackClock>();
    const stopHandles = new WeakMap<HTMLVideoElement, () => void>();
    const coverBoxCache = new WeakMap<
      HTMLVideoElement,
      { cw: number; ch: number; vw: number; vh: number; rw: number; rh: number }
    >();
    const lastPanTransform = new WeakMap<HTMLElement, string>();

    const panShellFor = (el: HTMLVideoElement) =>
      el.closest("[data-video-pan-shell]") as HTMLElement | null;

    const panLayerFor = (el: HTMLVideoElement) =>
      el.closest("[data-video-pan-layer]") as HTMLElement | null;

    const applyPan = (el: HTMLVideoElement) => {
      const clock = clocks.get(el);
      if (clock && el.currentTime + 0.35 < clock.media) {
        syncVideoPlaybackClock(el, clocks);
      }
      resyncVideoPlaybackClockIfMediaAdvanced(el, clocks);
      const t = estimatedVideoPlaybackTime(el, clocks.get(el));
      const { x, y, scale } = panStateAtTime(t, videoPanKeyframes);

      const shell = panShellFor(el);
      const panLayer = panLayerFor(el);
      const cw = shell?.clientWidth ?? el.clientWidth;
      const ch = shell?.clientHeight ?? el.clientHeight;
      const vw = el.videoWidth || 1280;
      const vh = el.videoHeight || 720;

      if (panLayer && cw > 0 && ch > 0) {
        let box = coverBoxCache.get(el);
        if (
          !box ||
          box.cw !== cw ||
          box.ch !== ch ||
          box.vw !== vw ||
          box.vh !== vh
        ) {
          const layoutProbe = panLayerLayoutStyle(
            { xPercent: 50, yPercent: 50, scale: 1 },
            cw,
            ch,
            vw,
            vh,
          );
          const rw = Number.parseFloat(layoutProbe.width);
          const rh = Number.parseFloat(layoutProbe.height);
          box = { cw, ch, vw, vh, rw, rh };
          coverBoxCache.set(el, box);
          panLayer.style.width = layoutProbe.width;
          panLayer.style.height = layoutProbe.height;
        }

        const layout = panLayerLayoutStyle(
          { xPercent: x, yPercent: y, scale },
          cw,
          ch,
          vw,
          vh,
        );
        if (lastPanTransform.get(panLayer) !== layout.transform) {
          panLayer.style.transformOrigin = layout.transformOrigin;
          panLayer.style.transform = layout.transform;
          lastPanTransform.set(panLayer, layout.transform);
        }
      }

      const syncBackdropPan = t <= 75;
      shell
        ?.querySelectorAll<HTMLElement>(".video-pan-sync-backdrop")
        .forEach((layer) => {
          if (!syncBackdropPan) {
            layer.style.transform = "";
            layer.style.transformOrigin = "";
            return;
          }
          const zoom = backdropZoomTransformStyle({
            xPercent: x,
            yPercent: y,
            scale,
          });
          layer.style.transformOrigin = zoom.transformOrigin;
          layer.style.transform = zoom.transform;
        });
    };

    const clearPan = (el: HTMLVideoElement) => {
      el.style.objectPosition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      const panLayer = panLayerFor(el);
      if (panLayer) {
        panLayer.style.width = "";
        panLayer.style.height = "";
        panLayer.style.transform = "";
        panLayer.style.transformOrigin = "";
        lastPanTransform.delete(panLayer);
      }
      coverBoxCache.delete(el);
      panShellFor(el)
        ?.querySelectorAll<HTMLElement>(".video-pan-sync-backdrop")
        .forEach((layer) => {
          layer.style.transform = "";
          layer.style.transformOrigin = "";
        });
    };

    const stopPanLoop = (el: HTMLVideoElement) => {
      stopHandles.get(el)?.();
      stopHandles.delete(el);
    };

    const startPanLoop = (el: HTMLVideoElement) => {
      stopPanLoop(el);
      syncVideoPlaybackClock(el, clocks);

      let rafId = 0;
      let running = true;

      type VideoWithRvfc = HTMLVideoElement & {
        requestVideoFrameCallback?: (
          cb: (
            now: DOMHighResTimeStamp,
            meta: VideoFrameCallbackMetadata,
          ) => void,
        ) => number;
        cancelVideoFrameCallback?: (handle: number) => void;
      };

      let rvfcId = 0;
      const videoRvfc = el as VideoWithRvfc;

      const scheduleRvfc = () => {
        if (!running || el.paused || !videoRvfc.requestVideoFrameCallback) {
          return;
        }
        rvfcId = videoRvfc.requestVideoFrameCallback(() => {
          if (!running) return;
          syncVideoPlaybackClock(el, clocks);
          if (!el.paused) scheduleRvfc();
        });
      };

      const frame = () => {
        if (!running || el.paused) return;
        applyPan(el);
        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);
      scheduleRvfc();

      stopHandles.set(el, () => {
        running = false;
        cancelAnimationFrame(rafId);
        if (rvfcId && videoRvfc.cancelVideoFrameCallback) {
          videoRvfc.cancelVideoFrameCallback(rvfcId);
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

    const onResize = () => {
      clips.forEach((el) => applyPan(el));
    };

    const clips = Array.from(root.querySelectorAll("video"));
    const resizeObservers: ResizeObserver[] = [];

    clips.forEach((el) => {
      el.classList.add("debutant-moment-video--pan");
      el.style.objectPosition = "50% 50%";
      el.style.transform = "none";
      el.style.transformOrigin = "";
      syncVideoPlaybackClock(el, clocks);
      applyPan(el);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onLoopPoint);
      el.addEventListener("seeked", onLoopPoint);
      el.addEventListener("loadedmetadata", onLoopPoint);
      el.addEventListener("timeupdate", () => syncVideoPlaybackClock(el, clocks));
      if (!el.paused) startPanLoop(el);

      const shell = panShellFor(el);
      if (shell && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(onResize);
        ro.observe(shell);
        resizeObservers.push(ro);
      }
    });

    return () => {
      resizeObservers.forEach((ro) => ro.disconnect());
      clips.forEach((el) => {
        stopPanLoop(el);
        el.classList.remove("debutant-moment-video--pan");
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onLoopPoint);
        el.removeEventListener("seeked", onLoopPoint);
        el.removeEventListener("loadedmetadata", onLoopPoint);
        clearPan(el);
      });
    };
  }, [hasVideo, panKey, videoSources.join("|"), videoPanKeyframes]);

  const columns = wide
    ? flip
      ? "max-w-5xl md:grid-cols-[0.85fr_1.15fr]"
      : "max-w-5xl md:grid-cols-[1.15fr_0.85fr]"
    : "max-w-4xl md:grid-cols-2";

  const panVideo = Boolean(videoPanKeyframes?.length);
  const videoEnhanceClass =
    videoEnhance === "vivid"
      ? "debutant-moment-video-enhance--vivid"
      : videoEnhance === "subtle"
        ? "debutant-moment-video-enhance--subtle"
        : "";
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
          {showSlideStack && (
            <div className={`relative overflow-hidden bg-[#07182e] ${hasVideo ? "aspect-[2/3]" : frame}`}>
              <FadeSlides slides={slides} />
            </div>
          )}
          {hasVideo
            ? videoSources.map((src, index) => (
                <div
                  key={src}
                  data-video-pan-shell={panVideo ? "" : undefined}
                  className={`relative w-full overflow-hidden ${frame} ${
                    showSlideStack && index === 0
                      ? "border-t border-[#f09060]/35"
                      : index > 0
                        ? "border-t border-[#f09060]/35"
                        : ""
                  }`}
                >
                  {panVideo ? (
                    <div
                      data-video-pan-layer
                      className={`debutant-moment-video-pan-inner absolute left-0 top-0 ${videoEnhanceClass}`.trim()}
                    >
                      <video
                        ref={index === 0 ? setCrystalVideoEl : undefined}
                        data-moment-video-index={index}
                        src={src}
                        poster={videoPoster(index)}
                        aria-label={alt}
                        className="debutant-moment-video debutant-moment-video--pan absolute inset-0 h-full w-full bg-[#07182e] object-cover object-center"
                        playsInline
                        defaultMuted
                        loop
                        preload="auto"
                        disablePictureInPicture
                        disableRemotePlayback
                        onPlaying={(e) => {
                          const video = e.currentTarget;
                          video.removeAttribute("poster");
                          setPlayHintIndex((prev) => {
                            if (!prev[index]) return prev;
                            const next = { ...prev };
                            delete next[index];
                            return next;
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <video
                      ref={index === 0 ? setCrystalVideoEl : undefined}
                      data-moment-video-index={index}
                      src={src}
                      poster={videoPoster(index)}
                      aria-label={alt}
                      className={`debutant-moment-video absolute inset-0 h-full w-full bg-[#07182e] object-cover object-center ${videoEnhanceClass}`.trim()}
                      playsInline
                      defaultMuted
                      loop
                      preload="auto"
                      disablePictureInPicture
                      disableRemotePlayback
                      onPlaying={(e) => {
                        const video = e.currentTarget;
                        video.removeAttribute("poster");
                        setPlayHintIndex((prev) => {
                          if (!prev[index]) return prev;
                          const next = { ...prev };
                          delete next[index];
                          return next;
                        });
                      }}
                    />
                  )}
                  {playHintIndex[index] ? (
                    <button
                      type="button"
                      className="debutant-moment-video-play-hint"
                      aria-label="Play video"
                      onClick={(event) => {
                        event.stopPropagation();
                        const host = event.currentTarget.parentElement;
                        const videoEl = host?.querySelector("video.debutant-moment-video");
                        if (videoEl instanceof HTMLVideoElement) {
                          onPlayHintClick(videoEl);
                        }
                      }}
                    >
                      <span className="debutant-moment-video-play-hint__icon" aria-hidden>
                        ▶
                      </span>
                      <span className="debutant-moment-video-play-hint__label">
                        Tap to play video
                      </span>
                    </button>
                  ) : null}
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
                      syncBackdropReplacement={risingSyncBackdropReplacement}
                      syncTopGlowSuppressUntil={videoTimedBackdrop?.end}
                      edgeBeamWindow={videoEdgeBeams}
                    />
                  ) : null}
                  {index === 0 && videoTimedBackdrop ? (
                    <VideoTimedBackdropOverlay
                      video={crystalVideoEl}
                      window={videoTimedBackdrop}
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
                  {index === 0 && icePalaceDoorClose ? (
                    <IcePalaceDoorCloseOverlay
                      video={crystalVideoEl}
                      config={icePalaceDoorClose}
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
