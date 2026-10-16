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

function isAttendanceData(value: unknown): value is AttendanceData {
  if (!value || typeof value !== "object") return false;
  const record = value as AttendanceData;
  return Array.isArray(record.guests) && Array.isArray(record.responses);
}

/** Read roster for public GET handlers — never seeds or overwrites blob storage. */
async function readAttendance(store: AttendanceStore): Promise<AttendanceData | null> {
  const attempts = 3;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const existing = await store.read();
      if (isAttendanceData(existing)) return existing;
    } catch {
      /* transient blob read — retry */
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 60 * (i + 1)));
    }
  }
  return null;
}

/** Load roster for writes; seeds only when storage is truly empty (inside mutation lock). */
async function loadForWrite(store: AttendanceStore): Promise<AttendanceData> {
  const existing = await store.read();
  if (isAttendanceData(existing)) return existing;
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
      const data = await readAttendance(store);
      if (!data) return json({ error: "The invitation list could not be read." }, 503);
      return json(publicRoster(data));
    }

    if (request.method === "GET" && path === "/api/lookup") {
      const data = await readAttendance(store);
      if (!data) return json({ matches: [], error: "The invitation list could not be read." }, 503);
      const query = url.searchParams.get("q") ?? url.searchParams.get("first") ?? "";
      return json({ matches: lookupByFirstName(data, query) });
    }

    if (request.method === "GET" && path === "/api/family") {
      const guestId = url.searchParams.get("guestId") ?? "";
      const data = await readAttendance(store);
      if (!data) return json({ error: "The invitation list could not be read." }, 503);
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
        const data = await loadForWrite(store);
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
        const data = await readAttendance(store);
        if (!data) return json({ error: "The invitation list could not be read." }, 503);
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
          const data = await loadForWrite(store);
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
