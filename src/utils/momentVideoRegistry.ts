import { INVITATION_MOMENT_VIDEO_URLS } from "../constants/momentVideos";
import { primeMomentVideo } from "./momentVideoPlayback";

const pool = new Map<string, HTMLVideoElement>();
let preloadStarted = false;
let userHasActivated = false;

export const INVITATION_CELEBRATION_VISIBLE = "invitation-celebration-visible";

export function hasInvitationUserActivated() {
  return userHasActivated;
}

export function notifyInvitationCelebrationVisible() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVITATION_CELEBRATION_VISIBLE));
}

export function startInvitationMomentVideoPreload() {
  if (preloadStarted || typeof document === "undefined") return;
  preloadStarted = true;

  for (const url of INVITATION_MOMENT_VIDEO_URLS) {
    if (pool.has(url)) continue;
    const el = document.createElement("video");
    el.muted = true;
    el.preload = "auto";
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.src = url;
    el.load();
    pool.set(url, el);
  }
}

export function primeAllInvitationMomentVideos() {
  if (typeof document === "undefined") return;
  userHasActivated = true;

  const seen = new Set<HTMLVideoElement>();

  for (const el of pool.values()) {
    seen.add(el);
    void primeMomentVideo(el);
  }

  document.querySelectorAll("video.debutant-moment-video").forEach((node) => {
    if (!(node instanceof HTMLVideoElement) || seen.has(node)) return;
    void primeMomentVideo(node);
  });
}
