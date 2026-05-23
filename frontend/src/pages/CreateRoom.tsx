import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { useCreateRoom } from "../hooks/useRooms";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// ============================================================
// TYPES
// ============================================================
type ProductivityWindow = "Morning" | "Afternoon" | "Evening" | "Flexible-Time";
type WorkEnvironment = "Private" | "Public" | "Online" | "Flexible-Work";
type Screen = "form" | "success" | "info";

// ============================================================
// ICON HELPERS
// ============================================================
function SunIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function MoonIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; }
function GlobeIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function LockIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function InfinityIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/><path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/></svg>; }
function ZapIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }

// ============================================================
// SUB-COMPONENT: ToggleChip
// ============================================================
function ToggleChip({ label, icon, selected, onClick }: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-150 whitespace-nowrap border ${
        selected
          ? "border-blue-500 text-blue-500 font-semibold"
          : "border-pp-chip text-slate-500 font-normal hover:border-blue-500/50 hover:text-slate-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

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
            { num: maxPerGroup, lbl: "Members / Group" },
            { num: numGroups, lbl: "Groups" },
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

  const [activeNav, setActiveNav] = useState("Create Room");
  const [loggingOut, setLoggingOut] = useState(false);
  const [screen, setScreen] = useState<Screen>("form");

  const [projectName, setProjectName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [numGroups, setNumGroups] = useState(2);
  const [selectedWindows, setSelectedWindows] = useState<Set<ProductivityWindow>>(new Set(["Morning"]));
  const [selectedEnvs, setSelectedEnvs] = useState<Set<WorkEnvironment>>(new Set(["Online"]));

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const validRoles = roles; // all entries are already trimmed non-empty
  const canCreate = projectName.trim().length > 0 && validRoles.length >= 2 && !submitting;

  const poolMin = maxMembers * numGroups;
  const poolMax = poolMin + 2;

  function toggleSet<T>(set: Set<T>, item: T): Set<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item); else next.add(item);
    return next;
  }

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles([...roles, trimmed]);
    setRoleInput("");
  };
  const deleteRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === "Dashboard") navigate("/dashboard");
    if (label === "Join Room")  navigate("/join-room");
    if (label === "My Rooms")   navigate("/my-rooms");
  };

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
      const created = await createRoomMutation.mutateAsync({
        name: projectName.trim(),
        roles: validRoles,
        maxPerGroup: maxMembers,
        numGroups,
      });
      setRoomCode(typeof created?.room_code === "string" ? created.room_code : "");
      setScreen("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (roomCode) { navigate(`/rooms/${roomCode}`); return; }
    setScreen("form"); setProjectName(""); setRoles([]); setRoleInput("");
    setMaxMembers(5); setNumGroups(2); setRoomCode(""); setErrorMessage("");
  };

  const productivityOptions: { key: ProductivityWindow; label: string; icon: React.ReactNode }[] = [
    { key: "Morning",       label: "Morning",   icon: <SunIcon /> },
    { key: "Afternoon",     label: "Afternoon", icon: <SunIcon /> },
    { key: "Evening",       label: "Evening",   icon: <MoonIcon /> },
    { key: "Flexible-Time", label: "Flexible",  icon: <InfinityIcon /> },
  ];
  const envOptions: { key: WorkEnvironment; label: string; icon: React.ReactNode }[] = [
    { key: "Private",      label: "Private",  icon: <LockIcon /> },
    { key: "Public",       label: "Public",   icon: <GlobeIcon /> },
    { key: "Online",       label: "Online",   icon: <GlobeIcon /> },
    { key: "Flexible-Work", label: "Flexible", icon: <ZapIcon /> },
  ];

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
        <main className="flex-1 overflow-y-auto px-8 py-7 pb-10">{content}</main>
      </div>
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

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "1fr 380px", gridTemplateRows: "auto auto" }}>
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

            {/* Input + Add button */}
            <div className="flex gap-2 mb-3">
              <input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
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
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7 row-span-2">
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
            <label className="block text-[13px] text-slate-400 mb-2 font-medium">Max members per group</label>
            <NumberInput value={maxMembers} onChange={setMaxMembers} min={2}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
            />
          </div>

          <div className="mb-6">
            <label className="block text-[13px] text-slate-400 mb-2 font-medium">Number of groups</label>
            <NumberInput value={numGroups} onChange={setNumGroups} min={2}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
            />
          </div>

          <div className="border-t border-pp-border mb-5" />

          {/* Pool estimate */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-sm text-slate-400">Estimated Pool Size:</span>
              <span className="text-sm font-bold text-blue-500">{poolMin}–{poolMax} Members</span>
            </div>
            <div className="bg-pp-border rounded-full h-1 overflow-hidden">
              <div className="w-2/5 h-full bg-blue-500 rounded-full" />
            </div>
          </div>

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

        {/* ── Card 3: Collaboration Logistics ── */}
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <h2 className="m-0 text-xl font-bold text-slate-50">Collaboration Logistics</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="m-0 mb-3 text-[13px] text-slate-400 font-medium">Productivity Windows</p>
              <div className="grid grid-cols-2 gap-2">
                {productivityOptions.map((opt) => (
                  <ToggleChip key={opt.key} label={opt.label} icon={opt.icon}
                    selected={selectedWindows.has(opt.key)}
                    onClick={() => setSelectedWindows(toggleSet(selectedWindows, opt.key))}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="m-0 mb-3 text-[13px] text-slate-400 font-medium">Work Environment</p>
              <div className="grid grid-cols-2 gap-2">
                {envOptions.map((opt) => (
                  <ToggleChip key={opt.key} label={opt.label} icon={opt.icon}
                    selected={selectedEnvs.has(opt.key)}
                    onClick={() => setSelectedEnvs(toggleSet(selectedEnvs, opt.key))}
                  />
                ))}
              </div>
            </div>
          </div>
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
