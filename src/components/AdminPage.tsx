import { useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_PIN_KEY } from "../attendance/session";
import { ADMIN_ROLES, GUEST_SLOTS, ROLE_LABEL, TABLE_COUNT, slotsFor, type AttendanceStatus, type Guest, type Role } from "../attendance/types";

interface AdminGuest extends Guest {
  response: { status: AttendanceStatus; reason: string; updatedAt: string; submittedByGuestId: string } | null;
  submittedByName: string;
}

interface Row {
  id: string;
  fullName: string;
  familyLabel: string;
  table: string;
  chair: string;
}

interface SeatChoice {
  role: Role;
  index: number;
  fullName: string;
  table: string;
  chair: string;
}

const GUEST_START = 10;

const blankRow = (): Row => ({ id: "", fullName: "", familyLabel: "", table: "", chair: "" });

const emptyRows = (guestSlots = GUEST_START): Record<Role, Row[]> => Object.fromEntries(
  ADMIN_ROLES.map((role) => [role, Array.from({ length: role === "guests" ? guestSlots : slotsFor(role) }, blankRow)]),
) as Record<Role, Row[]>;

function stampIds(current: Record<Role, Row[]>, sent: Record<Role, Row[]>, saved: Guest[]): Record<Role, Row[]> {
  let cursor = 0;
  const next = { ...current };
  for (const role of ADMIN_ROLES) {
    next[role] = current[role].map((row, index) => {
      const sentRow = sent[role]?.[index];
      if (!sentRow?.fullName.trim()) {
        return row.fullName.trim() ? row : { ...row, id: "" };
      }
      const match = saved[cursor++];
      return match ? { ...row, id: match.id } : row;
    });
  }
  return next;
}

function answerLabel(status: AttendanceStatus | undefined): string {
  if (status === "joining") return "Joining";
  if (status === "not_joining") return "Not-Joining";
  if (status === "undecided") return "Undecided";
  return "";
}

function takenChairs(rows: Record<Role, Row[]>, tableNumber: number): Map<number, string> {
  const taken = new Map<number, string>();
  for (const role of ADMIN_ROLES) {
    for (const row of rows[role]) {
      const name = row.fullName.trim();
      const table = Number(row.table);
      const number = Number(row.chair);
      if (!name || table !== tableNumber || !Number.isInteger(number) || number < 1 || taken.has(number)) continue;
      taken.set(number, name);
    }
  }
  return taken;
}

