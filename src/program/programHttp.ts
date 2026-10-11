import type { ProgramState } from "./types";

export interface ProgramStore {
  read(): Promise<ProgramState | null>;
  write(data: ProgramState): Promise<void>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseProgramState(raw: unknown): ProgramState | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as ProgramState;
  if (!Array.isArray(data.steps)) return null;
  const steps = data.steps
    .filter((step) => step && typeof step.title === "string")
    .map((step) => ({
      id: typeof step.id === "string" ? step.id : crypto.randomUUID(),
      title: step.title,
      note: typeof step.note === "string" ? step.note : "",
      internalNote: typeof step.internalNote === "string" ? step.internalNote : "",
      trackIds: Array.isArray(step.trackIds)
        ? step.trackIds.filter((id): id is string => typeof id === "string" && id.length > 0)
        : [],
      videoId: typeof step.videoId === "string" ? step.videoId : null,
    }));
  return steps.length ? { steps } : null;
}

/** Guest invitation timeline — omit desk-only fields. */
export function publicProgramState(state: ProgramState): ProgramState {
  return {
    steps: state.steps.map((step) => ({
      id: step.id,
      title: step.title,
      note: step.note,
      internalNote: "",
      trackIds: step.trackIds,
      videoId: step.videoId,
    })),
  };
}

export async function handleProgram(
  request: Request,
  store: ProgramStore,
  adminPin: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/program" && request.method === "GET") {
    try {
      const data = await store.read();
      if (!data) return json({ steps: [] });
      const parsed = parseProgramState(data);
      if (!parsed) return json({ steps: [] });
      return json(publicProgramState(parsed));
    } catch {
      return json({ error: "Could not load the program." }, 500);
    }
  }

  if (path === "/api/admin/program") {
    if (!adminPin || request.headers.get("x-admin-pin") !== adminPin) {
      return json(
        { error: adminPin ? "That PIN is not correct." : "The admin PIN is not configured." },
        adminPin ? 401 : 503,
      );
    }
    if (request.method === "GET") {
      try {
        const data = await store.read();
        if (!data) return json({ steps: [] });
        const parsed = parseProgramState(data);
        if (!parsed) return json({ steps: [] });
        return json(parsed);
      } catch {
        return json({ error: "Could not load the program." }, 500);
      }
    }
    if (request.method === "PUT") {
      try {
        const body = await request.json();
        const parsed = parseProgramState(body);
        if (!parsed) return json({ error: "Invalid program data." }, 400);
        await store.write(parsed);
        return json({ ok: true });
      } catch {
        return json({ error: "Could not save the program." }, 500);
      }
    }
  }

  return null;
}
