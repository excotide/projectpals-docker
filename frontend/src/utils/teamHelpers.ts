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
