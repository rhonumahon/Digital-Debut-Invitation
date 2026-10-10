export const INVITATION_AUDIO_ID = "invitation-audio";

export function getInvitationBackgroundAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(INVITATION_AUDIO_ID) as HTMLAudioElement | null;
}

/** Pause invitation intro/finale while on utility pages (e.g. /program). */
export function holdInvitationBackgroundAudio(): void {
  window.__invitationMusicHeld = true;
  const audio = getInvitationBackgroundAudio();
  if (!audio) return;
  audio.pause();
  audio.muted = true;
}

export function releaseInvitationBackgroundAudio(): void {
  window.__invitationMusicHeld = false;
  const audio = getInvitationBackgroundAudio();
  if (!audio) return;
  audio.muted = false;
}

declare global {
  interface Window {
    __invitationMusicHeld?: boolean;
  }
}
