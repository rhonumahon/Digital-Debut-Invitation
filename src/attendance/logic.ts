import type { AttendanceData, AttendanceResponse, AttendanceStatus, FamilyMember, Guest, NameMatch, Role } from "./types";
import { ADMIN_ROLES, ROLES, TABLE_COUNT, slotsFor, type Role } from "./types";

const SEED_ROSES = [
  "Sensei Ruzzel Zehmer", "Shihan Allan Barcial", "Sensei Ryzal Pasay", "Xian Cantos",
  "Lance Angelo Rosales", "Calix Ardwayne Matibag", "Sherwin Marasigan", "Trihcson Corables",
  "Isiah Briones", "Ruben Briones", "Christian De Castro", "Kurt Rosales",
  "Albert Ponaya", "Ferdiemar Ponaya", "Jayward Briones", "Rhon Michael Umahon",
  "Edgardo Briones", "Jaypee Briones",
];

const SEED_BILLS = [
  "Milagros Ponaya", "Juvy Ponaya", "Rainier Von Ponaya", "Tessie Dimayuga",
  "Anicia Dimayuga", "Amie Magbuhos", "Marie Briones", "Aida Briones",
  "Marilyn Briones", "Chona Briones", "Bheng Pasno", "Susan Briones",
  "Lileth Aguado", "Shanne De Torres", "Ycel Hernandez", "Merissa Varona",
  "Lehmarq De Chavez", "Isaiah Gerard Catapang",
];

const SEED_TREASURES = [
  "Sensei Marlene Mendoza", "Shihan Cora Barcial", "Sensei Ryzal Pasay", "Xian Cantos",
  "Dayne Aguado", "Carl Adrian De torres", "Marc Neil Hernandez", "Florence Reveche",
  "Jayward Briones", "Aurora Zafra", "Minerva Umahon", "Ylessandra Robles",
  "Letty Ramos", "Connie Briones", "Rachelyn Umahon", "Vonpierre Ponaya",
  "Jilian Eriz Briones", "Reenalyn Umahon",
];

const SEED_GLAM = [
  "Myrene Fetalvero", "Mibeth Tan", "Marielle Tan", "Crisandra Nerisse Varona",
  "Ryza Pauline Zafra", "Micah Blay", "Yohan Umahon", "Mhiracle Serrano",
  "Yannah Herrera", "Aaron Villamor", "Jerhan Fallarcuna", "Zhaira Villanueva",
  "Clake Dimayuga", "Stephanie Alicpala", "John Daniel Almanzor", "Aldrich Martinez",
  "Eunica Macaraig", "Yin Delos Santos",
];

const SEED_WISHES = [
  "Edgardo Briones", "Shihan Cora Barcial", "Momshie Moi", "Momshie Erika",
  "Aldrich Martinez", "Connie Briones", "Nolaida Umahon", "Ronalyn Briones",
];

function seedGuests(names: string[], role: Role): Guest[] {
  return names.map((fullName) => ({
    id: crypto.randomUUID(),
    fullName,
    role,
    familyLabel: "",
    tableNumber: null,
    chairNumber: null,
  }));
}

export function emptyAttendance(): AttendanceData {
  return {
    guests: [
      ...seedGuests(SEED_ROSES, "roses"),
      ...seedGuests(SEED_BILLS, "bills"),
      ...seedGuests(SEED_TREASURES, "treasures"),
      ...seedGuests(SEED_GLAM, "glam"),
      ...seedGuests(SEED_WISHES, "wishes"),
    ],
    responses: [],
  };
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

function nameKey(fullName: string): string {
  return fullName.trim().toLowerCase().replace(/\s+/g, " ");
}

function roleRank(role: Role): number {
  const index = ADMIN_ROLES.indexOf(role);
  return index === -1 ? ADMIN_ROLES.length : index;
}

function sameNameGuests(data: AttendanceData, fullName: string): Guest[] {
  const key = nameKey(fullName);
  return data.guests.filter((guest) => nameKey(guest.fullName) === key);
}

export function lookupByFirstName(data: AttendanceData, query: string): NameMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const grouped = new Map<string, Guest[]>();
  for (const guest of data.guests) {
    const matches = guest.fullName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.startsWith(needle));
    if (!matches) continue;
    const key = nameKey(guest.fullName);
    grouped.set(key, [...(grouped.get(key) ?? []), guest]);
  }
  return [...grouped.values()].slice(0, 8).map((group) => {
    const sorted = [...group].sort((a, b) => roleRank(a.role) - roleRank(b.role));
    const primary = sorted[0];
    const seated = sorted.find((guest) => guest.tableNumber != null || guest.chairNumber != null) ?? primary;
    return {
      id: primary.id,
      fullName: primary.fullName,
      role: primary.role,
      tableNumber: seated.tableNumber ?? null,
      chairNumber: seated.chairNumber ?? null,
    };
  });
}

