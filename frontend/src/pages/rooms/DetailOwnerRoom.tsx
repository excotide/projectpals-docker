import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import {
  useDeleteOrLeaveRoom,
  useRemoveMember,
  useRoomByCode,
  useRoomMembers,
  useRoomTeams,
  useStartMatching,
  useUpdateRoom,
  type RoomMemberItem,
} from "../../hooks/useRooms";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import MatchedTeamView from "../../components/teams/MatchedTeamView";
import { ROLE_COLORS, capitalize, getInitials, getRoleColor } from "../../utils/teamHelpers";

// ─── Icons (non-matched view only) ─────────────────────────────────────────────

const IconSearch = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconInfo   = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2.5} strokeLinecap="round"/></svg>;
const IconTrash  = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconPin    = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconArrow  = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconPlus   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconX      = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ─── Status ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["open", "matching", "ongoing"] as const;
type RoomStatus = typeof STATUS_OPTIONS[number];

const STATUS_PILL: Record<string, string> = {
  open:     "border-green-500 text-green-500",
  matching: "border-purple-400 text-purple-400",
  ongoing:  "border-emerald-500 text-emerald-400",
};

// ─── Helper sub-components ─────────────────────────────────────────────────────

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">{label}</p>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_PILL[status] ?? "border-slate-500 text-slate-400";
  return (
    <span className={`border ${cls} rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize inline-block`}>
      {status || "—"}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DetailOwnerRoom() {
  const navigate     = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();

  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const roomQuery      = useRoomByCode(roomCode);
  const membersQuery   = useRoomMembers(roomCode);
  const updateMutation  = useUpdateRoom();
  const deleteMutation  = useDeleteOrLeaveRoom();
  const removeMember    = useRemoveMember();
  const startMatching   = useStartMatching();

  const roomStatus = roomQuery.data?.room?.status;
  const isMatched = roomStatus === "ongoing";
  const teamsQuery = useRoomTeams(roomCode, { enabled: isMatched });

  const { activeNav, handleNavClick } = useSidebarNavigation("My Rooms");
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [actionErr,  setActionErr]  = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [confirmMemberId, setConfirmMemberId] = useState<number | string | null>(null);
  const [confirmRoomDelete, setConfirmRoomDelete] = useState(false);
  const [confirmMatch, setConfirmMatch] = useState(false);
  const [matchErr, setMatchErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | string | null>(null);

  // Edit form state
  const [editTheme,  setEditTheme]  = useState("");
  const [editRoles,  setEditRoles]  = useState<string[]>([]);
  const [editRoleIn, setEditRoleIn] = useState("");
  const [editMax,    setEditMax]    = useState(2);
  const [editGroups, setEditGroups] = useState(2);
  const [editStatus, setEditStatus] = useState<RoomStatus>("open");

  // Local member list — mirrors API, allows optimistic local deletion
  const [localMembers, setLocalMembers] = useState<RoomMemberItem[]>([]);

  const room     = roomQuery.data?.room ?? null;
  const allRoles = useMemo(() => (room?.roles ?? []) as string[], [room]);

  // Sync local members when API data loads
  useEffect(() => {
    if (membersQuery.data?.members) setLocalMembers(membersQuery.data.members);
  }, [membersQuery.data]);

  // Populate edit form when room loads (or when we exit edit mode)
  useEffect(() => {
    if (room && !editing) {
      setEditTheme(room.project_theme ?? "");
      setEditRoles((room.roles as string[]) ?? []);
      setEditMax(room.max_members ?? 10);
      setEditGroups(room.number_of_groups ?? 2);
      setEditStatus((room.status as RoomStatus) ?? "open");
    }
  }, [room, editing]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return getInitials(user.name);
  }, [user?.name]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  const handleDeleteRoom = async () => {
    if (!roomCode || deleteMutation.isPending) return;
    setActionErr("");
    try {
      await deleteMutation.mutateAsync({ roomCode });
      navigate("/my-rooms", { replace: true });
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Failed to delete room.");
    }
  };

  const openDeleteRoom = () => setConfirmRoomDelete(true);
  const closeDeleteRoom = () => setConfirmRoomDelete(false);
  const confirmDeleteRoom = async () => {
    await handleDeleteRoom();
    setConfirmRoomDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!roomCode) return;
    if (!editTheme.trim()) { setActionErr("Project theme cannot be empty."); return; }
    if (editRoles.length < 2) { setActionErr("At least 2 roles are required."); return; }
    setActionErr("");
    try {
      await updateMutation.mutateAsync({
        roomCode,
        project_theme:    editTheme.trim(),
        roles:            editRoles,
        max_members:      editMax,
        number_of_groups: editGroups,
        status:           editStatus,
      });
      setEditing(false);
      await roomQuery.refetch();
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Failed to save changes.");
    }
  };

  const handleCancelEdit = () => {
    if (!room) return;
    setEditTheme(room.project_theme ?? "");
    setEditRoles((room.roles as string[]) ?? []);
    setEditMax(room.max_members ?? 10);
    setEditGroups(room.number_of_groups ?? 2);
    setEditStatus((room.status as RoomStatus) ?? "open");
    setEditing(false);
    setActionErr("");
  };

  const addEditRole = () => {
    const t = editRoleIn.trim();
    if (!t || editRoles.includes(t)) return;
    setEditRoles(prev => [...prev, t]);
    setEditRoleIn("");
  };

  const handleDeleteMember = async (id: number | string) => {
    if (!roomCode || removeMember.isPending) return;
    setActionErr("");
    setLocalMembers(prev => prev.filter(m => m.id !== id));
    try {
      await removeMember.mutateAsync({ roomCode, memberId: id });
    } catch (err) {
      if (membersQuery.data?.members) setLocalMembers(membersQuery.data.members);
      setActionErr(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  const openDeleteMember = (id: number | string) => setConfirmMemberId(id);
  const closeDeleteMember = () => setConfirmMemberId(null);
  const confirmDeleteMember = async () => {
    if (confirmMemberId == null) return;
    await handleDeleteMember(confirmMemberId);
    setConfirmMemberId(null);
  };

  const handleStartMatching = async () => {
    if (!roomCode || startMatching.isPending) return;
    setMatchErr("");
    try {
      await startMatching.mutateAsync({ roomCode });
      setConfirmMatch(false);
      await roomQuery.refetch();
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setMatchErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to start matching."));
    }
  };

  const openConfirmMatch = () => { setMatchErr(""); setConfirmMatch(true); };
  const closeConfirmMatch = () => { if (!startMatching.isPending) setConfirmMatch(false); };

  const handleCopyRoomCode = () => {
    if (!room?.room_code) return;
    navigator.clipboard.writeText(room.room_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredMembers = localMembers.filter(m =>
    (m.user?.name ?? "").toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.primary_role ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  const allTeams = teamsQuery.data?.teams ?? [];
  const selectedTeam = useMemo(() => {
    if (allTeams.length === 0) return null;
    if (selectedTeamId == null) return allTeams[0];
    return allTeams.find((t) => String(t.id) === String(selectedTeamId)) ?? allTeams[0];
  }, [allTeams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId == null && allTeams.length > 0) {
      setSelectedTeamId(allTeams[0].id);
    }
  }, [allTeams, selectedTeamId]);

  const isLoading = roomQuery.isLoading || membersQuery.isLoading;
  const queryErr  = roomQuery.error instanceof Error ? roomQuery.error.message : "";

  return (
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

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

          {actionErr && (
            <div className="bg-[#1f0a0a] border border-red-500 rounded-xl px-4 py-3 text-red-400 text-[13px]">
              {actionErr}
            </div>
          )}

          {!isLoading && !queryErr && room && (
            <>
              {!isMatched && (
                <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <span className="text-blue-400"><IconInfo /></span>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {room.project_theme}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-600 font-mono tracking-wider">
                            {room.room_code}
                          </p>
                          {room.room_code && (
                            <button
                              onClick={handleCopyRoomCode}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                                copied
                                  ? "bg-emerald-900 text-emerald-400 border-emerald-700"
                                  : "bg-pp-elevated text-slate-500 border-pp-border hover:text-slate-200"
                              }`}
                            >
                              {copied ? "Copied" : "Copy Code"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={openDeleteRoom}
                        disabled={deleteMutation.isPending}
                        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors border-none cursor-pointer"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        onClick={() => { setEditing(true); setActionErr(""); }}
                        className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors border-none cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {!editing && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                      <InfoBlock label="Roles">
                        <div className="flex flex-wrap gap-1.5">
                          {allRoles.length === 0
                            ? <span className="text-sm text-slate-500">—</span>
                            : allRoles.map((r, i) => (
                              <span key={r} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[i % ROLE_COLORS.length].badge}`}>{r}</span>
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
                      <InfoBlock label="Status">
                        <StatusPill status={room.status ?? ""} />
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
                    </div>
                  )}
                </section>
              )}

              {/* ── Matched view: team tabs + shared MatchedTeamView ──────────── */}
              {isMatched && (
                <div className="space-y-6">
                  <section className="bg-pp-card border border-pp-border rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-white truncate">{room.project_theme}</h2>
                      <p className="text-[11px] text-slate-600 font-mono tracking-wider">{room.room_code}</p>
                    </div>
                    <button
                      onClick={openDeleteRoom}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors border-none cursor-pointer"
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete Room"}
                    </button>
                  </section>

                  {teamsQuery.isLoading && (
                    <p className="text-center text-slate-600 text-sm py-8">Loading teams...</p>
                  )}

                  {!teamsQuery.isLoading && teamsQuery.data && allTeams.length === 0 && (
                    <p className="text-center text-slate-600 text-sm py-8">Belum ada team terbentuk.</p>
                  )}

                  {!teamsQuery.isLoading && allTeams.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {allTeams.map((t) => {
                        const active = String(t.id) === String(selectedTeam?.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTeamId(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer border ${
                              active
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-pp-elevated border-pp-border text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Team {t.team_number}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedTeam && roomCode && (
                    <MatchedTeamView
                      team={selectedTeam}
                      roomCode={roomCode}
                      roomRoles={allRoles}
                      roomInfo={{
                        project_theme: room.project_theme,
                        room_code: room.room_code,
                        status: room.status,
                        environments: room.environments as string[] | undefined,
                        created_at: room.created_at,
                      }}
                    />
                  )}
                </div>
              )}

              {/* ── Bottom row (members + smart matching) — hidden when matched ──── */}
              {!isMatched && (
              <div className="flex flex-col lg:flex-row gap-5">

                {/* Members */}
                <section className="flex-1 min-w-0 bg-pp-card border border-pp-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">Members in This Room</h2>
                      <span className="text-xs text-slate-500 bg-pp-elevated px-2 py-0.5 rounded-full">
                        {filteredMembers.length}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"><IconSearch /></span>
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-pp-elevated border border-pp-border text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 w-40 transition-all"
                      />
                    </div>
                  </div>

                  {membersQuery.isLoading && (
                    <p className="text-center text-slate-600 text-sm py-8">Loading members...</p>
                  )}
                  {!membersQuery.isLoading && filteredMembers.length === 0 && (
                    <p className="text-center text-slate-600 text-sm py-8">
                      {memberSearch ? "No members found." : "No members in this room yet."}
                    </p>
                  )}

                  <div className="space-y-2">
                    {filteredMembers.map(member => {
                      const colors = getRoleColor(member.primary_role, allRoles);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-pp-elevated border border-pp-border hover:border-blue-500/30 transition-all group"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colors.avatar}`}>
                            {getInitials(member.user?.name ?? "?")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{member.user?.name ?? "Unknown"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {member.primary_role && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                                  {member.primary_role}
                                </span>
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
                          <button
                            onClick={() => openDeleteMember(member.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 border-none cursor-pointer"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Smart Matching */}
                <aside className="w-full lg:w-72 lg:shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 flex flex-col relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative flex items-center gap-1.5 mb-3">
                    <span className="text-blue-200/80"><IconPin /></span>
                    <span className="text-[11px] uppercase tracking-widest text-blue-200/70 font-semibold">Find Group</span>
                  </div>
                  <h3 className="relative text-xl font-bold text-white mb-3 leading-snug">Smart Matching</h3>
                  <p className="relative text-sm text-blue-100/80 leading-relaxed flex-1">
                    Automatically find the best teammates. Smart Matching analyzes
                    roles, schedules, and member environments to form the most
                    compatible groups in this room.
                  </p>

                  <div className="relative mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">{localMembers.length}</p>
                      <p className="text-[10px] text-blue-200/70">Members</p>
                    </div>
                    <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">{room.number_of_groups}</p>
                      <p className="text-[10px] text-blue-200/70">Groups</p>
                    </div>
                  </div>

                  <button
                    onClick={openConfirmMatch}
                    disabled={startMatching.isPending || isMatched || localMembers.length < 2}
                    title={isMatched ? "Room already matched" : localMembers.length < 2 ? "Need at least 2 members to match" : ""}
                    className="relative mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/30 border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {startMatching.isPending ? "Matching..." : isMatched ? "Already matched" : <>Start Matching <IconArrow /></>}
                  </button>
                </aside>
              </div>
              )}
            </>
          )}
        </main>
      </div>

      {confirmMemberId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDeleteMember} />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Remove member?</h3>
            <p className="text-sm text-[#8892a4] mb-5">
              This will remove the member from the room. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteMember}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                onClick={confirmDeleteMember}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirmMatch} />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Start smart matching?</h3>
            <p className="text-sm text-[#8892a4] mb-5">
              Form teams from <strong>{localMembers.length}</strong> members into <strong>{room?.number_of_groups}</strong> team(s)
              (total capacity <strong>{room?.max_members ?? room?.max_per_group}</strong> members). The room status will become <code>ongoing</code> and members will be
              assigned to teams.
            </p>
            {matchErr && (
              <div className="bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px] mb-4">
                {matchErr}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={closeConfirmMatch}
                disabled={startMatching.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartMatching}
                disabled={startMatching.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {startMatching.isPending ? "Matching..." : "Yes, Start"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRoomDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDeleteRoom} />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Delete room?</h3>
            <p className="text-sm text-[#8892a4] mb-5">
              This will remove the room and all its members. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteRoom}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                onClick={confirmDeleteRoom}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelEdit} />
          <div className="relative z-10 w-full max-w-2xl bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2530] shrink-0">
              <h3 className="text-base font-bold text-slate-100">Edit Room</h3>
              <button
                onClick={handleCancelEdit}
                className="text-[#4a5568] hover:text-slate-300 transition-colors p-1 border-none bg-transparent cursor-pointer rounded-lg hover:bg-white/5"
              >
                <IconX />
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5 overflow-y-auto">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Project Theme</label>
                <input
                  value={editTheme}
                  onChange={e => setEditTheme(e.target.value)}
                  placeholder="e.g. E-Commerce Website"
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">
                  Roles <span className="text-slate-600 font-normal" style={{ textTransform: "none" }}>(min. 2)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={editRoleIn}
                    onChange={e => setEditRoleIn(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addEditRole()}
                    placeholder="e.g. Frontend Developer"
                    className="flex-1 px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600"
                  />
                  <button
                    onClick={addEditRole}
                    disabled={!editRoleIn.trim() || editRoles.includes(editRoleIn.trim())}
                    className="flex items-center gap-1.5 px-4 h-[42px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 border-none rounded-lg text-white text-sm font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    <IconPlus /> Add
                  </button>
                </div>
                {editRoles.length === 0
                  ? <p className="text-xs text-slate-600 italic">No roles yet. Add at least 2.</p>
                  : (
                    <div className="flex flex-col gap-1.5">
                      {editRoles.map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-pp-bg border border-pp-border rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-sm text-slate-200">{r}</span>
                          </div>
                          <button onClick={() => setEditRoles(p => p.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer p-0.5">
                            <IconX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Max Member Room</label>
                <input type="number" min={2} max={50} value={editMax} onChange={e => setEditMax(Math.max(2, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors" />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Number of Teams</label>
                <input type="number" min={2} max={100} value={editGroups} onChange={e => setEditGroups(Math.max(2, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors" />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as RoomStatus)}
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#1e2530] shrink-0">
              <button
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
