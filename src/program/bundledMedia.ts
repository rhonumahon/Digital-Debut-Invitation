export const SITE_MEDIA_PREFIX = "site:";

export type BundledTrack = {
  id: string;
  fileName: string;
  path: string;
  mimeType?: string;
};

export type BundledVideo = {
  id: string;
  fileName: string;
  path: string;
  mimeType?: string;
};

export type ProgramMediaManifest = {
  tracks: BundledTrack[];
  videos: BundledVideo[];
  stepTracks?: Record<string, string[]>;
  stepVideo?: Record<string, string>;
};

export function isSiteMediaId(id: string): boolean {
  return id.startsWith(SITE_MEDIA_PREFIX);
}

export async function fetchProgramMediaManifest(): Promise<ProgramMediaManifest> {
  try {
    const response = await fetch("/assets/program/manifest.json", { cache: "no-cache" });
    if (!response.ok) {
      return { tracks: [], videos: [], stepTracks: {}, stepVideo: {} };
    }
    const data = (await response.json()) as ProgramMediaManifest;
    return {
      tracks: Array.isArray(data.tracks) ? data.tracks.filter((t) => t?.id && t?.path) : [],
      videos: Array.isArray(data.videos) ? data.videos.filter((v) => v?.id && v?.path) : [],
      stepTracks: data.stepTracks ?? {},
      stepVideo: data.stepVideo ?? {},
    };
  } catch {
    return { tracks: [], videos: [], stepTracks: {}, stepVideo: {} };
  }
}

export function siteTrackUrl(manifest: ProgramMediaManifest, trackId: string): string | null {
  if (!isSiteMediaId(trackId)) return null;
  return manifest.tracks.find((track) => track.id === trackId)?.path ?? null;
}

export function siteVideoUrl(manifest: ProgramMediaManifest, videoId: string): string | null {
  if (!isSiteMediaId(videoId)) return null;
  return manifest.videos.find((video) => video.id === videoId)?.path ?? null;
}

/** Fill empty segment cues from manifest (does not overwrite saved program). */
export function mergeSiteCues(state: { steps: import("./types").ProgramStep[] }, manifest: ProgramMediaManifest) {
  const stepTracks = manifest.stepTracks ?? {};
  const stepVideo = manifest.stepVideo ?? {};
  return {
    steps: state.steps.map((step) => {
      const fromManifestTracks = stepTracks[step.title];
      const fromManifestVideo = stepVideo[step.title];
      return {
        ...step,
        trackIds:
          step.trackIds.length > 0
            ? step.trackIds
            : Array.isArray(fromManifestTracks)
              ? fromManifestTracks.filter((id) => typeof id === "string")
              : step.trackIds,
        videoId:
          step.videoId ??
          (typeof fromManifestVideo === "string" && fromManifestVideo ? fromManifestVideo : null),
      };
    }),
  };
}

export type LibraryTrackRow = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  source: "site" | "device";
  path?: string;
};

export function manifestTracksAsLibrary(manifest: ProgramMediaManifest): LibraryTrackRow[] {
  return manifest.tracks.map((track) => ({
    id: track.id,
    fileName: track.fileName,
    mimeType: track.mimeType ?? "audio/mpeg",
    createdAt: "",
    source: "site" as const,
    path: track.path,
  }));
}

export function manifestVideosAsLibrary(manifest: ProgramMediaManifest): LibraryTrackRow[] {
  return manifest.videos.map((video) => ({
    id: video.id,
    fileName: video.fileName,
    mimeType: video.mimeType ?? "video/mp4",
    createdAt: "",
    source: "site" as const,
    path: video.path,
  }));
}
