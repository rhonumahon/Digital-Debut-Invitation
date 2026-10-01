import { getStore } from "@netlify/blobs";
import { handleAttendance } from "../../src/attendance/http";
import type { AttendanceData } from "../../src/attendance/types";

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

export default async function handler(request: Request) {
  const pin = process.env.ADMIN_PIN ?? "";
  return handleAttendance(request, blobStore, pin);
}

export const config = { path: "/api/*" };
