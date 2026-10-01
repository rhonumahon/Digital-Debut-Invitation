import { emptyAttendance, lookupByFirstName, normalizeTables, publicRoster, replaceRoster, saveDecisions, toFamilyView } from "./logic";
import type { RosterRow } from "./logic";
import type { AttendanceData, AttendanceStatus, Role } from "./types";

export interface AttendanceStore {
  read(): Promise<AttendanceData | null>;
  write(data: AttendanceData): Promise<void>;
}

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function load(store: AttendanceStore): Promise<AttendanceData> {
  const existing = await store.read();
  if (existing && Array.isArray(existing.guests) && Array.isArray(existing.responses)) return existing;
  const seeded = emptyAttendance();
  await store.write(seeded);
  return seeded;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isRole(value: string): value is Role {
  return value === "roses" || value === "fashion" || value === "bills" || value === "treasures" || value === "glam" || value === "wishes" || value === "guests";
}

export async function handleAttendance(request: Request, store: AttendanceStore, adminPin: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (request.method === "GET" && path === "/api/roster") {
      const data = await load(store);
      return json(publicRoster(data));
    }

    if (request.method === "GET" && path === "/api/lookup") {
      const data = await load(store);
      return json({ matches: lookupByFirstName(data, url.searchParams.get("first") ?? "") });
    }

    if (request.method === "GET" && path === "/api/family") {
      const guestId = url.searchParams.get("guestId") ?? "";
      const data = await load(store);
      const members = toFamilyView(data, guestId);
      if (members.length === 0) return json({ error: "That name is not on the invitation." }, 404);
      return json({ actor: members[0], members });
    }

    if (request.method === "POST" && path === "/api/responses") {
      const body = await request.json() as { guestId?: string; decisions?: { guestId?: string; status?: string; reason?: string }[] };
      if (!body.guestId || !Array.isArray(body.decisions)) return json({ error: "Missing answers." }, 400);
      const isStatus = (value: string | undefined): value is AttendanceStatus =>
        value === "joining" || value === "not_joining" || value === "undecided";
      if (body.decisions.some((item) => !isStatus(item.status))) {
        return json({ error: "Please choose joining, not joining, or decide later." }, 400);
      }
      const decisions = body.decisions.map((item) => ({
        guestId: item.guestId ?? "",
        status: item.status as AttendanceStatus,
        reason: item.reason ?? "",
      }));
      return withLock(async () => {
        const data = await load(store);
        const saved = saveDecisions(data, body.guestId!, decisions);
        if (saved.ok === false) return json({ error: saved.error }, 400);
        await store.write(saved.data);
        return json({ members: toFamilyView(saved.data, body.guestId!) });
      });
    }

    if (path === "/api/admin/roster") {
      if (!adminPin || request.headers.get("x-admin-pin") !== adminPin) {
        return json({ error: adminPin ? "That PIN is not correct." : "The admin PIN is not configured." }, adminPin ? 401 : 503);
      }
      if (request.method === "GET") {
        const data = await load(store);
        return json({
          tables: normalizeTables(data.tables),
          guests: data.guests.map((guest) => ({
            ...guest,
            response: data.responses.find((item) => item.guestId === guest.id) ?? null,
            submittedByName: data.guests.find((item) => item.id === data.responses.find((response) => response.guestId === guest.id)?.submittedByGuestId)?.fullName ?? "",
          })),
        });
      }
      if (request.method === "PUT") {
        const body = await request.json() as { rows?: RosterRow[]; tables?: number[] };
        if (!Array.isArray(body.rows)) return json({ error: "Missing names." }, 400);
        const rows = body.rows.filter((row) => row && isRole(row.role));
        return withLock(async () => {
          const data = await load(store);
          const saved = replaceRoster(data, rows, body.tables);
          if (saved.ok === false) return json({ error: saved.error }, 400);
          await store.write(saved.data);
          return json({ ok: true, guests: saved.data.guests });
        });
      }
    }

    return json({ error: "Not found." }, 404);
  } catch {
    return json({ error: "The invitation list could not be read." }, 500);
  }
}