export function familyMembers(data: AttendanceData, guestId: string): Guest[] {
  const guest = data.guests.find((item) => item.id === guestId);
  if (!guest) return [];
  const label = guest.familyLabel.trim().toLowerCase();
  if (!label) return [guest];
  const members = data.guests.filter((item) => item.familyLabel.trim().toLowerCase() === label);
  return [guest, ...members.filter((item) => item.id !== guest.id)];
}

function household(data: AttendanceData, guestId: string): Guest[] {
  const family = familyMembers(data, guestId);
  if (family.length === 0) return [];
  const names = new Set(family.map((guest) => nameKey(guest.fullName)));
  return data.guests.filter((guest) => names.has(nameKey(guest.fullName)));
}

export function toFamilyView(data: AttendanceData, guestId: string): FamilyMember[] {
  const actor = data.guests.find((guest) => guest.id === guestId);
  const people = household(data, guestId);
  if (!actor || people.length === 0) return [];
  const groups = new Map<string, Guest[]>();
  for (const guest of people) {
    const key = nameKey(guest.fullName);
    groups.set(key, [...(groups.get(key) ?? []), guest]);
  }
  const ordered = [...groups.values()].sort((a, b) => {
    const aIsActor = a.some((guest) => nameKey(guest.fullName) === nameKey(actor.fullName));
    const bIsActor = b.some((guest) => nameKey(guest.fullName) === nameKey(actor.fullName));
    if (aIsActor === bIsActor) return 0;
    return aIsActor ? -1 : 1;
  });
  return ordered.map((group) => {
    const primary = group.find((guest) => guest.id === actor.id) ?? [...group].sort((a, b) => roleRank(a.role) - roleRank(b.role))[0];
    const seated = group.find((guest) => guest.tableNumber != null && guest.chairNumber != null) ?? primary;
    const saved = data.responses.find((item) => item.guestId === primary.id)
      ?? data.responses.find((item) => group.some((guest) => guest.id === item.guestId));
    return {
      id: primary.id,
      fullName: primary.fullName,
      role: primary.role,
      also: group
        .filter((guest) => guest.id !== primary.id)
        .sort((a, b) => roleRank(a.role) - roleRank(b.role))
        .map((guest) => ({ id: guest.id, role: guest.role })),
      tableNumber: seated.tableNumber ?? null,
      chairNumber: seated.chairNumber ?? null,
      response: saved ? { status: saved.status, reason: saved.reason } : null,
    };
  });
}

export function publicRoster(data: AttendanceData): Record<(typeof ROLES)[number], string[]> {
  return Object.fromEntries(
    ROLES.map((role) => [
      role,
      data.guests.filter((guest) => guest.role === role).map((guest) => guest.fullName),
    ]),
  ) as Record<(typeof ROLES)[number], string[]>;
}

export interface DecisionInput {
  guestId: string;
  status: AttendanceStatus;
  reason?: string;
}

