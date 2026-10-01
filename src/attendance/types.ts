export const ROLES = ["roses", "fashion", "bills", "treasures", "glam", "wishes"] as const;

export const GUEST_ROLE = "guests" as const;

export const ADMIN_ROLES = [...ROLES, GUEST_ROLE] as const;

export type TraditionRole = (typeof ROLES)[number];

export type Role = (typeof ADMIN_ROLES)[number];

export const GUEST_SLOTS = 80;

export const WISH_SLOTS = 8;

export const ROLE_LABEL: Record<Role, string> = {
  roses: "18 Roses",
  fashion: "18 Fashion Pieces",
  bills: "18 Bills",
  treasures: "18 Treasures",
  glam: "18 Glam",
  wishes: "Special Messages & Wishes",
  guests: "Guest",
};

export function slotsFor(role: Role): number {
  if (role === GUEST_ROLE) return GUEST_SLOTS;
  if (role === "wishes") return WISH_SLOTS;
  return 18;
}

export const TABLE_COUNT = 14;

export interface Guest {
  id: string;
  fullName: string;
  role: Role;
  familyLabel: string;
  tableNumber: number | null;
  chairNumber: number | null;
}

export type AttendanceStatus = "joining" | "not_joining" | "undecided";

export interface AttendanceResponse {
  guestId: string;
  status: AttendanceStatus;
  reason: string;
  submittedByGuestId: string;
  updatedAt: string;
}

export interface AttendanceData {
  guests: Guest[];
  responses: AttendanceResponse[];
  tables?: number[];
}

export interface FamilyMember {
  id: string;
  fullName: string;
  role: Role;
  also: { id: string; role: Role }[];
  tableNumber: number | null;
  chairNumber: number | null;
  response: Pick<AttendanceResponse, "status" | "reason"> | null;
}

export interface NameMatch {
  id: string;
  fullName: string;
  role: Role;
  tableNumber: number | null;
  chairNumber: number | null;
}
