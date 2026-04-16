import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateRoom.css";

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

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function JoinRoom() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const [step, setStep] = useState<Step>("landing");
  const [code, setCode] = useState("");
  const [roleType, setRoleType] = useState<Record<string, RoleType>>({});
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [roomRoles, setRoomRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const stepNum = STEP_MAP[step] ?? 1;
  const pct = Math.round(((stepNum - 1) / TOTAL_STEPS) * 100);

  const go = (s: Step) => { setErrorMessage(""); setStep(s); };

  const submit = async () => {
    setErrorMessage("");
    if (code.trim().length !== 6) { go("invalid"); return; }

    const token = localStorage.getItem("auth_token");
    if (!token) { navigate("/login", { replace: true }); return; }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${code.trim().toUpperCase()}/join-preview`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        setErrorMessage(payload?.message || "Room tidak ditemukan.");
        go("invalid");
        return;
      }

      const fetchedRoles = Array.isArray(payload?.data?.roles) ? payload.data.roles : [];
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
    } catch {
      setErrorMessage("Gagal memuat data room. Coba lagi.");
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
    const token = localStorage.getItem("auth_token");
    if (!token) { navigate("/login", { replace: true }); return; }

    const primaryRoleId = Object.keys(roleType).find((id) => roleType[id] === "primary");
    const backupRoleId = Object.keys(roleType).find((id) => roleType[id] === "backup");
    const windows = selectedTimes.map(toWindowValue).filter((v): v is string => v !== null);

    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roomCode: code.trim().toUpperCase(),
          primaryRole: roomRoles.find((r) => r.id === primaryRoleId)?.name,
          backupRole: roomRoles.find((r) => r.id === backupRoleId)?.name,
          productivityWindows: windows,
        }),
      });
      const payload = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        navigate("/login", { replace: true });
        return;
      }
      if (response.status === 404) {
        setErrorMessage(payload?.message || "Room tidak ditemukan.");
        go("invalid");
        return;
      }
      if (!response.ok) {
        const firstValidation = payload?.errors ? Object.values(payload.errors)[0] : null;
        const firstValidationMessage = Array.isArray(firstValidation) ? firstValidation[0] : null;
        throw new Error(firstValidationMessage || payload?.message || "Gagal join room.");
      }
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

  const handleBack = () => {
    if (step === "role") go("landing");
    else if (step === "hours") go("role");
    else navigate(-1);
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="cr-page">
        <div className="cr-card">
          <div className="cr-success">
            <div className="cr-success-ring">
              <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="44" cy="44" r="40" stroke="rgba(74,222,128,0.2)" strokeWidth="3" />
                <circle cx="44" cy="44" r="40" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="251" strokeDashoffset="0" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div className="cr-success-check">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="cr-success-title">Joined!</h2>
            <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6, maxWidth: 260, textAlign: "center" }}>
              You have successfully joined the room. Get ready to collaborate.
            </p>
            <button className="cr-success-ok-btn" onClick={reset}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid screen ────────────────────────────────────────────────────────────
  if (step === "invalid") {
    return (
      <div className="cr-page">
        <div className="cr-card">
          <div className="cr-success" style={{ gap: 16 }}>
            <div className="cr-success-ring">
              <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="44" cy="44" r="40" stroke="rgba(248,113,113,0.2)" strokeWidth="3" />
                <circle cx="44" cy="44" r="40" stroke="#f87171" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="251" strokeDashoffset="0" />
              </svg>
              <div className="cr-success-check">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--red)" }}>
              Invalid Code
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6, maxWidth: 280, textAlign: "center" }}>
              {errorMessage || "The room code could not be found. Please verify the code and try again."}
            </p>
            <button
              onClick={reset}
              style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "13px 48px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, cursor: "pointer", marginTop: 8 }}
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

  return (
    <div className="cr-page">
      <div className="cr-card">
        {/* Header */}
        <div className="cr-header">
          <span className="cr-header-title">Join Room</span>
          <button className="cr-close-btn" onClick={() => navigate(-1)} title="Close">
            <IconX />
          </button>
        </div>

        {/* Progress */}
        <div className="cr-progress-wrap">
          <div className="cr-progress-meta">
            <span className="cr-step-label">{stepLabel}</span>
            <span className="cr-pct-label">{pct}% Complete</span>
          </div>
          <div className="cr-progress-track">
            <div className="cr-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Step dots */}
        <div className="cr-step-dots">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`cr-dot ${i < stepNum ? "done" : i === stepNum ? "active" : "pending"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="cr-body">
          {errorMessage && (
            <div style={{ color: "#ff9ea8", fontSize: 13, marginBottom: 4 }}>{errorMessage}</div>
          )}

          {/* LANDING */}
          {step === "landing" && (
            <div className="cr-step" key="landing">
              <div>
                <h2 className="cr-step-title">Find Your Group</h2>
                <p className="cr-step-desc">
                  Enter the unique room code to connect with developers and designers building something great.
                </p>
              </div>
              <div className="cr-field">
                <label className="cr-label">Room Code</label>
                <input
                  className="cr-input"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  autoFocus
                  style={{ letterSpacing: "0.25em", fontFamily: "monospace", fontSize: 16 }}
                />
              </div>
            </div>
          )}

          {/* ROLE */}
          {step === "role" && (
            <div className="cr-step" key="role">
              <div>
                <h2 className="cr-step-title">Choose Your Role</h2>
                <p className="cr-step-desc">Select one primary and one backup role for the room.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roomRoles.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: roleType[r.id] ? "rgba(34,211,238,0.05)" : "var(--surface-2)",
                      border: roleType[r.id] ? "1px solid rgba(34,211,238,0.3)" : "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "12px 14px", transition: "all 0.18s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(34,211,238,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flexShrink: 0 }}>
                        {r.icon}
                      </div>
                      <div>
                        <div style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ color: "var(--text-3)", fontSize: 11, marginTop: 2 }}>{r.sub}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ROLE_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => assignRole(r.id, type)}
                          style={{
                            padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                            background: roleType[r.id] === type ? (type === "primary" ? "var(--cyan)" : "#818cf8") : "var(--surface-3)",
                            color: roleType[r.id] === type ? (type === "primary" ? "#0a1628" : "#fff") : "var(--text-3)",
                            border: roleType[r.id] === type ? "none" : "1px solid var(--border)",
                          }}
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

          {/* HOURS */}
          {step === "hours" && (
            <div className="cr-step" key="hours">
              <div>
                <h2 className="cr-step-title">Peak Kinetic Window</h2>
                <p className="cr-step-desc">Select up to 2 time slots to sync your collaboration sessions.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {times.map((t) => {
                  const active = selectedTimes.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTime(t.id)}
                      style={{
                        borderRadius: "var(--radius-md)", padding: "16px 14px", cursor: "pointer",
                        transition: "all 0.18s",
                        border: active ? "1px solid rgba(34,211,238,0.3)" : "1px solid var(--border)",
                        background: active ? "rgba(34,211,238,0.05)" : "var(--surface-2)",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>
                        {t.short}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--cyan)" : "var(--text-1)", marginBottom: 3 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.range}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cr-footer">
          <button className="cr-back-btn" onClick={handleBack}>
            <IconChevronLeft /> Back
          </button>
          <button
            className="cr-next-btn"
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
                  ? 0.45
                  : 1,
            }}
          >
            {submitting ? "Please wait..." : step === "hours" ? "Join Room" : "Next"}
            {!submitting && <IconChevronRight />}
          </button>
        </div>
      </div>
    </div>
  );
}
