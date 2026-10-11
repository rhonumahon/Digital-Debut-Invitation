import { getStore } from "@netlify/blobs";
import { handleAttendance } from "../../src/attendance/http";
import type { AttendanceData } from "../../src/attendance/types";
import { handleProgram } from "../../src/program/programHttp";
import type { ProgramState } from "../../src/program/types";

const blobStore = {
  async read() {
    const store = getStore("attendance");
    return store.get("roster", { type: "json" }) as Promise<AttendanceData | null>;
  },
  async write(data: AttendanceData) {
    const store = getStore("attendance");
    await store.setJSON("roster", data);
  },
};

const programStore = {
  async read() {
    const store = getStore("program");
    return store.get("timeline", { type: "json" }) as Promise<ProgramState | null>;
  },
  async write(data: ProgramState) {
    const store = getStore("program");
    await store.setJSON("timeline", data);
  },
};

export default async function handler(request: Request) {
  const pin = process.env.ADMIN_PIN ?? "";
  const programResponse = await handleProgram(request, programStore, pin);
  if (programResponse) return programResponse;
  return handleAttendance(request, blobStore, pin);
}

export const config = { path: "/api/*" };
