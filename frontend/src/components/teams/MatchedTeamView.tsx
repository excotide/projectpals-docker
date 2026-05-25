import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../../hooks/useAuth";
import {
  useChangeMemberRole,
  useCreateTeamTarget,
  useDeleteTeamTarget,
  useTeamTargets,
  useToggleTeamTarget,
  useTransferLeader,
  useUpdateTeamTarget,
  type RoomTeam,
} from "../../hooks/useRooms";
import { getAvatarColor, getInitials } from "../../utils/teamHelpers";
import { IconCrown, IconPencil, IconPlus, IconTrash } from "../icons/TeamIcons";

export interface MatchedTeamViewProps {
  team: RoomTeam;
  roomCode: string;
  roomRoles: string[];
  roomInfo: {
    project_theme?: string;
    room_code?: string;
    status?: string;
    environments?: string[];
  };
}

export default function MatchedTeamView({ team, roomCode, roomRoles, roomInfo }: MatchedTeamViewProps) {
  const { data: user } = useCurrentUser();

  const transferLeader  = useTransferLeader();
  const changeMemberRole = useChangeMemberRole();
  const createTarget    = useCreateTeamTarget();
  const updateTarget    = useUpdateTeamTarget();
  const deleteTarget    = useDeleteTeamTarget();
  const toggleTarget    = useToggleTeamTarget();
  const targetsQuery    = useTeamTargets(team.id, { enabled: Boolean(team.id) });

  const teamMembers = team.members;

  const currentUserIsLeader = useMemo(() => {
    if (!user?.id) return false;
    return teamMembers.some((m) => m.is_leader && String(m.user?.id) === String(user.id));
  }, [teamMembers, user?.id]);

  const currentUserAssignedRole = useMemo(() => {
    if (!user?.id) return null;
    const me = teamMembers.find((m) => String(m.user?.id) === String(user.id));
    return me?.assigned_role ?? null;
  }, [teamMembers, user?.id]);

  const teamRoles = useMemo(() => {
    const set = new Set<string>();
    teamMembers.forEach((m) => { if (m.assigned_role) set.add(m.assigned_role); });
    return Array.from(set).sort();
  }, [teamMembers]);

  const allTargets = targetsQuery.data?.targets ?? [];
  const targetsByRole = useMemo(() => {
    const map = new Map<string, typeof allTargets>();
    allTargets.forEach((t) => {
      const arr = map.get(t.role) ?? [];
      arr.push(t);
      map.set(t.role, arr);
    });
    return map;
  }, [allTargets]);
  const doneCount = allTargets.filter((t) => t.is_done).length;
  const totalCount = allTargets.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const [activeMemberMenuId, setActiveMemberMenuId] = useState<number | string | null>(null);
  const [profileMemberId, setProfileMemberId] = useState<number | string | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<number | string | null>(null);
  const [transferErr, setTransferErr] = useState("");
  const [changeRoleMemberId, setChangeRoleMemberId] = useState<number | string | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState("");
  const [changeRoleErr, setChangeRoleErr] = useState("");
  const [newTargetByRole, setNewTargetByRole] = useState<Record<string, string>>({});
  const [editingTargetId, setEditingTargetId] = useState<number | string | null>(null);
  const [editingTargetTitle, setEditingTargetTitle] = useState("");
  const [targetErr, setTargetErr] = useState("");

  useEffect(() => {
    if (activeMemberMenuId == null) return;
    const handleOutside = () => setActiveMemberMenuId(null);
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [activeMemberMenuId]);

  const targetMember = teamMembers.find((m) => m.room_member_id === transferTargetId);
  const profileMember = teamMembers.find((m) => m.room_member_id === profileMemberId) ?? null;
  const changeRoleMember = teamMembers.find((m) => m.room_member_id === changeRoleMemberId) ?? null;

  const openChangeRole = (roomMemberId: number | string, currentRole: string) => {
    setChangeRoleErr("");
    setChangeRoleValue(currentRole);
    setChangeRoleMemberId(roomMemberId);
    setActiveMemberMenuId(null);
  };

  const handleConfirmTransfer = async () => {
    if (transferTargetId == null) return;
    setTransferErr("");
    try {
      await transferLeader.mutateAsync({
        teamId: team.id,
        newLeaderRoomMemberId: transferTargetId,
        roomCode,
      });
      setTransferTargetId(null);
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTransferErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to transfer leadership."));
    }
  };

  const handleConfirmChangeRole = async () => {
    if (changeRoleMemberId == null) return;
    if (!changeRoleValue) { setChangeRoleErr("Pilih role terlebih dahulu."); return; }
    setChangeRoleErr("");
    try {
      await changeMemberRole.mutateAsync({
        teamId: team.id,
        roomMemberId: changeRoleMemberId,
        assignedRole: changeRoleValue,
        roomCode,
      });
      setChangeRoleMemberId(null);
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setChangeRoleErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to change role."));
    }
  };

  const handleAddTarget = async (role: string) => {
    const title = (newTargetByRole[role] ?? "").trim();
    if (!title) return;
    setTargetErr("");
    try {
      await createTarget.mutateAsync({ teamId: team.id, role, title });
      setNewTargetByRole((prev) => ({ ...prev, [role]: "" }));
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to add target."));
    }
  };

  const handleSaveEditTarget = async () => {
    if (editingTargetId == null) return;
    const title = editingTargetTitle.trim();
    if (!title) return;
    setTargetErr("");
    try {
      await updateTarget.mutateAsync({ teamId: team.id, targetId: editingTargetId, title });
      setEditingTargetId(null);
      setEditingTargetTitle("");
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to update target."));
    }
  };

  const handleDeleteTarget = async (targetId: number | string) => {
    setTargetErr("");
    try {
      await deleteTarget.mutateAsync({ teamId: team.id, targetId });
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to delete target."));
    }
  };

  const handleToggleTarget = async (targetId: number | string, role: string) => {
    if (currentUserAssignedRole !== role) return;
    setTargetErr("");
    try {
      await toggleTarget.mutateAsync({ teamId: team.id, targetId });
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to toggle target."));
    }
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-white">Team Information</h2>
              <p className="text-[11px] text-slate-500 mt-1">Room: {roomInfo.project_theme ?? "-"}</p>
            </div>
            <span className="border border-emerald-500 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
              Team {team.team_number}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Room Code</p>
              <p className="text-sm text-slate-200">{roomInfo.room_code ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Status</p>
              <p className="text-sm text-slate-200">{roomInfo.status ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Roles</p>
              <p className="text-sm text-slate-200">
                {roomRoles.length > 0 ? roomRoles.join(", ") : "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Environments</p>
              <p className="text-sm text-slate-200">
                {(roomInfo.environments ?? []).length > 0 ? (roomInfo.environments ?? []).join(", ") : "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Anggota Team</h3>
            <div className="flex items-center gap-3">
              {currentUserIsLeader && (
                <span className="text-[11px] text-amber-400">Kamu adalah ketua — klik anggota untuk menu</span>
              )}
              <span className="text-[11px] text-slate-500">Total: {teamMembers.length}</span>
            </div>
          </div>
          {teamMembers.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada anggota pada team ini.</p>
          )}
          {teamMembers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {teamMembers.map((member) => {
                const name = member.user?.name ?? "Unknown";
                const color = getAvatarColor(name);
                const isSelf = String(member.user?.id) === String(user?.id);
                const canTransferToThis = currentUserIsLeader && !member.is_leader && !isSelf;
                const canChangeRole = currentUserIsLeader;
                const menuOpen = activeMemberMenuId === member.room_member_id;
                return (
                  <div
                    key={member.room_member_id}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                      member.is_leader
                        ? "bg-amber-500/5 border-amber-500/40"
                        : "bg-pp-elevated border-pp-border"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveMemberMenuId((prev) => (prev === member.room_member_id ? null : member.room_member_id));
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#c0cad8] shrink-0 border border-[#2a3340]"
                      style={{ background: color }}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-200 truncate">{name}</p>
                        {member.is_leader && (
                          <span className="inline-flex items-center gap-1 border border-amber-500/60 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                            <IconCrown /> Ketua
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {member.assigned_role ?? member.primary_role ?? "Role belum dipilih"}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 px-2">•••</span>
                    {menuOpen && (
                      <div
                        className="absolute right-3 top-12 z-20 w-44 rounded-xl border border-pp-border bg-[#0f141b] shadow-xl overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setProfileMemberId(member.room_member_id);
                            setActiveMemberMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5 cursor-pointer"
                        >
                          Lihat Profile
                        </button>
                        {canChangeRole && (
                          <button
                            onClick={() => openChangeRole(member.room_member_id, member.assigned_role ?? "")}
                            className="w-full text-left px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5 cursor-pointer border-t border-pp-border"
                          >
                            Ubah Role
                          </button>
                        )}
                        {canTransferToThis && (
                          <button
                            onClick={() => {
                              setTransferErr("");
                              setTransferTargetId(member.room_member_id);
                              setActiveMemberMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-[12px] text-amber-300 hover:bg-amber-500/10 cursor-pointer border-t border-pp-border"
                          >
                            Transfer Ketua
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="w-[320px] shrink-0 space-y-4">
        <section className="bg-pp-card border border-pp-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Target Tim</h3>
            <span className="text-[11px] text-slate-500">{doneCount}/{totalCount} selesai</span>
          </div>
          <div className="h-2 rounded-full bg-pp-elevated overflow-hidden border border-pp-border mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {targetsQuery.isLoading && (
            <p className="text-[12px] text-slate-500">Loading target...</p>
          )}

          {targetErr && (
            <div className="mb-3 bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[11px]">
              {targetErr}
            </div>
          )}

          {!targetsQuery.isLoading && teamRoles.length === 0 && (
            <p className="text-[12px] text-slate-500">Belum ada role di team ini.</p>
          )}

          <div className="space-y-4">
            {teamRoles.map((role) => {
              const roleTargets = targetsByRole.get(role) ?? [];
              const roleDone = roleTargets.filter((t) => t.is_done).length;
              const canToggleHere = currentUserAssignedRole === role;
              const draft = newTargetByRole[role] ?? "";
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">{role}</p>
                    <span className="text-[10px] text-slate-500">{roleDone}/{roleTargets.length}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {roleTargets.map((t) => {
                      const isEditing = editingTargetId === t.id;
                      return (
                        <li
                          key={t.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                            t.is_done
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : "bg-pp-elevated border-pp-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={t.is_done}
                            disabled={!canToggleHere || toggleTarget.isPending}
                            onChange={() => handleToggleTarget(t.id, t.role)}
                            className="shrink-0 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            title={canToggleHere ? "Centang target" : "Hanya anggota role ini yang bisa mencentang"}
                          />
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-1">
                              <input
                                value={editingTargetTitle}
                                onChange={(e) => setEditingTargetTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditTarget();
                                  if (e.key === "Escape") { setEditingTargetId(null); setEditingTargetTitle(""); }
                                }}
                                autoFocus
                                className="flex-1 min-w-0 bg-pp-bg border border-pp-border rounded-md px-2 py-1 text-[12px] text-slate-100 outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={handleSaveEditTarget}
                                disabled={updateTarget.isPending}
                                className="text-[10px] px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span className={`flex-1 text-[12px] truncate ${t.is_done ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {t.title}
                            </span>
                          )}
                          {currentUserIsLeader && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingTargetId(t.id); setEditingTargetTitle(t.title); }}
                                className="text-slate-500 hover:text-blue-400 p-1 rounded cursor-pointer"
                                title="Edit"
                              >
                                <IconPencil />
                              </button>
                              <button
                                onClick={() => handleDeleteTarget(t.id)}
                                disabled={deleteTarget.isPending}
                                className="text-slate-500 hover:text-red-400 p-1 rounded cursor-pointer disabled:opacity-50"
                                title="Hapus"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                    {roleTargets.length === 0 && (
                      <li className="text-[11px] text-slate-500 italic px-1">Belum ada target untuk role ini.</li>
                    )}
                  </ul>
                  {currentUserIsLeader && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={draft}
                        onChange={(e) => setNewTargetByRole((prev) => ({ ...prev, [role]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddTarget(role); }}
                        placeholder="Tambah target..."
                        className="flex-1 min-w-0 bg-pp-elevated border border-pp-border rounded-md px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-blue-500 placeholder:text-slate-600"
                      />
                      <button
                        onClick={() => handleAddTarget(role)}
                        disabled={!draft.trim() || createTarget.isPending}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <IconPlus />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      {transferTargetId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!transferLeader.isPending) setTransferTargetId(null); }}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Transfer leadership?</h3>
            <p className="text-sm text-[#8892a4] mb-5">
              Kamu akan memberikan posisi ketua kepada{" "}
              <strong className="text-slate-200">{targetMember?.user?.name ?? "anggota ini"}</strong>.
              Setelah ditransfer, kamu menjadi anggota biasa dan tidak bisa mengembalikannya sendiri.
            </p>
            {transferErr && (
              <div className="bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px] mb-4">
                {transferErr}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setTransferTargetId(null)}
                disabled={transferLeader.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={transferLeader.isPending}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {transferLeader.isPending ? "Transferring..." : "Yes, Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeRoleMemberId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!changeMemberRole.isPending) setChangeRoleMemberId(null); }}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Ubah Role Anggota</h3>
            <p className="text-sm text-[#8892a4] mb-4">
              Anggota: <strong className="text-slate-200">{changeRoleMember?.user?.name ?? "-"}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Role baru</label>
              <select
                value={changeRoleValue}
                onChange={(e) => setChangeRoleValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors"
              >
                <option value="">— Pilih role —</option>
                {roomRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {changeRoleErr && (
              <div className="bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px] mb-4">
                {changeRoleErr}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setChangeRoleMemberId(null)}
                disabled={changeMemberRole.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChangeRole}
                disabled={changeMemberRole.isPending || !changeRoleValue}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {changeMemberRole.isPending ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setProfileMemberId(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">Profile Anggota</h3>
              <button
                onClick={() => setProfileMemberId(null)}
                className="text-[#4a5568] hover:text-slate-300 transition-colors p-1 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-200">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Nama</p>
                <p>{profileMember.user?.name ?? "Unknown"}</p>
              </div>
              {profileMember.user?.username && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Username</p>
                  <p>@{profileMember.user.username}</p>
                </div>
              )}
              {profileMember.user?.email && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Email</p>
                  <p>{profileMember.user.email}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Role</p>
                <p>{profileMember.assigned_role ?? profileMember.primary_role ?? "Role belum dipilih"}</p>
                {profileMember.backup_role && (
                  <p className="text-[11px] text-slate-500 mt-1">Backup: {profileMember.backup_role}</p>
                )}
              </div>
              {profileMember.is_leader && (
                <div className="text-amber-400 text-[12px]">Ketua Tim</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
