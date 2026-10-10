export type DjSfxId =
  | "applause"
  | "yahoo"
  | "hahaha"
  | "toinks"
  | "cheers"
  | "ohhh"
  | "airhorn"
  | "tada";

export type DjSfxButton = {
  id: DjSfxId;
  label: string;
  src: string;
};

/** Royalty-free clips from Mixkit (https://mixkit.co/license/) — bundled under public/assets/dj/ */
export const DJ_SFX_BUTTONS: DjSfxButton[] = [
  { id: "applause", label: "Applause", src: "/assets/dj/applause.mp3" },
  { id: "yahoo", label: "Yahoo!", src: "/assets/dj/yahoo.mp3" },
  { id: "hahaha", label: "Hahaha", src: "/assets/dj/hahaha.mp3" },
  { id: "toinks", label: "Toinks", src: "/assets/dj/toinks.mp3" },
  { id: "cheers", label: "Cheers", src: "/assets/dj/cheers.mp3" },
  { id: "ohhh", label: "Ohhh…", src: "/assets/dj/ohhh.mp3" },
  { id: "airhorn", label: "Airhorn", src: "/assets/dj/airhorn.mp3" },
  { id: "tada", label: "Ta-da!", src: "/assets/dj/tada.mp3" },
];

const cache = new Map<DjSfxId, HTMLAudioElement>();

function getAudio(id: DjSfxId, src: string): HTMLAudioElement {
  let audio = cache.get(id);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    cache.set(id, audio);
  }
  return audio;
}

/** Stop other pad clips so cues do not stack loudly. */
function stopOtherPads(except: DjSfxId) {
  for (const [id, audio] of cache) {
    if (id === except) continue;
    audio.pause();
    audio.currentTime = 0;
  }
}

export function playDjSfx(id: DjSfxId): void {
  const button = DJ_SFX_BUTTONS.find((item) => item.id === id);
  if (!button) return;
  stopOtherPads(id);
  const audio = getAudio(id, button.src);
  audio.volume = 0.85;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* autoplay policy — user must click pad first */
  });
}
