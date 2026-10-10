import { DEFAULT_PROGRAM_STEPS } from "./defaultProgram";
import type { ProgramState, ProgramStep } from "./types";

const STORAGE_KEY = "jaylyn-debut-program-v1";
export const PROGRAM_UPDATED_EVENT = "jaylyn-program-updated";

function normalizeTrackIds(step: {
  trackIds?: unknown;
  trackId?: unknown;
}): string[] {
  if (Array.isArray(step.trackIds)) {
    return step.trackIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof step.trackId === "string" && step.trackId) {
    return [step.trackId];
  }
  return [];
}

export function moveStepTrackIds(step: ProgramStep, trackIndex: number, direction: -1 | 1): ProgramStep {
  const target = trackIndex + direction;
  if (target < 0 || target >= step.trackIds.length) return step;
  const trackIds = [...step.trackIds];
  const [item] = trackIds.splice(trackIndex, 1);
  trackIds.splice(target, 0, item);
  return { ...step, trackIds };
}

function newStep(partial: { title: string; note: string }): ProgramStep {
  return {
    id: crypto.randomUUID(),
    title: partial.title,
    note: partial.note,
    trackIds: [],
    videoId: null,
  };
}

export function createDefaultProgramState(): ProgramState {
  return {
    steps: DEFAULT_PROGRAM_STEPS.map((step) => newStep(step)),
  };
}

function parseStored(raw: string | null): ProgramState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as ProgramState;
    if (!Array.isArray(data.steps)) return null;
    const steps = data.steps
      .filter((step) => step && typeof step.title === "string")
      .map((step) => ({
        id: typeof step.id === "string" ? step.id : crypto.randomUUID(),
        title: step.title,
        note: typeof step.note === "string" ? step.note : "",
        trackIds: normalizeTrackIds(step),
        videoId: typeof step.videoId === "string" ? step.videoId : null,
      }));
    return steps.length ? { steps } : null;
  } catch {
    return null;
  }
}

export function loadProgramState(): ProgramState {
  if (typeof localStorage === "undefined") return createDefaultProgramState();
  return parseStored(localStorage.getItem(STORAGE_KEY)) ?? createDefaultProgramState();
}

export function saveProgramState(state: ProgramState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(PROGRAM_UPDATED_EVENT));
}

export function moveStep(steps: ProgramStep[], index: number, direction: -1 | 1): ProgramStep[] {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function addBlankStep(steps: ProgramStep[]): ProgramStep[] {
  return [...steps, newStep({ title: "New segment", note: "" })];
}

export function removeStep(steps: ProgramStep[], id: string): ProgramStep[] {
  return steps.filter((step) => step.id !== id);
}
