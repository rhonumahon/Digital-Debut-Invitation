import {
  getFinaleInvitationAudio,
  getInvitationBackgroundAudio,
} from "./invitationBackgroundAudio";

/** Jump-cut mix (head → tail); separate URL avoids stale cached pre-trim MP3. */
export const FINALE_MUSIC_SRC = "/assets/last20sec-jumpcut.mp3";

export function isFinaleSrc(src: string): boolean {
  return src.includes("last20sec-jumpcut") || src.includes("last20sec.mp3");
}

export function isFinaleAudioPlaying(): boolean {
  const finale = getFinaleInvitationAudio();
  return !!finale && !finale.paused && !finale.ended;
}

/** Warm the finale clip after the guest unlocks audio (envelope / music button). */
export function primeFinaleInvitationAudio(): void {
  const finale = getFinaleInvitationAudio();
  if (!finale) return;
  if (!finale.src.includes("last20sec-jumpcut")) {
    finale.src = FINALE_MUSIC_SRC;
  }
  finale.load();
}

/**
 * Play finale on its own element so intro is not cut until this track actually starts.
 */
export async function startFinaleInvitationAudio(): Promise<boolean> {
  const intro = getInvitationBackgroundAudio();
  const finale = getFinaleInvitationAudio();
  if (!finale) return false;

  window.__invitationMusicHeld = false;
  finale.muted = false;
  finale.loop = false;
  finale.volume = 0.35;

  if (!finale.src.includes("last20sec-jumpcut")) {
    finale.src = FINALE_MUSIC_SRC;
  }

  const playFinale = async (): Promise<boolean> => {
    try {
      finale.currentTime = 0;
      await finale.play();
      intro?.pause();
      return true;
    } catch (err) {
      console.warn("Finale music could not start:", err);
      return false;
    }
  };

  if (finale.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return playFinale();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      finale.removeEventListener("canplaythrough", onReady);
      resolve(ok);
    };
    const onReady = () => {
      void playFinale().then(finish);
    };
    finale.addEventListener("canplaythrough", onReady);
    finale.load();
    window.setTimeout(() => {
      void playFinale().then(finish);
    }, 4000);
  });
}
