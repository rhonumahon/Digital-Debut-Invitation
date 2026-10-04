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

  const extrapolated = clock.media + (performance.now() - clock.wall) / 1000;
  if (Math.abs(extrapolated - el.currentTime) > 0.45) {
    return el.currentTime;
  }

  return extrapolated;
}
