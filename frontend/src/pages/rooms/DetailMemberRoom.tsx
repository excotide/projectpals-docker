import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import {
  useDeleteOrLeaveRoom,
  useJoinRoom,
  useRoomByCode,
  useRoomMembers,
  useRoomTeams,
  type RoomMemberItem,
} from "../../hooks/useRooms";
import { toggleFlexible } from "../../lib/flexibleSelection";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const AVATAR_COLORS = ["#2d4a6b", "#3d2d5a", "#2d4535", "#4a2d2d", "#2d3d4a", "#3a2d4a"];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Role color palette (cycles by index in room's role list)
const ROLE_PALETTE = [
  { bg: "rgba(0,229,255,0.08)",   border: "#00e5ff", text: "#00e5ff" },
  { bg: "rgba(99,179,237,0.10)",  border: "#63b3ed", text: "#63b3ed" },
  { bg: "rgba(167,139,250,0.10)", border: "#a78bfa", text: "#a78bfa" },
  { bg: "rgba(52,211,153,0.10)",  border: "#34d399", text: "#34d399" },
  { bg: "rgba(251,191,36,0.10)",  border: "#fbbf24", text: "#fbbf24" },
  { bg: "rgba(251,113,133,0.10)", border: "#fb7185", text: "#fb7185" },
];

function getRoleStyle(role: string | null | undefined, allRoles: string[]) {
  const idx = role ? allRoles.indexOf(role) : -1;
  return ROLE_PALETTE[(idx >= 0 ? idx : 0) % ROLE_PALETTE.length];
}

// Standard option sets (lowercase = API format). "flexible" is mutually exclusive.
const STANDARD_WINDOWS = ["morning", "afternoon", "evening", "flexible"];
const STANDARD_ENVS = ["private", "public", "online", "flexible"];
const WINDOW_REALS = ["morning", "afternoon", "evening"];
const ENV_REALS = ["private", "public", "online"];

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconInfo    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconSearch  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconUser    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>;
const IconEdit    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDoor    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>;
const IconX       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role, allRoles }: { role: string; allRoles: string[] }) {
  const c = getRoleStyle(role, allRoles);
  return (
    <span
      className="px-2.5 py-0.5 rounded-md text-xs whitespace-nowrap font-medium"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {role}
    </span>
  );
}

