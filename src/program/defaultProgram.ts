import type { ProgramStep } from "./types";

/** First timeline segment — linked to invitation countdown on /program. */
export const WELCOME_PROGRAM_TITLE = "Welcome & Introduction";

export const DEFAULT_PROGRAM_STEPS: Omit<ProgramStep, "id" | "trackIds">[] = [
  { title: WELCOME_PROGRAM_TITLE, note: "" },
  { title: "Grand Entrance — Jaylyn", note: "Prayer, then a welcome speech by Daddy Ipe" },
  { title: "18 Roses", note: "" },
  { title: "18 Fashion Pieces", note: "" },
  { title: "Game 1", note: "A moment for guests to enjoy" },
  { title: "18 Glam", note: "" },
  { title: "18 Treasures", note: "" },
  { title: "Game 2", note: "Jaylyn changes from her ball gown into her dance outfit" },
  { title: "Jaylyn’s Production Number", note: "First performance" },
  { title: "18 Bills", note: "A short pause after the performance" },
  { title: "Game 3", note: "Costume change for the kata" },
  { title: "Jaylyn’s Kata Performance", note: "Second performance" },
  { title: "Dinner", note: "Around 7 PM. Jaylyn may change while guests dine" },
  { title: "Jaylyn’s Solo Song Number", note: "Third performance" },
  { title: "Intermission", note: "Tito Miko & Sandy" },
  { title: "Special Messages & Wishes", note: "Sei Cora, Moi & Erika, Aldrich, Mama, and Mommy" },
  { title: "Jaylyn’s Birthday Speech", note: "" },
  { title: "Cake Presentation", note: "" },
  { title: "Candle Blowing", note: "" },
  { title: "Final Photos & Closing", note: "" },
];
