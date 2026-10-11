import type { ProgramState } from "./types";

export async function fetchRemoteProgram(): Promise<ProgramState | null> {
  try {
    const response = await fetch("/api/program", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as ProgramState;
    if (!Array.isArray(data.steps) || data.steps.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

/** Full timeline including internal notes (requires admin PIN). */
export async function fetchRemoteProgramForDesk(adminPin: string): Promise<ProgramState | null> {
  try {
    const response = await fetch("/api/admin/program", {
      cache: "no-store",
      headers: { "x-admin-pin": adminPin },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ProgramState;
    if (!Array.isArray(data.steps) || data.steps.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveRemoteProgram(state: ProgramState, adminPin: string): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/program", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-pin": adminPin },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch {
    return false;
  }
}
