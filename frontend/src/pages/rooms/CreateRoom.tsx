import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useCreateRoom, useFinalizeJoinRoom } from "../../hooks/useRooms";
import { useDebounce } from "../../hooks/useDebounce";
import { useSidebarNavigation } from "../../hooks/useSidebarNavigation";
import { apiPost } from "../../lib/api";
import { toggleFlexible } from "../../lib/flexibleSelection";
import {
  PRODUCTIVITY_SLOTS,
  WORK_ENV_SLOTS,
  TIME_FLEX,
  TIME_REALS,
  ENV_FLEX,
  ENV_REALS,
  toWindowValue,
  toEnvValue,
} from "../../lib/preferences";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// Shape returned by POST /api/normalize-role (read-only preview).
interface NormalizeResult {
  original: string;
  normalized: string;
  changed: boolean;
}

// ============================================================
// TYPES
// ============================================================
type Screen = "form" | "configure" | "success" | "info";

// ============================================================
// SUB-COMPONENT: NumberInput
// ============================================================
function NumberInput({ value, onChange, icon, min = 1 }: {
  value: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
  min?: number;
}) {
  return (
    <div className="flex items-center bg-pp-bg border border-pp-border rounded-lg px-[14px] py-[10px] gap-2.5">
      <span className="text-blue-500 shrink-0">{icon}</span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        className="bg-transparent border-none outline-none text-slate-100 text-[15px] font-medium w-full"
      />
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: ScreenSuccess
// ============================================================
function ScreenSuccess({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10">
      <div className="relative w-[88px] h-[88px]">
        <svg viewBox="0 0 88 88" fill="none" className="w-[88px] h-[88px]">
          <circle cx="44" cy="44" r="40" stroke="rgba(74,222,128,0.2)" strokeWidth="3" />
          <circle cx="44" cy="44" r="40" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="251" strokeDashoffset="0" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <h2 className="m-0 text-[26px] font-extrabold text-slate-50">Room Created!</h2>
      <p className="m-0 text-[13px] text-slate-500 text-center max-w-[260px] leading-relaxed">
        Your collaboration workspace is ready. View the room details and share the code.
      </p>
      <button
        onClick={onNext}
        className="px-10 py-3 bg-blue-600 hover:bg-blue-700 border-none rounded-[10px] text-white text-sm font-bold cursor-pointer mt-2 transition-colors duration-200"
      >
        View Room Details
      </button>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: ScreenInfo
// ============================================================
function ScreenInfo({ name, roles, maxPerGroup, numGroups, roomCode, onDone }: {
  name: string;
  roles: string[];
  maxPerGroup: number;
  numGroups: number;
  roomCode: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[480px] mx-auto pt-8 pb-10 w-full">
      <div>
        <h2 className="m-0 mb-1.5 text-2xl font-extrabold text-slate-50">Room Created</h2>
        <p className="m-0 text-[13px] text-slate-500">Review your room and share the code with your team.</p>
      </div>

      <div className="bg-pp-card border border-pp-border rounded-2xl p-6 flex flex-col gap-5">
        {/* Name */}
        <div>
          <p className="m-0 mb-1 text-[11px] text-slate-600 uppercase tracking-[0.08em] font-semibold">Room Name</p>
          <p className="m-0 text-[18px] font-bold text-slate-50">{name || "My Room"}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          {[
            { num: maxPerGroup, lbl: "Max Members" },
            { num: numGroups, lbl: "Teams" },
            { num: roles.length, lbl: "Roles Defined" },
          ].map(({ num, lbl }) => (
            <div key={lbl}>
              <p className="m-0 mb-0.5 text-[22px] font-extrabold text-blue-500">{num}</p>
              <p className="m-0 text-[11px] text-slate-500 leading-tight">{lbl}</p>
            </div>
          ))}
        </div>

        {/* Room code */}
        <div>
          <p className="m-0 mb-2 text-[11px] text-slate-600 uppercase tracking-[0.08em] font-semibold">Room Code</p>
          <div className="flex items-center justify-between bg-pp-bg border border-pp-border rounded-[10px] px-[18px] py-[14px]">
            <span className="font-mono text-[22px] font-bold text-slate-100 tracking-[0.2em]">{roomCode}</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-[14px] py-2 border-none rounded-[7px] text-xs font-semibold cursor-pointer transition-all duration-200 ${
                copied ? "bg-emerald-900 text-emerald-400" : "bg-pp-border text-slate-400 hover:text-slate-200"
              }`}
            >
              {copied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full py-[14px] bg-blue-600 hover:bg-blue-700 border-none rounded-[10px] text-white text-[15px] font-bold cursor-pointer transition-colors duration-200 tracking-[0.3px]"
      >
        Go to Room
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: CreateRoom
// ============================================================
export default function CreateRoom() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const createRoomMutation = useCreateRoom();

  const { activeNav, handleNavClick } = useSidebarNavigation("Create Room");
  const [loggingOut, setLoggingOut] = useState(false);
  const [screen, setScreen] = useState<Screen>("form");

  const [projectName, setProjectName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [rolePreview, setRolePreview] = useState<NormalizeResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const roleFieldRef = useRef<HTMLDivElement>(null);
  const debouncedRoleInput = useDebounce(roleInput, 500);
  const [maxMembers, setMaxMembers] = useState(10);
  const [numGroups, setNumGroups] = useState(2);
  const [createRoomOnly, setCreateRoomOnly] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Owner profile setup (shown after create when not "Create Room Only").
  const finalizeJoinMutation = useFinalizeJoinRoom();
  const [createdRoles, setCreatedRoles] = useState<string[]>([]);
  const [ownerPrimary, setOwnerPrimary] = useState("");
  const [ownerBackups, setOwnerBackups] = useState<string[]>([]);
  const [ownerWindows, setOwnerWindows] = useState<string[]>([]);
  const [ownerEnvs, setOwnerEnvs] = useState<string[]>([]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const validRoles = roles; // all entries are already trimmed non-empty
  const canCreate = projectName.trim().length > 0 && validRoles.length >= 2 && !submitting;

  const perTeam = numGroups > 0 ? Math.ceil(maxMembers / numGroups) : 0;

  const addRoleValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles([...roles, trimmed]);
    setRoleInput("");
    setRolePreview(null);
    setDropdownOpen(false);
  };
  const addRole = () => addRoleValue(roleInput);
  const deleteRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));

  // Live preview: ask the backend how the typed role will be normalized.
  useEffect(() => {
    const trimmed = debouncedRoleInput.trim();
    if (!trimmed) {
      setRolePreview(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    apiPost<NormalizeResult>("/normalize-role", { role: trimmed })
      .then((res) => {
        if (!cancelled) setRolePreview(res.data);
      })
      .catch(() => {
        if (!cancelled) setRolePreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedRoleInput]);

  // Dismiss the role dropdown on outside click or Escape.
  useEffect(() => {
    if (!dropdownOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (roleFieldRef.current && !roleFieldRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login", { replace: true }); return; }

    setErrorMessage("");
    setSubmitting(true);
    try {
      const normalizedRoles = await Promise.all(
        validRoles.map(async (role) => {
          try {
            const res = await apiPost<NormalizeResult>("/normalize-role", { role });
            return res.data.normalized || role;
          } catch {
            return role;
          }
        })
      );

      const createdRoom = await createRoomMutation.mutateAsync({
        project_theme: projectName.trim(),
        roles: normalizedRoles,
        max_members: maxMembers,
        max_per_group: perTeam,
        number_of_groups: numGroups,
        create_room_only: createRoomOnly,
      });

      setRoomCode(createdRoom?.room_code ?? "");
      setCreatedRoles(normalizedRoles);
      // When the owner joins as a member, let them set their own profile first.
      setScreen(createRoomOnly ? "success" : "configure");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (roomCode) { navigate(`/rooms/${roomCode}`); return; }
    setScreen("form"); setProjectName(""); setRoles([]); setRoleInput("");
    setMaxMembers(10); setNumGroups(2); setCreateRoomOnly(false); setRoomCode(""); setErrorMessage("");
    setCreatedRoles([]); setOwnerPrimary(""); setOwnerBackups([]); setOwnerWindows([]); setOwnerEnvs([]);
  };

  // ── Owner profile setup (configure screen) ──
  const pickOwnerPrimary = (role: string) => {
    setOwnerPrimary((prev) => (prev === role ? "" : role));
    setOwnerBackups((prev) => prev.filter((b) => b !== role));
  };
  const pickOwnerBackup = (role: string) => {
    setOwnerPrimary((prev) => (prev === role ? "" : prev));
    setOwnerBackups((prev) => (prev.includes(role) ? prev.filter((b) => b !== role) : [...prev, role]));
  };
  const toggleOwnerWindow = (id: string) =>
    setOwnerWindows((prev) => toggleFlexible(prev, id, { flex: TIME_FLEX, reals: TIME_REALS }));
  const toggleOwnerEnv = (id: string) =>
    setOwnerEnvs((prev) => toggleFlexible(prev, id, { flex: ENV_FLEX, reals: ENV_REALS }));

  const canFinishProfile =
    ownerPrimary !== "" && ownerBackups.length > 0 && ownerWindows.length > 0 && ownerEnvs.length > 0 && !submitting;

  const handleSaveOwnerProfile = async () => {
    if (!canFinishProfile || !roomCode) return;
    setErrorMessage("");
    setSubmitting(true);
    try {
      await finalizeJoinMutation.mutateAsync({
        roomCode,
        primaryRole: ownerPrimary,
        backupRoles: ownerBackups,
        productivityWindows: ownerWindows.map(toWindowValue).filter((v): v is string => v !== null),
        environments: ownerEnvs.map(toEnvValue).filter((v): v is string => v !== null),
      });
      setScreen("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan profil.");
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (content: React.ReactNode) => (
    <div className="flex h-screen bg-pp-bg font-sans text-slate-100 overflow-hidden">
      <Sidebar activeNav={activeNav} onNavClick={handleNavClick} loggingOut={loggingOut} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          initials={initials}
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Create Room" },
          ]}
        />
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 pb-10">{content}</main>
      </div>
    </div>
  );

  if (screen === "configure") return shell(
    <div className="flex flex-col gap-6 max-w-[560px] mx-auto pt-4 pb-10 w-full">
      <div>
        <h2 className="m-0 mb-1.5 text-2xl font-extrabold text-slate-50">Atur Profil Kamu</h2>
        <p className="m-0 text-[13px] text-slate-500">
          Kamu ikut sebagai anggota room ini. Pilih role dan preferensi kerjamu untuk proses matching.
        </p>
      </div>

      {errorMessage && (
        <div className="px-4 py-3 bg-[#1f0a0a] border border-red-500 rounded-lg text-red-400 text-[13px]">
          {errorMessage}
        </div>
      )}

      {/* Role selection */}
      <div className="bg-pp-card border border-pp-border rounded-2xl p-6">
        <p className="m-0 mb-1 text-[13px] text-slate-400 font-medium">
          Pilih Role <span className="text-slate-600 font-normal">(1 primary &amp; backup berurutan)</span>
        </p>
        <p className="m-0 mb-3 text-[11px] text-slate-600">
          Urutan backup menentukan prioritas (backup 1 lebih diutamakan dari backup 2).
        </p>
        <div className="flex flex-col gap-2">
          {createdRoles.map((role) => {
            const isPrimary = ownerPrimary === role;
            const backupRank = ownerBackups.indexOf(role);
            const isBackup = backupRank >= 0;
            return (
              <div
                key={role}
                className="flex items-center justify-between gap-3 bg-pp-bg border border-pp-border rounded-lg px-4 py-2.5"
              >
                <span className="text-sm text-slate-200 truncate">{role}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => pickOwnerPrimary(role)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      isPrimary ? "bg-blue-500 text-white" : "bg-pp-border text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Primary
                  </button>
                  <button
                    onClick={() => pickOwnerBackup(role)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 ${
                      isBackup ? "bg-indigo-500 text-white" : "bg-pp-border text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Backup
                    {isBackup && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 text-[10px] font-bold">
                        {backupRank + 1}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Productivity Windows */}
      <div className="bg-pp-card border border-pp-border rounded-2xl p-6">
        <p className="m-0 text-[13px] text-slate-400 font-medium">Productivity Windows</p>
        <p className="m-0 mt-1 text-[11px] text-slate-600">
          Pilih hingga 2. Pilih ketiganya untuk otomatis jadi <span className="text-blue-400">Flexible</span>.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {PRODUCTIVITY_SLOTS.map((t) => {
            const active = ownerWindows.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleOwnerWindow(t.id)}
                className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                  active ? "border-blue-500/50 bg-blue-500/5" : "border-pp-border bg-pp-elevated hover:border-blue-500/40"
                }`}
              >
                <div className="text-[10px] font-semibold text-blue-500 tracking-[0.08em] uppercase mb-2">{t.short}</div>
                <div className={`text-[13px] font-semibold ${active ? "text-blue-400" : "text-slate-100"}`}>{t.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t.range}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Environment */}
      <div className="bg-pp-card border border-pp-border rounded-2xl p-6">
        <p className="m-0 text-[13px] text-slate-400 font-medium">Work Environment</p>
        <p className="m-0 mt-1 text-[11px] text-slate-600">
          Pilih hingga 2. Pilih ketiganya untuk otomatis jadi <span className="text-blue-400">Flexible</span>.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {WORK_ENV_SLOTS.map((e) => {
            const active = ownerEnvs.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggleOwnerEnv(e.id)}
                className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                  active ? "border-blue-500/50 bg-blue-500/5" : "border-pp-border bg-pp-elevated hover:border-blue-500/40"
                }`}
              >
                <div className="text-[10px] font-semibold text-blue-500 tracking-[0.08em] uppercase mb-2">{e.short}</div>
                <div className={`text-[13px] font-semibold ${active ? "text-blue-400" : "text-slate-100"}`}>{e.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{e.range}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSaveOwnerProfile}
        disabled={!canFinishProfile}
        className={`w-full py-[14px] border-none rounded-[10px] text-[15px] font-bold cursor-pointer transition-colors duration-200 tracking-[0.3px] ${
          canFinishProfile ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-pp-border text-slate-600 cursor-not-allowed"
        }`}
      >
        {submitting ? "Menyimpan..." : "Lanjut"}
      </button>
    </div>
  );
  if (screen === "success") return shell(<ScreenSuccess onNext={() => setScreen("info")} />);
  if (screen === "info")    return shell(<ScreenInfo name={projectName} roles={validRoles} maxPerGroup={maxMembers} numGroups={numGroups} roomCode={roomCode} onDone={handleDone} />);

  return shell(
    <>
      {/* Error banner */}
      {errorMessage && (
        <div className="mb-4 px-4 py-3 bg-[#1f0a0a] border border-red-500 rounded-lg text-red-400 text-[13px]">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 items-start lg:grid-cols-[1fr_380px]">
        {/* ── Card 1: Project Identity ── */}
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            <h2 className="m-0 text-xl font-bold text-slate-50">Project Identity</h2>
          </div>

          {/* Project name */}
          <div className="mb-5">
            <label className="block text-[13px] text-slate-400 mb-2 font-medium">Project Name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Next-Gen Decentralized Energy Grid"
              className="w-full px-4 py-[11px] bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors duration-200 placeholder:text-slate-600"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="block text-[13px] text-slate-400 mb-2.5 font-medium">
              Role Definitions <span className="text-slate-600 font-normal">(min. 2)</span>
            </label>

            {/* Input + Add button (+ normalization dropdown) */}
            <div ref={roleFieldRef} className="relative mb-3">
              <div className="flex gap-2">
                <input
                  value={roleInput}
                  onChange={(e) => {
                    setRoleInput(e.target.value);
                    setDropdownOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => roleInput.trim() && setDropdownOpen(true)}
                  onKeyDown={(e) => e.key === "Enter" && addRole()}
                  placeholder="e.g. Frontend Developer"
                  className="flex-1 px-4 py-[11px] bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors duration-200 placeholder:text-slate-600"
                />
                <button
                  onClick={addRole}
                  disabled={!roleInput.trim() || roles.includes(roleInput.trim())}
                  className="flex items-center gap-1.5 px-4 h-[42px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer shrink-0 transition-colors duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add
                </button>
              </div>

              {/* Normalization suggestion dropdown */}
              {dropdownOpen && roleInput.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-pp-card border border-pp-border rounded-lg shadow-xl overflow-hidden">
                  {previewLoading ? (
                    <div className="px-4 py-2.5 text-[12px] text-slate-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                      memeriksa…
                    </div>
                  ) : rolePreview ? (
                    /* Suggestion: normalized canonical */
                    <button
                      type="button"
                      disabled={roles.includes(rolePreview.normalized)}
                      onClick={() => addRoleValue(rolePreview.normalized)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left border-none bg-transparent hover:bg-pp-elevated disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
                    >
                      <span className="flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z"/></svg>
                        <span className="text-sm font-mono text-blue-400">{rolePreview.normalized}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 uppercase tracking-wide shrink-0">
                        {roles.includes(rolePreview.normalized) ? "sudah ada" : "saran"}
                      </span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Added roles list */}
            {roles.length === 0 ? (
              <p className="text-xs text-slate-600 italic px-1">
                No roles added yet. Add at least 2 roles to continue.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {roles.map((role, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-pp-bg border border-pp-border rounded-lg px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm text-slate-200">{role}</span>
                    </div>
                    <button
                      onClick={() => deleteRole(i)}
                      title="Remove role"
                      className="text-slate-600 hover:text-red-400 transition-colors duration-150 p-0.5 rounded cursor-pointer border-none bg-transparent"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Card 2: Project Scale (row-span-2) ── */}
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7 lg:row-span-2">
          <div className="flex items-center gap-2.5 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h2 className="m-0 text-xl font-bold text-slate-50">Project Scale</h2>
          </div>

          <div className="mb-5">
            <label className="block text-[13px] text-slate-400 mb-2 font-medium">Max member room</label>
            <NumberInput value={maxMembers} onChange={setMaxMembers} min={2}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
            />
            <p className="text-[11px] text-slate-600 mt-1.5">Total maksimal anggota yang boleh join room ini.</p>
          </div>

          <div className="mb-6">
            <label className="block text-[13px] text-slate-400 mb-2 font-medium">Number of Teams</label>
            <NumberInput value={numGroups} onChange={setNumGroups} min={2}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
            />
          </div>

          <div className="border-t border-pp-border mb-5" />

          {/* Capacity estimate */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-sm text-slate-400">Total Kapasitas:</span>
              <span className="text-sm font-bold text-blue-500">{maxMembers} Members</span>
            </div>
            <p className="text-[12px] text-slate-500">
              {numGroups} team · ~{perTeam} member per team (otomatis)
            </p>
          </div>

          {/* Create Room Only */}
          <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={createRoomOnly}
              onChange={(e) => setCreateRoomOnly(e.target.checked)}
              className="mt-0.5 shrink-0 accent-blue-500 cursor-pointer"
            />
            <span>
              <span className="block text-[13px] text-slate-300 font-medium">Create Room Only</span>
              <span className="block text-[11px] text-slate-600 leading-relaxed">
                Buat room tanpa ikut jadi anggota — kamu hanya memantau, tidak ikut dimatch ke team.
              </span>
            </span>
          </label>

          {/* Validation hint */}
          {!canCreate && !submitting && (
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {projectName.trim().length === 0
                ? "Enter a project name to continue."
                : validRoles.length < 2
                ? `Add at least ${2 - validRoles.length} more role(s) to continue.`
                : ""}
            </p>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`w-full py-[13px] border-none rounded-[10px] text-[15px] font-bold cursor-pointer mt-4 transition-colors duration-200 tracking-[0.3px] ${
              canCreate
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-pp-border text-slate-600 cursor-not-allowed"
            } ${submitting ? "opacity-70" : ""}`}
          >
            {submitting ? "Creating..." : "Create Room"}
          </button>
        </div>
      </div>

      {/* Pro-Tip */}
      <div className="mt-5 bg-[#0a1628] border border-[#164e63] rounded-xl px-[22px] py-[18px] flex gap-3.5 items-start">
        <div className="shrink-0 mt-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="m-0 mb-1.5 font-bold text-sm bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Pro-Tip for Precision Collaboration
          </p>
          <p className="m-0 text-[13px] text-slate-500 leading-relaxed">
            ProjectPals uses an advanced compatibility matrix. Defining specific roles and work
            windows increases team cohesion and project success rates by up to 40% based on our
            current collaborative datasets.
          </p>
        </div>
      </div>
    </>
  );
}
