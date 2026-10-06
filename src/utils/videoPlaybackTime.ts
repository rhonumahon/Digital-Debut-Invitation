export type VideoPlaybackClock = { media: number; wall: number };

export function syncVideoPlaybackClock(
  el: HTMLVideoElement,
  clocks: WeakMap<HTMLVideoElement, VideoPlaybackClock>,
) {
  clocks.set(el, { media: el.currentTime, wall: performance.now() });
}

/** Smooth time while playing; falls back to currentTime on loop/seek jumps. */
export function estimatedVideoPlaybackTime(
  el: HTMLVideoElement,
  clock: VideoPlaybackClock | undefined,
): number {
  if (el.paused || !clock) return el.currentTime;

  if (el.currentTime + 0.35 < clock.media) {
    return el.currentTime;
  }

  const rate = el.playbackRate > 0 ? el.playbackRate : 1;
  const extrapolated =
    clock.media + ((performance.now() - clock.wall) / 1000) * rate;
  if (Math.abs(extrapolated - el.currentTime) > 0.45) {
    return el.currentTime;
  }

  return extrapolated;
}

/** Resync when the element reports a new media timestamp (not every animation frame). */
export function resyncVideoPlaybackClockIfMediaAdvanced(
  el: HTMLVideoElement,
  clocks: WeakMap<HTMLVideoElement, VideoPlaybackClock>,
) {
  const clock = clocks.get(el);
  if (!clock || Math.abs(el.currentTime - clock.media) > 0.0008) {
    syncVideoPlaybackClock(el, clocks);
  }
}

/** True when playback jumped backward (loop or seek to an earlier time). */
export function isVideoLoopJump(
  previousMedia: number | undefined,
  currentMedia: number,
): boolean {
  if (previousMedia === undefined) return false;
  return currentMedia + 0.35 < previousMedia;
}
