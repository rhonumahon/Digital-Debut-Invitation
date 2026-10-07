const primed = new WeakSet<HTMLVideoElement>();

/** Muted play → pause at start so a later scroll play() is reliable (esp. iOS). */
export async function primeMomentVideo(el: HTMLVideoElement): Promise<boolean> {
  if (primed.has(el)) return true;
  el.muted = true;

  const run = async () => {
    await el.play();
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      /* seek may fail while metadata is sparse */
    }
  };

  try {
    await run();
    primed.add(el);
    return true;
  } catch {
    if (el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      await waitForVideoReady(el);
      try {
        await run();
        primed.add(el);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function clearMomentVideoPrime(el: HTMLVideoElement) {
  primed.delete(el);
}

/** Muted play first (browser-friendly), then optional sound after user activation. */
export async function playMomentVideoClip(
  el: HTMLVideoElement,
  withSound: boolean,
): Promise<boolean> {
  const tryMuted = async () => {
    el.muted = true;
    await el.play();
  };

  try {
    await tryMuted();
  } catch {
    if (el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      await waitForVideoReady(el);
      try {
        await tryMuted();
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }

  if (!withSound) {
    return !el.paused;
  }

  try {
    el.muted = false;
    await el.play();
  } catch {
    el.muted = true;
    try {
      await el.play();
    } catch {
      /* keep muted attempt below */
    }
  }
  return !el.paused;
}

export function isMomentVideoActuallyPlaying(el: HTMLVideoElement): boolean {
  return !el.paused && !el.ended && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

function waitForVideoReady(el: HTMLVideoElement): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener("canplay", done);
      el.removeEventListener("loadeddata", done);
      resolve();
    };
    el.addEventListener("canplay", done, { once: true });
    el.addEventListener("loadeddata", done, { once: true });
  });
}
