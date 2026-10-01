import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AttendanceData } from "./types";
import type { AttendanceStore } from "./http";

export function createFileStore(filePath: string): AttendanceStore {
  return {
    async read() {
      try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw) as AttendanceData;
      } catch {
        return null;
      }
    },
    async write(data) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(data, null, 2));
    },
  };
}
