import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { useFinalizeJoinRoom, useJoinRoomPreview } from "../hooks/useRooms";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

type Step = "landing" | "role" | "hours" | "success" | "invalid";
type RoleType = "primary" | "backup";

interface Role {
  id: string;
  name: string;
  sub: string;
  icon: ReactNode;
}

interface TimeSlot {
  id: string;
  short: string;
  name: string;
  range: string;
}

const ROLE_ICONS: ReactNode[] = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    </svg>
  ),
];

const times: TimeSlot[] = [
  { id: "mor", short: "AM",  name: "Morning",   range: "6AM – 12PM" },
  { id: "aft", short: "PM",  name: "Afternoon", range: "12PM – 6PM" },
  { id: "eve", short: "EVE", name: "Evening",   range: "6PM – 12AM" },
  { id: "fle", short: "ALL", name: "Flexible",  range: "Anytime"    },
];

const ROLE_TYPES: RoleType[] = ["primary", "backup"];
const TOTAL_STEPS = 3;

const STEP_MAP: Partial<Record<Step, number>> = {
  landing: 1,
  role: 2,
  hours: 3,
};

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function JoinRoom() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const [step, setStep] = useState<Step>("landing");
  const [code, setCode] = useState("");
  const [roleType, setRoleType] = useState<Record<string, RoleType>>({});
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [roomRoles, setRoomRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeNav, setActiveNav] = useState("Join Room");
  const [loggingOut, setLoggingOut] = useState(false);
  const joinPreviewQuery = useJoinRoomPreview(code.trim().toUpperCase());
  const finalizeJoinMutation = useFinalizeJoinRoom();

  const stepNum = STEP_MAP[step] ?? 1;
  const pct = Math.round(((stepNum - 1) / TOTAL_STEPS) * 100);

  const go = (s: Step) => { setErrorMessage(""); setStep(s); };

  const submit = async () => {
    setErrorMessage("");
    if (code.trim().length !== 6) { go("invalid"); return; }

    const token = localStorage.getItem("token");
    if (!token) { navigate("/login", { replace: true }); return; }

    setSubmitting(true);
    try {
      const previewResult = await joinPreviewQuery.refetch();
      const fetchedRoles = Array.isArray(previewResult.data?.roles) ? previewResult.data.roles : [];
      if (fetchedRoles.length < 2) {
        setErrorMessage("Room belum memiliki minimal 2 role untuk proses matching.");
        go("invalid");
        return;
      }

      const mappedRoles: Role[] = fetchedRoles.map((roleName: string, index: number) => ({
        id: `role-${index}`,
        name: roleName,
        sub: "Role defined by room owner",
        icon: ROLE_ICONS[index % ROLE_ICONS.length],
      }));

      setRoleType({});
      setSelectedTimes([]);
      setRoomRoles(mappedRoles);
      go("role");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data room. Coba lagi.");
      go("invalid");
    } finally {
      setSubmitting(false);
    }
  };

  const toWindowValue = (timeId: string): string | null => {
    const map: Record<string, string> = { mor: "morning", aft: "afternoon", eve: "evening", fle: "flexible" };
    return map[timeId] ?? null;
  };

  const handleJoinRoom = async () => {
    if (submitting || selectedTimes.length === 0) return;
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login", { replace: true }); return; }

    const primaryRoleId = Object.keys(roleType).find((id) => roleType[id] === "primary");
    const backupRoleId = Object.keys(roleType).find((id) => roleType[id] === "backup");
    const windows = selectedTimes.map(toWindowValue).filter((v): v is string => v !== null);

    setSubmitting(true);
    setErrorMessage("");
    try {
      await finalizeJoinMutation.mutateAsync({
        roomCode: code.trim().toUpperCase(),
        primaryRole: roomRoles.find((r) => r.id === primaryRoleId)?.name,
        backupRole: roomRoles.find((r) => r.id === backupRoleId)?.name,
        productivityWindows: windows,
      });
      go("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const assignRole = (id: string, type: RoleType) => {
    setRoleType((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k] === type) delete next[k]; });
      if (next[id] === type) delete next[id];
      else next[id] = type;
      return next;
    });
  };

  const toggleTime = (id: string) => {
    setSelectedTimes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const reset = () => {
    setStep("landing");
    setCode("");
    setRoleType({});
    setSelectedTimes([]);
    setRoomRoles([]);
    setErrorMessage("");
  };

  const canProceedRole =
    Object.values(roleType).includes("primary") && Object.values(roleType).includes("backup");

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === "Dashboard") navigate("/dashboard");
    if (label === "Create Room") navigate("/create-room");
    if (label === "Join Room") navigate("/join-room");
    if (label === "My Rooms") navigate("/my-rooms");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutMutation.mutateAsync(); }
    finally { navigate("/login", { replace: true }); setLoggingOut(false); }
  };

  const shell = (content: ReactNode) => (
    <div className="flex h-screen bg-pp-bg font-sans text-slate-100 overflow-hidden">
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
            { label: "Dashboard", to: "/dashboard" },
            { label: "Join Room" },
          ]}
        />
        <main className="flex-1 overflow-y-auto px-8 py-7 pb-10">{content}</main>
      </div>
    </div>
  );

  const handleGoToRoom = () => {
    const roomCode = code.trim().toUpperCase();
    if (roomCode) navigate(`/rooms/${roomCode}`);
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (step === "success") {
    return shell(
      <div className="max-w-[520px] mx-auto">
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
          <div className="flex flex-col items-center text-center gap-5 py-6">
            <div className="relative w-[88px] h-[88px]">
              <svg viewBox="0 0 88 88" fill="none" className="w-[88px] h-[88px]">
                <circle cx="44" cy="44" r="40" stroke="rgba(74,222,128,0.2)" strokeWidth="3" />
                <circle cx="44" cy="44" r="40" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="0" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="m-0 text-[26px] font-extrabold text-slate-50">Joined!</h2>
            <p className="m-0 text-[13px] text-slate-500 max-w-[280px]">
              You have successfully joined the room. Get ready to collaborate.
            </p>
            <div className="flex gap-3">
              <button
                className="px-6 py-2.5 bg-pp-border hover:bg-blue-600 text-slate-300 hover:text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-200"
                onClick={reset}
              >
                Back
              </button>
              <button
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors duration-200"
                onClick={handleGoToRoom}
              >
                Go to Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid screen ────────────────────────────────────────────────────────────
  if (step === "invalid") {
    return shell(
      <div className="max-w-[520px] mx-auto">
        <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="relative w-[88px] h-[88px]">
              <svg viewBox="0 0 88 88" fill="none" className="w-[88px] h-[88px]">
                <circle cx="44" cy="44" r="40" stroke="rgba(248,113,113,0.2)" strokeWidth="3" />
                <circle cx="44" cy="44" r="40" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="0" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
            <h2 className="m-0 text-[26px] font-extrabold text-red-400">Invalid Code</h2>
            <p className="m-0 text-[13px] text-slate-500 max-w-[300px]">
              {errorMessage || "The room code could not be found. Please verify the code and try again."}
            </p>
            <button
              onClick={reset}
              className="px-8 py-2.5 bg-red-600 hover:bg-red-700 border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Multi-step form ───────────────────────────────────────────────────────────
  const stepLabel = `Step ${stepNum < 10 ? `0${stepNum}` : stepNum} / ${TOTAL_STEPS < 10 ? `0${TOTAL_STEPS}` : TOTAL_STEPS}`;

  return shell(
    <div className="grid gap-5 items-start lg:grid-cols-[1fr_320px]">
      <div className="bg-pp-card border border-pp-border rounded-2xl p-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="m-0 text-xl font-bold text-slate-50">Join Room</h2>
            <p className="m-0 mt-1.5 text-[13px] text-slate-500">
              Connect to an existing workspace using the room code.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em]">
              {stepLabel}
            </span>
            <span className="text-[11px] font-semibold text-blue-500 tracking-[0.04em]">
              {pct}% Complete
            </span>
          </div>
          <div className="h-[3px] bg-pp-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 px-4 py-3 bg-[#1f0a0a] border border-red-500 rounded-lg text-red-400 text-[13px]">
            {errorMessage}
          </div>
        )}

        {step === "landing" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-[18px] font-semibold text-slate-100">Find Your Group</h3>
              <p className="m-0 mt-1 text-[13px] text-slate-500">
                Enter the 6-character room code provided by the owner.
              </p>
            </div>
            <div>
              <label className="block text-[12px] text-slate-400 mb-2 font-medium">Room Code</label>
              <input
                className="w-full px-4 py-[11px] bg-pp-bg border border-pp-border rounded-lg text-slate-100 text-sm outline-none focus:border-blue-600 transition-colors duration-200 placeholder:text-slate-600 tracking-[0.3em] font-mono"
                type="text"
                maxLength={6}
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === "role" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-[18px] font-semibold text-slate-100">Choose Your Role</h3>
              <p className="m-0 mt-1 text-[13px] text-slate-500">Select one primary and one backup role.</p>
            </div>
            <div className="flex flex-col gap-3">
              {roomRoles.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${
                    roleType[r.id]
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-pp-border bg-pp-elevated"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      {r.icon}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-100">{r.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.sub}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {ROLE_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => assignRole(r.id, type)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          roleType[r.id] === type
                            ? type === "primary"
                              ? "bg-blue-500 text-white"
                              : "bg-indigo-500 text-white"
                            : "bg-pp-border text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "hours" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-[18px] font-semibold text-slate-100">Peak Kinetic Window</h3>
              <p className="m-0 mt-1 text-[13px] text-slate-500">Pick up to 2 time slots for matching.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {times.map((t) => {
                const active = selectedTimes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTime(t.id)}
                    className={`text-left border rounded-xl px-4 py-3 transition-colors ${
                      active
                        ? "border-blue-500/50 bg-blue-500/5"
                        : "border-pp-border bg-pp-elevated hover:border-blue-500/40"
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-blue-500 tracking-[0.08em] uppercase mb-2">
                      {t.short}
                    </div>
                    <div className={`text-[13px] font-semibold ${active ? "text-blue-400" : "text-slate-100"}`}>
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.range}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-pp-border mt-7 pt-5">
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors duration-200"
            onClick={() => {
              if (step === "landing") void submit();
              else if (step === "role" && canProceedRole) go("hours");
              else if (step === "hours") void handleJoinRoom();
            }}
            disabled={
              submitting ||
              (step === "landing" && code.trim().length !== 6) ||
              (step === "role" && !canProceedRole) ||
              (step === "hours" && selectedTimes.length === 0)
            }
            style={{
              opacity:
                submitting ||
                (step === "landing" && code.trim().length !== 6) ||
                (step === "role" && !canProceedRole) ||
                (step === "hours" && selectedTimes.length === 0)
                  ? 0.5
                  : 1,
            }}
          >
            {submitting ? "Please wait..." : step === "hours" ? "Join Room" : "Next"}
            {!submitting && <IconChevronRight />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-pp-card border border-pp-border rounded-2xl p-6">
          <h3 className="m-0 text-[16px] font-semibold text-slate-100">Join Guide</h3>
          <p className="m-0 mt-2 text-[13px] text-slate-500">
            Follow the steps to be matched with a compatible team.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-[12px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-pp-border flex items-center justify-center text-[11px] text-slate-400">1</span>
              Enter the 6-character room code.
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-pp-border flex items-center justify-center text-[11px] text-slate-400">2</span>
              Choose primary and backup roles.
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-pp-border flex items-center justify-center text-[11px] text-slate-400">3</span>
              Pick up to two time slots.
            </div>
          </div>
        </div>
        <div className="bg-pp-elevated border border-pp-border rounded-2xl p-6">
          <h3 className="m-0 text-[16px] font-semibold text-slate-100">Need Help?</h3>
          <p className="m-0 mt-2 text-[13px] text-slate-500">
            Ask the room owner for the correct code, or return to your rooms list.
          </p>
          <button
            onClick={() => navigate("/my-rooms")}
            className="mt-4 w-full py-2.5 bg-pp-border hover:bg-blue-600 text-slate-300 hover:text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-colors duration-200"
          >
            Go to My Rooms
          </button>
        </div>
      </div>
    </div>
  );
}
