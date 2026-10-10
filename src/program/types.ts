export interface ProgramStep {
  id: string;
  title: string;
  note: string;
  trackIds: string[];
  videoId: string | null;
}

export interface ProgramMediaItem {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

/** @deprecated Use ProgramMediaItem */
export type ProgramTrack = ProgramMediaItem;

export type ProgramVideo = ProgramMediaItem;

export interface ProgramState {
  steps: ProgramStep[];
}
