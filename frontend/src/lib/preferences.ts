// Shared definitions for member preference selection (Productivity Windows &
// Work Environment), used by the Join flow and the owner-setup flow after
// creating a room. "flexible" is mutually exclusive — see lib/flexibleSelection.

export interface PreferenceSlot {
  id: string;
  short: string;
  name: string;
  range: string;
}

export const PRODUCTIVITY_SLOTS: PreferenceSlot[] = [
  { id: "mor", short: "AM",  name: "Morning",   range: "6AM – 12PM" },
  { id: "aft", short: "PM",  name: "Afternoon", range: "12PM – 6PM" },
  { id: "eve", short: "EVE", name: "Evening",   range: "6PM – 12AM" },
  { id: "fle", short: "ALL", name: "Flexible",  range: "Anytime"    },
];

export const TIME_FLEX = "fle";
export const TIME_REALS = ["mor", "aft", "eve"];

export const WORK_ENV_SLOTS: PreferenceSlot[] = [
  { id: "pri", short: "PRV", name: "Private",  range: "Tatap muka privat" },
  { id: "pub", short: "PUB", name: "Public",   range: "Ruang publik"      },
  { id: "onl", short: "ONL", name: "Online",   range: "Remote / daring"   },
  { id: "flx", short: "ALL", name: "Flexible", range: "Apa saja"          },
];

export const ENV_FLEX = "flx";
export const ENV_REALS = ["pri", "pub", "onl"];

export const toWindowValue = (id: string): string | null =>
  ({ mor: "morning", aft: "afternoon", eve: "evening", fle: "flexible" } as Record<string, string>)[id] ?? null;

export const toEnvValue = (id: string): string | null =>
  ({ pri: "private", pub: "public", onl: "online", flx: "flexible" } as Record<string, string>)[id] ?? null;
