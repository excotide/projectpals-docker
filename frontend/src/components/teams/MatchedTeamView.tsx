import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../../hooks/useAuth";
import {
  useChangeMemberRole,
  useCreateTeamTarget,
  useDeleteTeamTarget,
  useFeedbackStatus,
  useFeedbacksGiven,
  useFeedbacksReceived,
  useFinishTeam,
  useGiveFeedback,
  useTeamTargets,
  useToggleTeamTarget,
  useTransferLeader,
  useUpdateTeam,
  useUpdateTeamTarget,
  type RoomTeam,
} from "../../hooks/useRooms";
import {
  computeProjectStatus,
  computeTargetStatus,
  formatDateTime,
  formatDateTimeShort,
  getAvatarColor,
  getInitials,
  isoToLocalInput,
  localInputToIso,
  type ProjectStatusVariant,
} from "../../utils/teamHelpers";
import { IconCrown, IconPencil, IconPlus, IconStar, IconTrash } from "../icons/TeamIcons";

const PROJECT_STATUS_PILL: Record<ProjectStatusVariant, string> = {
  running:  "border-blue-500 text-blue-400 bg-blue-500/10",
  late:     "border-orange-500 text-orange-400 bg-orange-500/10",
  done:     "border-emerald-500 text-emerald-400 bg-emerald-500/10",
  doneLate: "border-amber-500 text-amber-400 bg-amber-500/10",
};

export interface MatchedTeamViewProps {
  team: RoomTeam;
  roomCode: string;
  roomRoles: string[];
  roomInfo: {
    project_theme?: string;
    room_code?: string;
    status?: string;
    environments?: string[];
    created_at?: string;
  };
}