function ChairCircle({ rows, tableNumber, size, onPick }: { rows: Record<Role, Row[]>; tableNumber: number; size: number; onPick: (chair: number) => void }) {
  const taken = takenChairs(rows, tableNumber);
  const chairs = Array.from({ length: size }, (_, index) => index + 1);

  return (
    <div className="mt-8">
      <h2 className="font-cinzel text-xs tracking-[0.18em] uppercase text-[#f09060] text-center">Table {tableNumber}</h2>
      <p className="text-center font-garamond text-sm text-[#f0d2b0] mt-1">Tap an open chair to choose who sits there.</p>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[420px]">
        <div className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f09060]/25" />
        {chairs.map((number, index) => {
          const angle = (index / size) * Math.PI * 2 - Math.PI / 2;
          const name = taken.get(number) ?? "";
          const occupied = name.length > 0;
          const place = {
            left: `${50 + Math.cos(angle) * 42}%`,
            top: `${50 + Math.sin(angle) * 42}%`,
            transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI + 90}deg)`,
          };
          const seat = (
            <svg viewBox="0 0 48 56" className="h-9 w-8" aria-hidden="true">
              <path
                d="M12 6h24a6 6 0 0 1 6 6v12a10 10 0 0 1-10 10H16A10 10 0 0 1 6 24V12a6 6 0 0 1 6-6z"
                fill={occupied ? "#f09060" : "none"}
                stroke="#f09060"
                strokeWidth="2"
              />
              <ellipse cx="24" cy="38" rx="16" ry="6" fill={occupied ? "#f09060" : "#07182e"} stroke="#f09060" strokeWidth="2" />
              <path d="M16 42v10M32 42v10" stroke="#f09060" strokeWidth="2" strokeLinecap="round" />
              <text
                x="24"
                y="40"
                textAnchor="middle"
                fill={occupied ? "#07182e" : "#f6f0e6"}
                fontFamily="Cinzel, serif"
                fontSize="9"
                transform={`rotate(${-((angle * 180) / Math.PI + 90)} 24 38)`}
              >
                {number}
              </text>
            </svg>
          );
          if (!occupied) {
            return (
              <button
                key={number}
                type="button"
                title={`Chair no. ${number} is open`}
                aria-label={`Choose a guest for chair no. ${number}`}
                onClick={() => onPick(number)}
                className="absolute flex w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center"
                style={place}
              >
                {seat}
              </button>
            );
          }
          return (
            <div
              key={number}
              title={`Chair no. ${number} · ${name}`}
              className="absolute flex w-9 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={place}
            >
              {seat}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem(ADMIN_PIN_KEY) ?? "");
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState<Record<Role, Row[]>>(emptyRows);
  const [tables, setTables] = useState<number[]>(() => Array.from({ length: TABLE_COUNT }, () => 8));
  const [selectedTable, setSelectedTable] = useState(1);
  const [view, setView] = useState<"roles" | "tables">("roles");
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [message, setMessage] = useState("");
  const [seatPick, setSeatPick] = useState<{ table: number; chair: number } | null>(null);
  const [seatQuery, setSeatQuery] = useState("");
  const rowsRef = useRef(rows);
  const tablesRef = useRef(tables);
  const saveTimer = useRef<number | null>(null);
  const saveMessage = useRef("Saved.");
  const saveFlight = useRef(false);
  const saveDirty = useRef(false);

  const load = async (nextPin: string) => {
    const response = await fetch("/api/admin/roster", { headers: { "x-admin-pin": nextPin } });
    const body = await response.json() as { guests?: AdminGuest[]; tables?: number[]; error?: string };
    if (!response.ok) {
      setUnlocked(false);
      setMessage(body.error ?? "That PIN is not correct.");
      return;
    }
    sessionStorage.setItem(ADMIN_PIN_KEY, nextPin);
    setPin(nextPin);
    setUnlocked(true);
    setMessage("");
    const nextGuests = body.guests ?? [];
    const namedGuests = nextGuests.filter((guest) => guest.role === "guests").length;
    const loaded = emptyRows(Math.max(GUEST_START, namedGuests));
    for (const guest of nextGuests) {
      const slot = loaded[guest.role].find((row) => !row.fullName);
      if (!slot) continue;
      slot.id = guest.id;
      slot.fullName = guest.fullName;
      slot.familyLabel = guest.familyLabel;
      slot.table = guest.tableNumber ? String(guest.tableNumber) : "";
      slot.chair = guest.chairNumber ? String(guest.chairNumber) : "";
    }
    rowsRef.current = loaded;
    setRows(loaded);
    const nextTables = body.tables?.length === TABLE_COUNT ? body.tables.map((size) => (size === 10 ? 10 : 8)) : Array.from({ length: TABLE_COUNT }, () => 8);
    tablesRef.current = nextTables;
    setTables(nextTables);
    setGuests(nextGuests);
  };

  const saveRows = async (sourceRows: Record<Role, Row[]>, sourceTables: number[], doneMessage = "Saved.") => {
    const used = new Set<string>();
    const payload = [];
    for (const role of ADMIN_ROLES) {
      for (const row of sourceRows[role]) {
        const tableText = row.table.trim();
        const chairText = row.chair.trim();
        const tableNumber = tableText === "" ? null : Number(tableText);
        const chairNumber = chairText === "" ? null : Number(chairText);
        if ((tableNumber == null) !== (chairNumber == null)) {
          setMessage("Each seat needs both a table and a chair.");
          return;
        }
        if (tableNumber != null && (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > TABLE_COUNT)) {
          setMessage(`Choose a table from 1 to ${TABLE_COUNT}.`);
          return;
        }
        const chairLimit = tableNumber == null ? 10 : sourceTables[tableNumber - 1];
        if (chairNumber != null && (!Number.isInteger(chairNumber) || chairNumber < 1 || chairNumber > chairLimit)) {
          setMessage(`Table ${tableNumber} has chairs 1 to ${chairLimit}.`);
          return;
        }
        if (tableNumber != null && chairNumber != null) {
          const seat = `${tableNumber}-${chairNumber}`;
          if (used.has(seat)) {
            setMessage(`Table ${tableNumber}, chair ${chairNumber} is already taken.`);
            return;
          }
          used.add(seat);
        }
        payload.push({ id: row.id, fullName: row.fullName, familyLabel: row.familyLabel, role, tableNumber, chairNumber });
      }
    }
    const response = await fetch("/api/admin/roster", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ rows: payload, tables: sourceTables }),
    });
    const body = await response.json() as { error?: string; guests?: Guest[] };
    if (!response.ok) {
      setMessage(body.error ?? "The names could not be saved.");
      return;
    }
    const stamped = stampIds(rowsRef.current, sourceRows, body.guests ?? []);
    rowsRef.current = stamped;
    setRows(stamped);
    setMessage(doneMessage);
  };

  const flushSave = () => {
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (saveFlight.current) {
      saveDirty.current = true;
      return;
    }
    saveDirty.current = false;
    saveFlight.current = true;
    const sourceRows = rowsRef.current;
    const sourceTables = tablesRef.current;
    const doneMessage = saveMessage.current;
    void saveRows(sourceRows, sourceTables, doneMessage).catch(() => {
      setMessage("The names could not be saved.");
    }).finally(() => {
      saveFlight.current = false;
      if (!saveDirty.current) return;
      saveMessage.current = "Saved.";
      flushSave();
    });
  };

  const scheduleSave = (doneMessage = "Saved.") => {
    saveMessage.current = doneMessage;
    saveDirty.current = true;
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushSave, 500);
  };

  const editRows = (recipe: (current: Record<Role, Row[]>) => Record<Role, Row[]>) => {
    const next = recipe(rowsRef.current);
    rowsRef.current = next;
    setRows(next);
    scheduleSave();
  };

  const addGuest = () => {
    const current = rowsRef.current;
    if (current.guests.length >= GUEST_SLOTS) {
      setMessage(`The guest list can hold ${GUEST_SLOTS} names.`);
      return;
    }
    const next = { ...current, guests: [...current.guests, blankRow()] };
    rowsRef.current = next;
    setRows(next);
    setMessage("");
  };

  useEffect(() => {
    if (pin) void load(pin);
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const answers = useMemo(() => {
    const map = new Map<string, AdminGuest["response"]>();
    for (const guest of guests) map.set(guest.id, guest.response);
    return map;
  }, [guests]);

  const seatChoices = useMemo(() => {
    const choices: SeatChoice[] = [];
    for (const role of ADMIN_ROLES) {
      rows[role].forEach((row, index) => {
        const fullName = row.fullName.trim();
        if (!fullName) return;
        choices.push({ role, index, fullName, table: row.table.trim(), chair: row.chair.trim() });
      });
    }
    choices.sort((a, b) => a.fullName.localeCompare(b.fullName) || ROLE_LABEL[a.role].localeCompare(ROLE_LABEL[b.role]));
    return choices;
  }, [rows]);

  const visibleChoices = seatChoices.filter((choice) => choice.fullName.toLowerCase().includes(seatQuery.trim().toLowerCase()));

  const seatedHere = useMemo(() => {
    const people: { role: Role; index: number; chair: number; fullName: string; familyLabel: string; id: string }[] = [];
    for (const role of ADMIN_ROLES) {
      rows[role].forEach((row, index) => {
        const fullName = row.fullName.trim();
        const chair = Number(row.chair);
        if (!fullName || Number(row.table) !== selectedTable || !Number.isInteger(chair)) return;
        people.push({ role, index, chair, fullName, familyLabel: row.familyLabel.trim(), id: row.id });
      });
    }
    people.sort((a, b) => a.chair - b.chair || a.fullName.localeCompare(b.fullName));
    return people;
  }, [rows, selectedTable]);

  const assignSeat = (choice: SeatChoice) => {
    if (!seatPick) return;
    const nextRows = {
      ...rows,
      [choice.role]: rows[choice.role].map((item, index) => index === choice.index
        ? { ...item, table: String(seatPick.table), chair: String(seatPick.chair) }
        : item),
    };
    const { table, chair } = seatPick;
    rowsRef.current = nextRows;
    setRows(nextRows);
    setSeatPick(null);
    setSeatQuery("");
    saveMessage.current = `${choice.fullName} is seated at table ${table}, chair no. ${chair}.`;
    saveDirty.current = true;
    flushSave();
  };

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-[#07182e] text-[#f6f0e6] px-6 py-16">
        <form
          className="max-w-sm mx-auto"
          onSubmit={(event) => {
            event.preventDefault();
            const field = new FormData(event.currentTarget).get("pin");
            load(String(field ?? ""));
          }}
        >
          <h1 className="font-playfair text-3xl text-[#f09060] italic text-center">Invitation list</h1>
          <label className="block mt-8 font-cinzel text-[10px] tracking-[0.18em] uppercase text-[#f0d2b0]">Admin PIN</label>
          <input name="pin" type="password" className="mt-2 w-full rounded-lg border border-[#f09060]/50 bg-[#0c2340] px-3 py-2 outline-none" />
          {message && <p className="mt-3 font-garamond text-sm text-[#f09060]">{message}</p>}
          <button className="mt-4 w-full rounded-full bg-[#f09060] py-3 font-cinzel text-xs uppercase tracking-widest text-[#07182e]">Open</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07182e] text-[#f6f0e6] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-playfair text-3xl text-[#f09060] italic text-center">Invitation list</h1>
        <p className="text-center font-garamond text-sm text-[#f0d2b0] mt-2">Give people the same family label when one of them should answer for the others. Each guest can have one table number and chair number. Changes save on their own.</p>
        <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Invitation list view">
          {([["roles", "Per role"], ["tables", "Per table"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`rounded-full px-5 py-2 font-cinzel text-xs uppercase tracking-widest ${view === id ? "bg-[#f09060] text-[#07182e]" : "border border-[#f09060]/50 text-[#f09060]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "tables" && (
        <>
        <div className="mt-8 flex flex-col items-center gap-3">
          <label className="font-cinzel text-[10px] tracking-[0.18em] uppercase text-[#f0d2b0]">
            Table
            <select
              value={selectedTable}
              onChange={(event) => setSelectedTable(Number(event.target.value))}
              className="mt-2 block w-48 rounded-lg border border-[#f09060]/50 bg-[#0c2340] px-3 py-2 font-garamond text-base normal-case tracking-normal text-[#f6f0e6] outline-none"
            >
              {tables.map((_, index) => (
                <option key={index} value={index + 1}>Table {index + 1}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            {[8, 10].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  if (size === 8 && ADMIN_ROLES.some((role) => rowsRef.current[role].some((row) => Number(row.table) === selectedTable && Number(row.chair) > 8 && row.fullName.trim()))) {
                    setMessage(`Table ${selectedTable} still has someone in chair 9 or 10.`);
                    return;
                  }
                  setMessage("");
                  const nextTables = tablesRef.current.map((item, index) => index === selectedTable - 1 ? size : item);
                  tablesRef.current = nextTables;
                  setTables(nextTables);
                  saveMessage.current = "Saved.";
                  saveDirty.current = true;
                  flushSave();
                }}
                className={`rounded-full px-4 py-2 font-cinzel text-[10px] uppercase tracking-widest ${tables[selectedTable - 1] === size ? "bg-[#f09060] text-[#07182e]" : "border border-[#f09060]/50 text-[#f09060]"}`}
              >
                {size} chairs
              </button>
            ))}
          </div>
        </div>
        <ChairCircle
          rows={rows}
          tableNumber={selectedTable}
          size={tables[selectedTable - 1] ?? 8}
          onPick={(chair) => {
            setSeatQuery("");
            setSeatPick({ table: selectedTable, chair });
          }}
        />
        <section className="mt-8">
          <h2 className="font-cinzel text-xs tracking-[0.18em] uppercase text-[#f09060] mb-3">Seated at table {selectedTable}</h2>
          {seatedHere.length === 0 && <p className="font-garamond text-sm text-[#f0d2b0]">No one is seated here yet.</p>}
          <ul className="space-y-2">
            {seatedHere.map((person) => {
              const response = person.id ? answers.get(person.id) ?? null : null;
              const answer = answerLabel(response?.status);
              return (
                <li key={`${person.role}-${person.index}`} className="rounded-lg border border-[#f09060]/25 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-garamond text-base text-[#f6f0e6]">{person.fullName}</p>
                    <p className="shrink-0 font-cinzel text-[10px] uppercase tracking-[0.14em] text-[#f09060]">Chair no. {person.chair}</p>
                  </div>
                  <p className="mt-0.5 font-cinzel text-[10px] uppercase tracking-[0.14em] text-[#f0d2b0]">
                    {ROLE_LABEL[person.role]}
                    {person.familyLabel ? ` · ${person.familyLabel}` : ""}
                    {answer ? ` · ${answer}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
        </>
        )}
        {view === "roles" && ADMIN_ROLES.map((role) => (
          <section key={role} className="mt-8">
            <h2 className="font-cinzel text-xs tracking-[0.18em] uppercase text-[#f09060] mb-3">{role === "guests" ? "Guests" : ROLE_LABEL[role]}</h2>
            <div className="mb-1 hidden gap-2 font-cinzel text-[10px] uppercase tracking-[0.14em] text-[#f0d2b0] sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_4rem_4rem_8.5rem]">
              <span>Name</span>
              <span>Family</span>
              <span>Table</span>
              <span>Chair no.</span>
              <span>Answer</span>
            </div>
            <div className="space-y-2">
              {rows[role].map((row, index) => {
                const response = row.id ? answers.get(row.id) ?? null : null;
                const answer = answerLabel(response?.status);
                return (
                <div key={`${role}-${index}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_4rem_4rem_8.5rem] gap-2">
                  <input
                    value={row.fullName}
                    placeholder="Name"
                    onChange={(event) => editRows((current) => ({
                      ...current,
                      [role]: current[role].map((item, itemIndex) => itemIndex === index ? { ...item, fullName: event.target.value } : item),
                    }))}
                    className="rounded-lg border border-[#f09060]/35 bg-[#0c2340] px-3 py-2 font-garamond outline-none"
                  />
                  <input
                    value={row.familyLabel}
                    placeholder="Family label"
                    onChange={(event) => editRows((current) => ({
                      ...current,
                      [role]: current[role].map((item, itemIndex) => itemIndex === index ? { ...item, familyLabel: event.target.value } : item),
                    }))}
                    className="rounded-lg border border-[#f09060]/35 bg-[#0c2340] px-3 py-2 font-garamond outline-none"
                  />
                  <input
                    value={row.table}
                    inputMode="numeric"
                    placeholder="Table"
                    onChange={(event) => editRows((current) => ({
                      ...current,
                      [role]: current[role].map((item, itemIndex) => itemIndex === index ? { ...item, table: event.target.value.replace(/[^\d]/g, "") } : item),
                    }))}
                    className="rounded-lg border border-[#f09060]/35 bg-[#0c2340] px-3 py-2 font-garamond outline-none"
                  />
                  <input
                    value={row.chair}
                    inputMode="numeric"
                    placeholder="No."
                    onChange={(event) => editRows((current) => ({
                      ...current,
                      [role]: current[role].map((item, itemIndex) => itemIndex === index ? { ...item, chair: event.target.value.replace(/[^\d]/g, "") } : item),
                    }))}
                    className="rounded-lg border border-[#f09060]/35 bg-[#0c2340] px-3 py-2 font-garamond outline-none"
                  />
                  <div className="flex min-h-10 items-center rounded-lg border border-[#f09060]/20 px-3 py-2 font-garamond text-sm text-[#f6f0e6]">
                    {answer && (
                      <span>
                        <span className="whitespace-nowrap">{answer}</span>
                        {response?.status === "not_joining" && response.reason && (
                          <span className="mt-0.5 block text-xs text-[#f0d2b0]">{response.reason}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
            {role === "guests" && (
              <button
                type="button"
                onClick={addGuest}
                className="mt-3 rounded-full border border-[#f09060]/50 px-4 py-2 font-cinzel text-[10px] uppercase tracking-widest text-[#f09060]"
              >
                + Add more guest
              </button>
            )}
          </section>
        ))}
        {message && <p className="mt-4 font-garamond text-[#f0d2b0]">{message}</p>}
        {seatPick && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#06101c]/75 p-4 sm:items-center" onClick={() => setSeatPick(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="seat-picker-title"
              className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-[#f09060]/40 bg-[#07182e] p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="seat-picker-title" className="font-playfair text-2xl italic text-[#f09060]">Table {seatPick.table} · Chair no. {seatPick.chair}</h2>
              <p className="mt-1 font-garamond text-sm text-[#f0d2b0]">Choose who sits here.</p>
              <input
                value={seatQuery}
                autoFocus
                placeholder="Search a name"
                onChange={(event) => setSeatQuery(event.target.value)}
                className="mt-4 w-full rounded-lg border border-[#f09060]/50 bg-[#0c2340] px-3 py-2 font-garamond text-base text-[#f6f0e6] outline-none placeholder:text-[#f0d2b0]/50"
              />
              <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
                {visibleChoices.length === 0 && <p className="py-4 text-center font-garamond text-sm text-[#f0d2b0]">No names match.</p>}
                {visibleChoices.map((choice) => (
                  <button
                    key={`${choice.role}-${choice.index}`}
                    type="button"
                    onClick={() => assignSeat(choice)}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#163056]"
                  >
                    <span className="block font-garamond text-base text-[#f6f0e6]">{choice.fullName}</span>
                    <span className="block font-cinzel text-[10px] uppercase tracking-[0.14em] text-[#f09060]">
                      {ROLE_LABEL[choice.role]}
                      {choice.table && choice.chair ? ` · Table ${choice.table} · Chair no. ${choice.chair}` : ""}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSeatPick(null)} className="mt-4 w-full rounded-full border border-[#f09060]/50 py-2.5 font-cinzel text-xs uppercase tracking-widest text-[#f09060]">Close</button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