export function saveDecisions(
  data: AttendanceData,
  actorId: string,
  decisions: DecisionInput[],
): { ok: true; data: AttendanceData } | { ok: false; error: string } {
  const allowed = new Set(household(data, actorId).map((guest) => guest.id));
  if (allowed.size === 0) return { ok: false, error: "That name is not on the invitation." };

  const covered = new Set<string>();
  for (const decision of decisions) {
    const person = data.guests.find((guest) => guest.id === decision.guestId);
    if (!person) continue;
    for (const guest of sameNameGuests(data, person.fullName)) {
      if (allowed.has(guest.id)) covered.add(guest.id);
    }
  }
  const nextResponses = data.responses.filter((item) => !covered.has(item.guestId));
  const updatedAt = new Date().toISOString();

  for (const decision of decisions) {
    if (!allowed.has(decision.guestId)) {
      return { ok: false, error: "You can only answer for your own family." };
    }
    const person = data.guests.find((guest) => guest.id === decision.guestId);
    if (!person) return { ok: false, error: "That name is not on the invitation." };
    const reason = (decision.reason ?? "").trim();
    if (decision.status === "not_joining" && !reason) {
      return { ok: false, error: "Please add a reason for anyone who is not joining." };
    }
    for (const guest of sameNameGuests(data, person.fullName)) {
      if (!allowed.has(guest.id)) continue;
      const record: AttendanceResponse = {
        guestId: guest.id,
        status: decision.status,
        reason: decision.status === "not_joining" ? reason : "",
        submittedByGuestId: actorId,
        updatedAt,
      };
      nextResponses.push(record);
    }
  }

  return { ok: true, data: { ...data, responses: nextResponses } };
}

export interface RosterRow {
  id: string;
  fullName: string;
  role: Role;
  familyLabel: string;
  tableNumber?: number | null;
  chairNumber?: number | null;
}

export function defaultTables(): number[] {
  return Array.from({ length: TABLE_COUNT }, () => 8);
}

export function normalizeTables(value: unknown): number[] {
  const tables = defaultTables();
  if (!Array.isArray(value)) return tables;
  return tables.map((size, index) => (value[index] === 10 ? 10 : size));
}

function seatNumber(value: number | null | undefined, limit: number): number | null | "invalid" {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1 || value > limit) return "invalid";
  return value;
}

export function replaceRoster(
  data: AttendanceData,
  rows: RosterRow[],
  tablesInput?: unknown,
): { ok: true; data: AttendanceData } | { ok: false; error: string } {
  const tables = normalizeTables(tablesInput ?? data.tables);
  const counts: Record<Role, number> = { roses: 0, fashion: 0, bills: 0, treasures: 0, glam: 0, wishes: 0, guests: 0 };
  const guests: Guest[] = [];
  const kept = new Set<string>();
  const usedSeats = new Set<string>();

  for (const row of rows) {
    const fullName = row.fullName.trim();
    if (!fullName) continue;
    if (!ADMIN_ROLES.includes(row.role)) return { ok: false, error: "Unknown role." };
    counts[row.role] += 1;
    const limit = slotsFor(row.role);
    if (counts[row.role] > limit) {
      return { ok: false, error: row.role === "guests" ? `The guest list can hold ${limit} names.` : `This list can hold ${limit} names.` };
    }
    const tableNumber = seatNumber(row.tableNumber, TABLE_COUNT);
    if (tableNumber === "invalid") return { ok: false, error: `Choose a table from 1 to ${TABLE_COUNT}.` };
    const chairLimit = tableNumber == null ? 10 : tables[tableNumber - 1];
    const chairNumber = seatNumber(row.chairNumber, chairLimit);
    if (chairNumber === "invalid") {
      return { ok: false, error: tableNumber == null ? "Add a table before the chair number." : `Table ${tableNumber} has chairs 1 to ${chairLimit}.` };
    }
    if ((tableNumber == null) !== (chairNumber == null)) {
      return { ok: false, error: "Each seat needs both a table and a chair." };
    }
    if (tableNumber != null && chairNumber != null) {
      const seat = `${tableNumber}-${chairNumber}`;
      if (usedSeats.has(seat)) return { ok: false, error: `Table ${tableNumber}, chair ${chairNumber} is already taken.` };
      usedSeats.add(seat);
    }
    const existing = row.id ? data.guests.find((guest) => guest.id === row.id) : undefined;
    const id = existing?.id ?? crypto.randomUUID();
    kept.add(id);
    guests.push({
      id,
      fullName,
      role: row.role,
      familyLabel: row.familyLabel.trim(),
      tableNumber,
      chairNumber,
    });
  }

  return {
    ok: true,
    data: {
      guests,
      responses: data.responses.filter((item) => kept.has(item.guestId)),
      tables,
    },
  };
}
