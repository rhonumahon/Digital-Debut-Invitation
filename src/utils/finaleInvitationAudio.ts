import { getInvitationBackgroundAudio } from "./invitationBackgroundAudio";

export const FINALE_MUSIC_SRC = "/assets/last20sec.mp3";

export function isFinaleSrc(src: string): boolean {
  return src.includes("last20sec.mp3");
}

/** Switch invitation audio to the grand-entry sting and play (clears desk mute hold). */
export function startFinaleInvitationAudio(): boolean {
  const audio = getInvitationBackgroundAudio();
  if (!audio) return false;

  window.__invitationMusicHeld = false;
  audio.muted = false;
  audio.loop = false;
  audio.volume = 0.35;

  if (!isFinaleSrc(audio.src)) {
    audio.src = FINALE_MUSIC_SRC;
    audio.load();
  }

  void audio.play().catch((err) => {
    console.warn("Finale music could not start:", err);
  });
  return true;
}
