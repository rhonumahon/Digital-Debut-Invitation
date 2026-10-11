import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_PIN_KEY } from "../attendance/session";
import { fetchProgramMediaManifest, mergeSiteCues } from "../program/bundledMedia";
import { fetchRemoteProgram, fetchRemoteProgramForDesk, saveRemoteProgram } from "../program/programRemote";
import { loadProgramState, PROGRAM_UPDATED_EVENT, saveProgramState } from "../program/programStore";
import type { ProgramState } from "../program/types";

const POLL_MS = 20_000;

function mergePreservedInternalNotes(local: ProgramState, remote: ProgramState): ProgramState {
  const internalById = new Map(local.steps.map((step) => [step.id, step.internalNote]));
  return {
    steps: remote.steps.map((step) => ({
      ...step,
      internalNote: internalById.get(step.id) ?? step.internalNote ?? "",
    })),
  };
}

export function useDebutProgram() {
  const [state, setState] = useState<ProgramState>(() => loadProgramState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyState = useCallback((next: ProgramState, writeLocal = true) => {
    setState(next);
    if (writeLocal) saveProgramState(next);
  }, []);

  const persist = useCallback(
    (next: ProgramState) => {
      applyState(next);
      const pin = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ADMIN_PIN_KEY) : null;
      if (pin) void saveRemoteProgram(next, pin);
    },
    [applyState],
  );

  useEffect(() => {
    const sync = () => setState(loadProgramState());
    window.addEventListener(PROGRAM_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRAM_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      const manifest = await fetchProgramMediaManifest();
      const pin = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ADMIN_PIN_KEY) : null;
      const remote = pin ? await fetchRemoteProgramForDesk(pin) : await fetchRemoteProgram();
      const local = loadProgramState();
      let next = remote ?? local;
      if (remote && !pin) {
        next = mergePreservedInternalNotes(local, next);
      }
      next = mergeSiteCues(next, manifest);
      if (cancelled) return;
      const serialized = JSON.stringify(stateRef.current.steps);
      const incoming = JSON.stringify(next.steps);
      if (incoming === serialized) return;
      if (remote) applyState(next);
      else persist(next);
    };

    void pull();
    const id = window.setInterval(() => void pull(), POLL_MS);
    const onFocus = () => void pull();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [applyState, persist]);

  return { state, persist, setState: applyState };
}
