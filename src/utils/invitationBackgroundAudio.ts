export const INVITATION_AUDIO_ID = "invitation-audio";
export const FINALE_AUDIO_ID = "finale-audio";

export function getInvitationBackgroundAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(INVITATION_AUDIO_ID) as HTMLAudioElement | null;
}

export function getFinaleInvitationAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(FINALE_AUDIO_ID) as HTMLAudioElement | null;
}

/** Pause invitation intro/finale while on utility pages (e.g. /program). */
export function holdInvitationBackgroundAudio(): void {
  window.__invitationMusicHeld = true;
  getInvitationBackgroundAudio()?.pause();
  getFinaleInvitationAudio()?.pause();
  const intro = getInvitationBackgroundAudio();
  if (intro) intro.muted = true;
}

export function releaseInvitationBackgroundAudio(): void {
  window.__invitationMusicHeld = false;
  const intro = getInvitationBackgroundAudio();
  if (intro) intro.muted = false;
}

declare global {
  interface Window {
    __invitationMusicHeld?: boolean;
  }
}