export default function MatchedTeamView({ team, roomCode, roomRoles, roomInfo }: MatchedTeamViewProps) {
  const { data: user } = useCurrentUser();

  const transferLeader  = useTransferLeader();
  const changeMemberRole = useChangeMemberRole();
  const updateTeam      = useUpdateTeam();
  const finishTeam      = useFinishTeam();
  const createTarget    = useCreateTeamTarget();
  const updateTarget    = useUpdateTeamTarget();
  const deleteTarget    = useDeleteTeamTarget();
  const toggleTarget    = useToggleTeamTarget();
  const targetsQuery    = useTeamTargets(team.id, { enabled: Boolean(team.id) });
  const feedbackStatusQuery = useFeedbackStatus(team.id, { enabled: Boolean(team.id) });
  const feedbacksGivenQuery = useFeedbacksGiven(team.id, { enabled: Boolean(team.id) });
  const giveFeedback = useGiveFeedback();

  const projectStatus = computeProjectStatus(team.deadline, team.finished_at);
  const isFinished = team.finished_at != null;
  // Judul + deadline proyek wajib terisi sebelum boleh menambah target / menyelesaikan proyek.
  const projectInfoComplete = Boolean(team.project_name?.trim()) && Boolean(team.deadline);
  const feedbackStatus = feedbackStatusQuery.data;
  const feedbacksGiven = feedbacksGivenQuery.data?.feedbacks ?? [];

  const teamMembers = team.members;

  // Target deadlines must fall between the room creation date and (when set) the
  // team's project deadline. Used as min/max on the datetime-local inputs.
  const targetDeadlineMin = isoToLocalInput(roomInfo.created_at);
  const targetDeadlineMax = isoToLocalInput(team.deadline);

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
  const [newTargetDeadlineByRole, setNewTargetDeadlineByRole] = useState<Record<string, string>>({});
  const [editingTargetId, setEditingTargetId] = useState<number | string | null>(null);
  const [editingTargetTitle, setEditingTargetTitle] = useState("");
  const [editingTargetDeadline, setEditingTargetDeadline] = useState("");
  const [targetErr, setTargetErr] = useState("");
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editProjectDeadline, setEditProjectDeadline] = useState("");
  const [editProjectErr, setEditProjectErr] = useState("");
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [finishErr, setFinishErr] = useState("");
  const [incompleteWarnOpen, setIncompleteWarnOpen] = useState(false);
  const [feedbackTargetId, setFeedbackTargetId] = useState<number | string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackErr, setFeedbackErr] = useState("");

  const profileFeedbacksQuery = useFeedbacksReceived(team.id, profileMemberId ?? undefined, {
    enabled: profileMemberId != null,
  });

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
    if (!projectInfoComplete) { setIncompleteWarnOpen(true); return; }
    const title = (newTargetByRole[role] ?? "").trim();
    if (!title) return;
    setTargetErr("");
    try {
      const deadlineRaw = (newTargetDeadlineByRole[role] ?? "").trim();
      const deadline = deadlineRaw ? localInputToIso(deadlineRaw) : null;
      await createTarget.mutateAsync({ teamId: team.id, role, title, deadline });
      setNewTargetByRole((prev) => ({ ...prev, [role]: "" }));
      setNewTargetDeadlineByRole((prev) => ({ ...prev, [role]: "" }));
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to add target."));
    }
  };

  const openEditTarget = (targetId: number | string, title: string, deadline: string | null) => {
    setTargetErr("");
    setEditingTargetId(targetId);
    setEditingTargetTitle(title);
    setEditingTargetDeadline(isoToLocalInput(deadline));
  };

  const handleSaveEditTarget = async () => {
    if (editingTargetId == null) return;
    const title = editingTargetTitle.trim();
    if (!title) return;
    setTargetErr("");
    try {
      const deadline = editingTargetDeadline ? localInputToIso(editingTargetDeadline) : null;
      await updateTarget.mutateAsync({ teamId: team.id, targetId: editingTargetId, title, deadline });
      setEditingTargetId(null);
      setEditingTargetTitle("");
      setEditingTargetDeadline("");
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setTargetErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to update target."));
    }
  };

  const openEditProject = () => {
    setEditProjectErr("");
    setEditProjectName(team.project_name ?? "");
    setEditProjectDescription(team.description ?? "");
    setEditProjectDeadline(isoToLocalInput(team.deadline));
    setEditProjectOpen(true);
  };

  const handleSaveProject = async () => {
    setEditProjectErr("");
    try {
      await updateTeam.mutateAsync({
        teamId: team.id,
        projectName: editProjectName.trim() || null,
        description: editProjectDescription.trim() || null,
        deadline: editProjectDeadline ? localInputToIso(editProjectDeadline) : null,
        roomCode,
      });
      setEditProjectOpen(false);
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setEditProjectErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to save project."));
    }
  };

  const handleConfirmFinish = async () => {
    setFinishErr("");
    try {
      await finishTeam.mutateAsync({ teamId: team.id, roomCode });
      setFinishConfirmOpen(false);
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setFinishErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to finish project."));
    }
  };

  const openFeedback = (roomMemberId: number | string) => {
    setFeedbackErr("");
    const existing = feedbacksGiven.find((f) => String(f.to_room_member_id) === String(roomMemberId));
    setFeedbackContent(existing?.content ?? "");
    setFeedbackRating(existing?.rating ?? 0);
    setFeedbackTargetId(roomMemberId);
    setActiveMemberMenuId(null);
  };

  const closeFeedback = () => {
    setFeedbackTargetId(null);
    setFeedbackContent("");
    setFeedbackRating(0);
    setFeedbackErr("");
  };

  const handleSaveFeedback = async () => {
    if (feedbackTargetId == null) return;
    if (feedbackRating < 1 || feedbackRating > 5) { setFeedbackErr("Pilih rating 1-5."); return; }
    setFeedbackErr("");
    try {
      await giveFeedback.mutateAsync({
        teamId: team.id,
        toRoomMemberId: feedbackTargetId,
        rating: feedbackRating,
        content: feedbackContent.trim(),
      });
      closeFeedback();
    } catch (err) {
      const anyErr = err as { payload?: { message?: string } };
      setFeedbackErr(anyErr?.payload?.message ?? (err instanceof Error ? err.message : "Failed to save feedback."));
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
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-pp-card border border-pp-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Team Information · Room: {roomInfo.project_theme ?? "-"}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <h2 className="text-xl font-semibold text-white truncate">
                  {team.project_name ?? <span className="text-slate-500 italic font-normal">Belum ada nama proyek</span>}
                </h2>
                <span className={`border text-[11px] px-2.5 py-0.5 rounded-full font-medium ${PROJECT_STATUS_PILL[projectStatus.variant]}`}>
                  {projectStatus.label}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">
                {team.description ?? <span className="text-slate-600 italic">Belum ada deskripsi.</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="border border-emerald-500 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                Team {team.team_number}
              </span>
              {currentUserIsLeader && (
                <button
                  onClick={openEditProject}
                  className="px-3 py-1 rounded-md border border-pp-border text-slate-300 hover:bg-white/5 text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Edit Proyek
                </button>
              )}
              {currentUserIsLeader && !isFinished && (
                <button
                  onClick={() => {
                    if (!projectInfoComplete) { setIncompleteWarnOpen(true); return; }
                    setFinishErr(""); setFinishConfirmOpen(true);
                  }}
                  className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Tandai Selesai
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Room Code</p>
              <p className="text-sm text-slate-200">{roomInfo.room_code ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Deadline Proyek</p>
              <p className="text-sm text-slate-200">{formatDateTime(team.deadline)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Roles</p>
              <p className="text-sm text-slate-200">
                {roomRoles.length > 0 ? roomRoles.join(", ") : "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">
                {isFinished ? "Diselesaikan" : "Environments"}
              </p>
              <p className="text-sm text-slate-200">
                {isFinished
                  ? formatDateTime(team.finished_at)
                  : ((roomInfo.environments ?? []).length > 0 ? (roomInfo.environments ?? []).join(", ") : "-")}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        {!isSelf && feedbackStatus?.my_room_member_id != null && (
                          <button
                            onClick={() => openFeedback(member.room_member_id)}
                            className="w-full text-left px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5 cursor-pointer border-t border-pp-border"
                          >
                            {feedbacksGiven.some((f) => String(f.to_room_member_id) === String(member.room_member_id)) ? "Edit Feedback" : "Beri Feedback"}
                          </button>
                        )}
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

      <aside className="w-full lg:w-[320px] lg:shrink-0 space-y-4">
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

          {currentUserIsLeader && !projectInfoComplete && (
            <button
              onClick={() => setIncompleteWarnOpen(true)}
              className="w-full mb-3 text-left bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 text-[11px] cursor-pointer hover:bg-amber-500/15 transition-colors"
            >
              Lengkapi judul & deadline proyek dulu sebelum menambah target.
            </button>
          )}

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
                      const tStatus = computeTargetStatus(t.deadline, t.completed_at, t.is_done);
                      const tStatusClass = tStatus.variant === "late"
                        ? "border-red-500/60 text-red-400 bg-red-500/10"
                        : tStatus.variant === "doneLate"
                          ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
                          : "";
                      return (
                        <li
                          key={t.id}
                          className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border ${
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
                            className="mt-0.5 shrink-0 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            title={canToggleHere ? "Centang target" : "Hanya anggota role ini yang bisa mencentang"}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] truncate ${t.is_done ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {t.title}
                            </p>
                            {(t.deadline || tStatus.label) && (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {t.deadline && (
                                  <span className="text-[10px] text-slate-500">🕓 {formatDateTimeShort(t.deadline)}</span>
                                )}
                                {tStatus.label && (
                                  <span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border ${tStatusClass}`}>
                                    {tStatus.label}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {currentUserIsLeader && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditTarget(t.id, t.title, t.deadline)}
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
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={draft}
                          onChange={(e) => setNewTargetByRole((prev) => ({ ...prev, [role]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddTarget(role); }}
                          placeholder="Tambah target..."
                          className="flex-1 min-w-0 bg-pp-elevated border border-pp-border rounded-md px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-blue-500 placeholder:text-slate-600"
                        />
                        <button
                          onClick={() => handleAddTarget(role)}
                          disabled={createTarget.isPending || (projectInfoComplete && !draft.trim())}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <IconPlus />
                        </button>
                      </div>
                      <input
                        type="datetime-local"
                        value={newTargetDeadlineByRole[role] ?? ""}
                        onChange={(e) => setNewTargetDeadlineByRole((prev) => ({ ...prev, [role]: e.target.value }))}
                        min={targetDeadlineMin || undefined}
                        max={targetDeadlineMax || undefined}
                        title="Deadline target (opsional)"
                        className="w-full bg-pp-elevated border border-pp-border rounded-md px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-blue-500"
                      />
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
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6 max-h-[85vh] overflow-y-auto">
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
              <div className="pt-3 border-t border-pp-border">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Feedback Diterima</p>
                {profileFeedbacksQuery.isLoading && (
                  <p className="text-[12px] text-slate-500">Loading...</p>
                )}
                {!profileFeedbacksQuery.isLoading && (profileFeedbacksQuery.data?.feedbacks ?? []).length === 0 && (
                  <p className="text-[12px] text-slate-500 italic">Belum ada feedback.</p>
                )}
                {(profileFeedbacksQuery.data?.feedbacks ?? []).length > 0 && (
                  <ul className="space-y-2">
                    {(profileFeedbacksQuery.data?.feedbacks ?? []).map((f) => (
                      <li key={f.id} className="bg-pp-elevated border border-pp-border rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <p className="text-[11px] text-slate-400">
                            Dari <span className="text-slate-200">{f.from_user?.name ?? "Anggota"}</span>
                          </p>
                          {f.rating != null && (
                            <span className="inline-flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <IconStar key={n} size={11} filled={n <= (f.rating ?? 0)} />
                              ))}
                            </span>
                          )}
                        </div>
                        {f.to_assigned_role && (
                          <p className="text-[10px] text-slate-500 mb-1">
                            dinilai sebagai <span className="text-blue-400">{f.to_assigned_role}</span>
                          </p>
                        )}
                        {f.content && f.content.trim() ? (
                          <p className="text-[12px] text-slate-200 whitespace-pre-wrap">{f.content}</p>
                        ) : (
                          <p className="text-[11px] text-slate-600 italic">Tanpa alasan.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!updateTeam.isPending) setEditProjectOpen(false); }}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">Edit Proyek</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Nama Proyek</label>
                <input
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="mis. Sistem Absensi Mahasiswa"
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Deskripsi</label>
                <textarea
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi singkat proyek..."
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Deadline Proyek</label>
                <input
                  type="datetime-local"
                  value={editProjectDeadline}
                  onChange={(e) => setEditProjectDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
            {editProjectErr && (
              <div className="mt-4 bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px]">
                {editProjectErr}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditProjectOpen(false)}
                disabled={updateTeam.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={updateTeam.isPending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {updateTeam.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {finishConfirmOpen && (() => {
        const deadlinePassed = team.deadline ? Date.now() > new Date(team.deadline).getTime() : false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!finishTeam.isPending) setFinishConfirmOpen(false); }}
            />
            <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
              <h3 className="text-base font-bold text-slate-100 mb-2">Tandai proyek selesai?</h3>
              <p className="text-sm text-[#8892a4] mb-3">
                Sekali ditandai selesai, posisi ini tidak bisa dibatalkan. Status proyek akan menjadi{" "}
                <strong className="text-slate-200">
                  {deadlinePassed ? "\"Finished Late\"" : "\"Finished\""}
                </strong>.
              </p>
              {deadlinePassed && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 text-[12px]">
                  Deadline proyek sudah lewat ({formatDateTime(team.deadline)}). Proyek akan tercatat sebagai Finished Late.
                </div>
              )}
              {feedbackStatus && !feedbackStatus.complete && feedbackStatus.total_required > 0 && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg px-3 py-2 text-red-300 text-[12px]">
                  ❌ Proyek belum bisa diselesaikan. <strong className="text-red-200">{feedbackStatus.total_given}/{feedbackStatus.total_required}</strong> anggota sudah memberi feedback ke <em>semua</em> anggota lain. Setiap anggota wajib memberi feedback ke seluruh anggota team.
                </div>
              )}
              {finishErr && (
                <div className="bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px] mb-4">
                  {finishErr}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setFinishConfirmOpen(false)}
                  disabled={finishTeam.isPending}
                  className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFinish}
                  disabled={finishTeam.isPending || (feedbackStatus != null && !feedbackStatus.complete)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={feedbackStatus && !feedbackStatus.complete ? "Tunggu semua anggota memberi feedback" : ""}
                >
                  {finishTeam.isPending ? "Menyimpan..." : "Ya, Tandai Selesai"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {incompleteWarnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIncompleteWarnOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-2">Lengkapi proyek terlebih dahulu</h3>
            <p className="text-sm text-[#8892a4] mb-5">
              Isi <strong className="text-slate-200">judul</strong> dan <strong className="text-slate-200">deadline</strong> proyek terlebih dahulu sebelum menambah target atau menyelesaikan proyek.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIncompleteWarnOpen(false)}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => { setIncompleteWarnOpen(false); openEditProject(); }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Edit Proyek
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTargetId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!updateTarget.isPending) setEditingTargetId(null); }}
          />
          <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">Edit Target</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Judul</label>
                <input
                  value={editingTargetTitle}
                  onChange={(e) => setEditingTargetTitle(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-medium">Deadline (opsional)</label>
                <input
                  type="datetime-local"
                  value={editingTargetDeadline}
                  onChange={(e) => setEditingTargetDeadline(e.target.value)}
                  min={targetDeadlineMin || undefined}
                  max={targetDeadlineMax || undefined}
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors"
                />
                {editingTargetDeadline && (
                  <button
                    onClick={() => setEditingTargetDeadline("")}
                    className="mt-1 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Hapus deadline
                  </button>
                )}
              </div>
            </div>
            {targetErr && (
              <div className="mt-4 bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px]">
                {targetErr}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEditingTargetId(null); setEditingTargetTitle(""); setEditingTargetDeadline(""); }}
                disabled={updateTarget.isPending}
                className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTarget}
                disabled={updateTarget.isPending || !editingTargetTitle.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {updateTarget.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackTargetId != null && (() => {
        const targetMemberForFb = teamMembers.find((m) => m.room_member_id === feedbackTargetId);
        const existing = feedbacksGiven.find((f) => String(f.to_room_member_id) === String(feedbackTargetId));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!giveFeedback.isPending) closeFeedback(); }}
            />
            <div className="relative z-10 w-full max-w-md bg-[#161b23] border border-[#252c2e] rounded-2xl shadow-2xl shadow-black/50 p-6">
              <h3 className="text-base font-bold text-slate-100 mb-2">
                {existing ? "Edit Feedback" : "Beri Feedback"}
              </h3>
              <div className="mb-4">
                <p className="text-sm text-[#8892a4]">
                  Untuk <strong className="text-slate-200">{targetMemberForFb?.user?.name ?? "anggota"}</strong>
                </p>
                {targetMemberForFb?.assigned_role && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dinilai pada role <span className="text-blue-400 font-medium">{targetMemberForFb.assigned_role}</span>
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-medium">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFeedbackRating(n)}
                      className={`p-1 transition-colors cursor-pointer ${
                        n <= feedbackRating ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                      title={`${n} bintang`}
                    >
                      <IconStar size={24} filled={n <= feedbackRating} />
                    </button>
                  ))}
                  <span className="ml-2 text-[11px] text-slate-500">
                    {feedbackRating > 0 ? `${feedbackRating}/5` : "Belum pilih"}
                  </span>
                </div>
              </div>
              <div className="mb-1">
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-medium">Alasan / Deskripsi <span className="lowercase text-slate-600 tracking-normal">(opsional)</span></label>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Boleh dikosongkan. Kalau diisi: kenapa kasih rating ini? Kontribusi, kerja sama, dll..."
                  className="w-full px-4 py-2.5 bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600 resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-right">{feedbackContent.length}/1000</p>
              </div>
              {feedbackErr && (
                <div className="mt-3 bg-[#1f0a0a] border border-red-500 rounded-lg px-3 py-2 text-red-400 text-[12px]">
                  {feedbackErr}
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={closeFeedback}
                  disabled={giveFeedback.isPending}
                  className="flex-1 py-2.5 bg-transparent border border-[#252c2e] rounded-xl text-[#8892a4] hover:text-slate-300 hover:border-[#3d4a5a] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFeedback}
                  disabled={giveFeedback.isPending || feedbackRating < 1}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 border-none rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {giveFeedback.isPending ? "Saving..." : "Simpan Feedback"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