function MemberRow({ member, allRoles }: { member: RoomMemberItem; allRoles: string[] }) {
  const name  = member.user?.name ?? "Unknown";
  const color = getAvatarColor(name);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-pp-elevated border border-pp-border hover:border-blue-500/30 transition-all">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#c0cad8] shrink-0 border border-[#2a3340]"
        style={{ background: color }}
      >
        {getInitials(name)}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200 mb-1">{name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {member.primary_role && (
            <RoleBadge role={member.primary_role} allRoles={allRoles} />
          )}
          {member.backup_role && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-[11px] text-slate-500 border border-pp-border px-2 py-0.5 rounded-full">
                {member.backup_role}
              </span>
            </>
          )}
          {member.user?.username && (
            <span className="text-[11px] text-slate-600">{member.user.username}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  roomRoles,
  windowOptions,
  envOptions,
  initialPrimary,
  initialBackups,
  initialWindows,
  initialEnvironments,
  saving,
  error,
  onSave,
  onClose,
}: {
  roomRoles: string[];
  windowOptions: string[];
  envOptions: string[];
  initialPrimary: string;
  initialBackups: string[];
  initialWindows: string[];
  initialEnvironments: string[];
  saving: boolean;
  error: string;
  onSave: (primary: string, backups: string[], windows: string[], environments: string[]) => void;
  onClose: () => void;
}) {
  const [primary, setPrimary] = useState(initialPrimary);
  // All non-primary roles are pre-selected as backup
  const [backups,  setBackups]  = useState<string[]>(initialBackups);
  const [windows, setWindows]   = useState<string[]>(initialWindows);
  const [envs, setEnvs]         = useState<string[]>(initialEnvironments);

  // When primary changes, reset backups to all remaining roles
  const handlePrimaryChange = (role: string) => {
    setPrimary(role);
    setBackups(roomRoles.filter(r => r !== role));
  };

  const toggleBackup = (role: string) =>
    setBackups(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );

  const toggleWindow = (w: string) =>
    setWindows(prev => toggleFlexible(prev, w, { flex: "flexible", reals: WINDOW_REALS }));

  const toggleEnv = (e: string) =>
    setEnvs(prev => toggleFlexible(prev, e, { flex: "flexible", reals: ENV_REALS }));

  const remainingRoles = roomRoles.filter(r => r !== primary);
  // Backup required only when the room has more than one role
  const backupRequired  = remainingRoles.length > 0;
  const canSave =
    primary.trim().length > 0 &&
    (!backupRequired || backups.length > 0) &&
    windows.length > 0 &&
    envs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2530] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-400"><IconEdit /></span>
            <h3 className="text-base font-bold text-slate-100">Edit Your Profile in Room</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#4a5568] hover:text-slate-300 transition-colors p-1 border-none bg-transparent cursor-pointer rounded-lg hover:bg-white/5"
          >
            <IconX />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

          {/* ── Primary Role ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#4a5568] uppercase tracking-widest">
                Primary Role
              </p>
              <span className="text-[10px] text-red-400 font-semibold">Pick 1 required</span>
            </div>
            <div className="space-y-2">
              {roomRoles.map(role => {
                const active = primary === role;
                return (
                  <label
                    key={role}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                    style={{
                      borderColor: active ? "#3b82f6" : "#1e2530",
                      background:  active ? "rgba(59,130,246,0.08)" : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="primary"
                      value={role}
                      checked={active}
                      onChange={() => handlePrimaryChange(role)}
                      className="accent-blue-500 w-4 h-4 shrink-0"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-slate-200">{role}</span>
                      {active && (
                        <span className="text-[10px] text-blue-400 font-semibold">Primary</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Backup Roles ─────────────────────────────────────────────── */}
          {remainingRoles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-[#4a5568] uppercase tracking-widest">
                  Backup Roles
                </p>
                <span className="text-[10px] text-red-400 font-semibold">
                  Select all required
                </span>
              </div>
              <p className="text-[11px] text-[#4a5568] mb-3">
                Pilih backup berurutan — urutan menentukan prioritas (backup 1 lebih diutamakan).
              </p>
              <div className="space-y-2">
                {remainingRoles.map(role => {
                  const backupRank = backups.indexOf(role);
                  const checked = backupRank >= 0;
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                      style={{
                        borderColor: checked ? "#22c55e" : "#1e2530",
                        background:  checked ? "rgba(34,197,94,0.07)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBackup(role)}
                        className="accent-green-500 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-slate-200">{role}</span>
                        {checked && (
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                            Backup {backupRank + 1}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {backupRequired && backups.length === 0 && (
                <p className="text-[11px] text-red-400 mt-2">
                  Select at least one backup role.
                </p>
              )}
            </div>
          )}

          {/* ── Productivity Windows ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#4a5568] uppercase tracking-widest">
                Productivity Windows
              </p>
              <span className="text-[10px] text-red-400 font-semibold">Pick 1+ required</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {windowOptions.map(w => {
                const checked = windows.includes(w);
                return (
                  <label
                    key={w}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                    style={{
                      borderColor: checked ? "#3b82f6" : "#1e2530",
                      background:  checked ? "rgba(59,130,246,0.08)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWindow(w)}
                      className="accent-blue-500 w-4 h-4 shrink-0"
                    />
                    <span className="text-sm text-slate-200">{capitalize(w)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Work Environment ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#4a5568] uppercase tracking-widest">
                Work Environment
              </p>
              <span className="text-[10px] text-red-400 font-semibold">Pick 1+ required</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {envOptions.map(e => {
                const checked = envs.includes(e);
                return (
                  <label
                    key={e}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                    style={{
                      borderColor: checked ? "#3b82f6" : "#1e2530",
                      background:  checked ? "rgba(59,130,246,0.08)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEnv(e)}
                      className="accent-blue-500 w-4 h-4 shrink-0"
                    />
                    <span className="text-sm text-slate-200">{capitalize(e)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-[13px] bg-[#1f0a0a] border border-red-500/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#1e2530] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(primary, backups, windows, envs)}
            disabled={!canSave || saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DetailMemberRoom() {
  const navigate     = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();

  const { data: user }  = useCurrentUser();
  const logoutMutation  = useLogout();
  const roomQuery       = useRoomByCode(roomCode);
  const membersQuery    = useRoomMembers(roomCode);
  const joinMutation    = useJoinRoom();
  const leaveMutation   = useDeleteOrLeaveRoom();

  const isMatched = roomQuery.data?.room?.status === "ongoing";
  const teamsQuery = useRoomTeams(roomCode, { enabled: isMatched });

  const { activeNav, handleNavClick } = useSidebarNavigation("My Rooms");
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError,   setSaveError]   = useState("");

  const room      = roomQuery.data?.room ?? null;
  const members   = membersQuery.data?.members ?? [];
  const allRoles  = useMemo(() => (room?.roles ?? []) as string[], [room]);

  // Members may pick from the full standard option sets (all available by default).
  const windowOptions = STANDARD_WINDOWS;
  const envOptions = STANDARD_ENVS;

  // Find the current user's own membership record
  const myRecord = useMemo(() =>
    members.find(m => String(m.user?.id) === String(user?.id)) ?? null,
  [members, user?.id]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  const filteredMembers = members.filter(m =>
    (m.user?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.primary_role ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  const handleSaveProfile = async (primary: string, backups: string[], windows: string[], environments: string[]) => {
    if (!roomCode) return;
    setSaveError("");
    try {
      await joinMutation.mutateAsync({
        roomId: roomCode,
        payload: {
          primary_role:         primary,
          backup_roles:         backups,
          productivity_windows: windows,
          environments,
        },
      });
      await membersQuery.refetch();
      setShowEdit(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomCode || leaveMutation.isPending) return;
    if (!window.confirm("Are you sure you want to leave this room?")) return;
    try {
      await leaveMutation.mutateAsync({ roomCode });
      navigate("/my-rooms", { replace: true });
    } catch (err) {
      console.error(err);
    }
  };

  const isLoading = roomQuery.isLoading;
  const queryErr  = roomQuery.error instanceof Error ? roomQuery.error.message : "";

  return (
    <>
      <div className="flex h-screen bg-pp-bg text-white overflow-hidden font-sans">

        <Sidebar
          activeNav={activeNav}
          onNavClick={handleNavClick}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col overflow-hidden">

          <Topbar
            initials={initials}
            breadcrumbs={[
              { label: "My Rooms", to: "/my-rooms" },
              { label: room?.project_theme ?? roomCode ?? "Room" },
              { label: room?.room_code ?? "", mono: true, muted: true },
            ]}
          />

          {/* ── Content ─────────────────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

            {isLoading && (
              <div className="bg-pp-card border border-pp-border rounded-2xl px-6 py-12 text-center text-slate-500 text-sm">
                Loading room data...
              </div>
            )}

            {!isLoading && queryErr && (
              <div className="bg-pp-card border border-red-500 rounded-2xl px-6 py-8 text-center text-red-400 text-sm">
                {queryErr}
              </div>
            )}

            {!isLoading && !queryErr && room && (
              <>
                {/* ── Room Information ──────────────────────────────────────── */}
                <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
                  <div className="flex items-center gap-2.5 mb-6">
                    <span className="text-blue-400"><IconInfo /></span>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {room.project_theme}
                      </h2>
                      <p className="text-[11px] text-slate-600 font-mono tracking-wider mt-0.5">
                        {room.room_code}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    <InfoBlock label="Roles">
                      <div className="flex flex-wrap gap-1.5">
                        {allRoles.length === 0
                          ? <span className="text-sm text-slate-500">—</span>
                          : allRoles.map(r => (
                            <RoleBadge key={r} role={r} allRoles={allRoles} />
                          ))
                        }
                      </div>
                    </InfoBlock>
                    <InfoBlock label="Max Member Room">
                      <p className="text-sm text-slate-200">{room.max_members ?? room.max_per_group} members</p>
                    </InfoBlock>
                    <InfoBlock label="Number of Teams">
                      <p className="text-sm text-slate-200">{room.number_of_groups} teams</p>
                    </InfoBlock>
                    <InfoBlock label="Productivity Windows">
                      <p className="text-sm text-slate-200">
                        {(room.productivity_windows as string[] | undefined)?.map(capitalize).join(", ") || "—"}
                      </p>
                    </InfoBlock>
                    <InfoBlock label="Environments">
                      <p className="text-sm text-slate-200">
                        {(room.environments as string[] | undefined)?.map(capitalize).join(", ") || "—"}
                      </p>
                    </InfoBlock>
                    <InfoBlock label="Status">
                      <p className="text-sm text-slate-200 capitalize">{room.status}</p>
                    </InfoBlock>
                  </div>
                </section>

                {/* ── Teams view (when matched) ───────────────────────────────── */}
                {isMatched && (
                  <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-emerald-400">✦</span>
                        <h3 className="text-lg font-semibold text-white">Teams formed</h3>
                        <span className="text-xs text-slate-500 bg-pp-elevated px-2 py-0.5 rounded-full">
                          {teamsQuery.data?.teams?.length ?? 0} teams
                        </span>
                      </div>
                    </div>

                    {teamsQuery.isLoading && (
                      <p className="text-center text-slate-600 text-sm py-8">Loading teams...</p>
                    )}

                    {!teamsQuery.isLoading && teamsQuery.data && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {teamsQuery.data.teams.map((team) => {
                            const containsMe = team.members.some(tm => String(tm.user?.id) === String(user?.id));
                            return (
                              <div key={team.team_number} className={`bg-pp-elevated border rounded-xl p-4 ${containsMe ? "border-blue-500/60" : "border-pp-border"}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-bold grid place-items-center">{team.team_number}</span>
                                    Team {team.team_number}
                                    {containsMe && <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">You</span>}
                                  </h4>
                                  <span className="text-[10px] text-slate-500">
                                    {team.members.length} / {teamsQuery.data?.room.max_per_group}
                                  </span>
                                </div>
                                {team.members.length === 0 && <p className="text-xs text-slate-600 italic">Empty</p>}
                                <div className="space-y-2">
                                  {team.members.map((tm) => {
                                    const name = tm.user?.name ?? "Unknown";
                                    const c = getRoleStyle(tm.assigned_role, allRoles);
                                    const isMe = String(tm.user?.id) === String(user?.id);
                                    return (
                                      <div key={`${team.team_number}-${tm.room_member_id}`} className={`flex items-center gap-3 p-2 rounded-lg bg-pp-bg border ${isMe ? "border-blue-500/40" : "border-pp-border"}`}>
                                        <div
                                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#c0cad8] shrink-0 border border-[#2a3340]"
                                          style={{ background: getAvatarColor(name) }}
                                        >
                                          {getInitials(name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">
                                            {name}
                                            {isMe && <span className="text-[10px] text-blue-400 font-semibold ml-2">(you)</span>}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            <span
                                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                                            >
                                              {tm.assigned_role}
                                            </span>
                                            {tm.user?.username && (
                                              <span className="text-[10px] text-slate-600">@{tm.user.username}</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">{tm.score.toFixed(3)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {teamsQuery.data.unassigned.length > 0 && (
                          <div className="mt-5 border-t border-pp-border pt-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-medium">
                              Unassigned ({teamsQuery.data.unassigned.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {teamsQuery.data.unassigned.map((u) => (
                                <span key={u.room_member_id} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                  {u.user?.name ?? `rm#${u.room_member_id}`}
                                  {u.primary_role && <span className="opacity-60"> · {u.primary_role}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}

                {/* ── Bottom row (members + my profile) — hidden when matched ───────── */}
                {!isMatched && (
                <div className="flex flex-col lg:flex-row gap-5">

                  {/* Members list */}
                  <section className="flex-1 min-w-0 bg-pp-card border border-pp-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">Members in This Room</h3>
                        <span className="text-xs text-slate-500 bg-pp-elevated px-2 py-0.5 rounded-full">
                          {filteredMembers.length}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"><IconSearch /></span>
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg bg-pp-elevated border border-pp-border text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 w-40 transition-all"
                        />
                      </div>
                    </div>

                    {membersQuery.isLoading && (
                      <p className="text-center text-slate-600 text-sm py-8">Loading members...</p>
                    )}

                    <div>
                      {!membersQuery.isLoading && filteredMembers.length === 0 ? (
                        <p className="text-center text-slate-600 text-sm py-8">
                          {searchQuery ? "No members found." : "No members in this room yet."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredMembers.map(m => (
                            <MemberRow key={m.id} member={m} allRoles={allRoles} />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Your Profile in Room */}
                  <aside className="w-full lg:w-72 lg:shrink-0 bg-pp-card border border-pp-border rounded-2xl p-5 flex flex-col">
                    <div className="flex items-center gap-2 pb-4 border-b border-pp-border mb-4">
                      <IconUser />
                      <h3 className="text-sm font-bold text-white">Your Profile in Room</h3>
                    </div>

                    {/* Primary Role */}
                    <InfoBlock label="Primary Role">
                      <div className="flex items-center gap-2 mt-1">
                        {myRecord?.primary_role ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#00e5ff] shrink-0" />
                            <span className="text-sm text-slate-200">{myRecord.primary_role}</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500 italic">Not set</span>
                        )}
                      </div>
                    </InfoBlock>

                    {/* Backup Role */}
                    {myRecord?.backup_role && (
                      <div className="mt-4">
                        <InfoBlock label="Backup Role">
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-sm text-slate-200">{myRecord.backup_role}</span>
                          </div>
                        </InfoBlock>
                      </div>
                    )}

                    {/* Productivity Windows */}
                    <div className="mt-4">
                      <InfoBlock label="Productivity Windows">
                        <p className="text-sm text-slate-200 mt-1">
                          {(myRecord?.productivity_windows ?? []).length > 0
                            ? (myRecord?.productivity_windows ?? []).map(capitalize).join(", ")
                            : <span className="text-slate-500 italic">Not set</span>
                          }
                        </p>
                      </InfoBlock>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => { setSaveError(""); setShowEdit(true); }}
                      className="mt-5 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs font-semibold py-2.5 rounded-lg cursor-pointer"
                    >
                      <IconEdit />
                      Edit Role &amp; Work Time
                    </button>

                    {/* Leave Room */}
                    <button
                      onClick={handleLeaveRoom}
                      disabled={leaveMutation.isPending}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors text-xs font-semibold py-2.5 rounded-lg cursor-pointer disabled:opacity-40"
                    >
                      <IconDoor />
                      {leaveMutation.isPending ? "Leaving..." : "Leave Room"}
                    </button>
                  </aside>
                </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      {showEdit && (
        <EditProfileModal
          roomRoles={allRoles}
          windowOptions={windowOptions}
          envOptions={envOptions}
          initialPrimary={myRecord?.primary_role ?? ""}
          initialBackups={
            Array.isArray(myRecord?.backup_roles) && myRecord.backup_roles.length > 0
              ? myRecord.backup_roles
              : myRecord?.backup_role
                ? myRecord.backup_role.split(", ").filter(Boolean)
                : allRoles.filter(r => r !== myRecord?.primary_role)
          }
          initialWindows={myRecord?.productivity_windows ?? []}
          initialEnvironments={myRecord?.environments ?? []}
          saving={joinMutation.isPending}
          error={saveError}
          onSave={handleSaveProfile}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

// ─── Helper sub-component ─────────────────────────────────────────────────────

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">{label}</p>
      {children}
    </div>
  );
}
