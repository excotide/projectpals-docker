export function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const AVATAR_COLORS = [
  "#2d4a6b",
  "#3d2d5a",
  "#2d4535",
  "#4a2d2d",
  "#2d3d4a",
  "#3a2d4a",
];

export function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export const ROLE_COLORS = [
  { badge: "border border-cyan-400 text-cyan-400 bg-cyan-400/10",         avatar: "bg-cyan-500/20 text-cyan-300" },
  { badge: "border border-emerald-400 text-emerald-400 bg-emerald-400/10", avatar: "bg-emerald-500/20 text-emerald-300" },
  { badge: "border border-violet-400 text-violet-400 bg-violet-400/10",    avatar: "bg-violet-500/20 text-violet-300" },
  { badge: "border border-amber-400 text-amber-400 bg-amber-400/10",       avatar: "bg-amber-500/20 text-amber-300" },
  { badge: "border border-pink-400 text-pink-400 bg-pink-400/10",          avatar: "bg-pink-500/20 text-pink-300" },
  { badge: "border border-orange-400 text-orange-400 bg-orange-400/10",    avatar: "bg-orange-500/20 text-orange-300" },
];

export function getRoleColor(role: string | null | undefined, allRoles: string[]) {
  const idx = role ? allRoles.indexOf(role) : -1;
  return ROLE_COLORS[(idx >= 0 ? idx : allRoles.length) % ROLE_COLORS.length];
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = MONTHS_ID[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

export function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = MONTHS_ID[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${hh}:${mm}`;
}

export type ProjectStatusVariant = "running" | "late" | "done" | "doneLate";

export function computeProjectStatus(
  deadlineIso: string | null | undefined,
  finishedAtIso: string | null | undefined,
): { label: string; variant: ProjectStatusVariant } {
  const deadline = deadlineIso ? new Date(deadlineIso) : null;
  const finishedAt = finishedAtIso ? new Date(finishedAtIso) : null;
  if (finishedAt) {
    if (deadline && finishedAt.getTime() > deadline.getTime()) {
      return { label: "Selesai Terlambat", variant: "doneLate" };
    }
    return { label: "Selesai", variant: "done" };
  }
  if (deadline && Date.now() > deadline.getTime()) {
    return { label: "Terlambat", variant: "late" };
  }
  return { label: "Berjalan", variant: "running" };
}

export type TargetStatusVariant = "late" | "doneLate" | null;

export function computeTargetStatus(
  deadlineIso: string | null | undefined,
  completedAtIso: string | null | undefined,
  isDone: boolean,
): { label: string | null; variant: TargetStatusVariant } {
  if (!deadlineIso) return { label: null, variant: null };
  const deadline = new Date(deadlineIso);
  if (isDone) {
    const completed = completedAtIso ? new Date(completedAtIso) : null;
    if (completed && completed.getTime() > deadline.getTime()) {
      return { label: "Selesai Terlambat", variant: "doneLate" };
    }
    return { label: null, variant: null };
  }
  if (Date.now() > deadline.getTime()) {
    return { label: "Terlambat", variant: "late" };
  }
  return { label: null, variant: null };
}

/**
 * Convert ISO datetime to value suitable for <input type="datetime-local">
 * (i.e. "YYYY-MM-DDTHH:MM" in local timezone).
 */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert datetime-local input value to ISO string (treat as local time).
 */
export function localInputToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
