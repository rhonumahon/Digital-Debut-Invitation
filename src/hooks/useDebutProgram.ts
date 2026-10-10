import { useCallback, useEffect, useState } from "react";
import { loadProgramState, PROGRAM_UPDATED_EVENT, saveProgramState } from "../program/programStore";
import type { ProgramState } from "../program/types";

export function useDebutProgram() {
  const [state, setState] = useState<ProgramState>(() => loadProgramState());

  const persist = useCallback((next: ProgramState) => {
    setState(next);
    saveProgramState(next);
  }, []);

  useEffect(() => {
    const sync = () => setState(loadProgramState());
    window.addEventListener(PROGRAM_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRAM_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { state, persist, setState };
}
