import { useState, useRef, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateRoom.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoomData {
  name: string;
  roles: string[];
  maxPerGroup: number;
  numGroups: number;
}

type Screen = "form" | "success" | "info";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Step 1: Basics ───────────────────────────────────────────────────────────
function StepBasics({ data, onChange }: { data: RoomData; onChange: (d: Partial<RoomData>) => void }) {
  return (
    <div className="cr-step">
      <div>
        <h2 className="cr-step-title">Define the Core Pulse</h2>
        <p className="cr-step-desc">
          Establish the fundamental frequency of your project. This identity will resonate through every subsequent layer of development.
        </p>
      </div>
      <div className="cr-field">
        <label className="cr-label">Room Name</label>
        <input
          className="cr-input"
          type="text"
          placeholder="Required"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoFocus
        />
      </div>
    </div>
  );
}

// ─── Step 2: Roles ────────────────────────────────────────────────────────────
function StepRoles({ data, onChange }: { data: RoomData; onChange: (d: Partial<RoomData>) => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addRole = () => {
    const trimmed = input.trim();
    if (!trimmed || data.roles.includes(trimmed)) return;
    onChange({ roles: [...data.roles, trimmed] });
    setInput("");
    inputRef.current?.focus();
  };

  const removeRole = (role: string) => {
    onChange({ roles: data.roles.filter((r) => r !== role) });
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addRole();
  };

  return (
    <div className="cr-step">
      <div>
        <h2 className="cr-step-title">Role Definition</h2>
        <p className="cr-step-desc">
          Establish the architectural pillars of your project by defining core technical roles.
        </p>
      </div>

      <div className="cr-field">
        <label className="cr-label">New Role Title</label>
        <div className="cr-role-add-row">
          <input
            ref={inputRef}
            className="cr-input"
            type="text"
            placeholder="Required (Min. 2)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="cr-add-btn" onClick={addRole} title="Add role">
            +
          </button>
        </div>
      </div>

      <div className="cr-role-list-wrap">
        {data.roles.length === 0 ? (
          <div className="cr-roles-empty">No roles added yet. Add at least 2 roles.</div>
        ) : (
          data.roles.map((role) => (
            <div className="cr-role-item" key={role}>
              <span className="cr-role-dot" />
              <span className="cr-role-name">{role}</span>
              <button className="cr-role-remove" onClick={() => removeRole(role)} title="Remove">
                <IconX />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Finalize ─────────────────────────────────────────────────────────
function StepFinalize({ data, onChange }: { data: RoomData; onChange: (d: Partial<RoomData>) => void }) {
  const steppers = [
    {
      label: "Max People Per Group",
      sub: "Min. 2",
      key: "maxPerGroup" as const,
      min: 2,
      max: 50,
    },
    {
      label: "Number of Groups",
      sub: "Min. 2",
      key: "numGroups" as const,
      min: 2,
      max: 100,
    },
  ];

  return (
    <div className="cr-step">
      <div>
        <h2 className="cr-step-title">Finalize</h2>
        <p className="cr-step-desc">Set group limits before launching the room.</p>
      </div>

      <div>
        <label className="cr-label" style={{ marginBottom: 12, display: "block" }}>
          Capacity Parameters
        </label>
        <div className="cr-capacity-grid">
          {steppers.map((s) => (
            <div className="cr-stepper-row" key={s.key}>
              <div className="cr-stepper-info">
                <span className="cr-stepper-label">{s.label}</span>
                <span className="cr-stepper-sub">{s.sub}</span>
              </div>
              <div className="cr-stepper-controls">
                <button
                  className="cr-stepper-btn"
                  disabled={data[s.key] <= s.min}
                  onClick={() => onChange({ [s.key]: data[s.key] - 1 })}
                >
                  −
                </button>
                <span className="cr-stepper-val">{data[s.key]}</span>
                <button
                  className="cr-stepper-btn"
                  disabled={data[s.key] >= s.max}
                  onClick={() => onChange({ [s.key]: data[s.key] + 1 })}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function ScreenSuccess({ onOk }: { onOk: () => void }) {
  return (
    <div className="cr-success">
      <div className="cr-success-ring">
        <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="44" cy="44" r="40" stroke="rgba(74,222,128,0.2)" strokeWidth="3" />
          <circle
            cx="44" cy="44" r="40"
            stroke="#4ade80"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="251"
            strokeDashoffset="0"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="cr-success-check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
      <h2 className="cr-success-title">Success</h2>
      <button className="cr-success-ok-btn" onClick={onOk}>
        OK
      </button>
    </div>
  );
}

// ─── Info / Room Created ──────────────────────────────────────────────────────
function ScreenInfo({ data, roomCode, onDone }: { data: RoomData; roomCode: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cr-info-body">
      <div>
        <h2 className="cr-info-title">Room Created</h2>
        <p className="cr-info-subtitle">Review your room and share the code with your friends.</p>
      </div>

      <div className="cr-info-room-card">
        <div>
          <p className="cr-info-room-name-label">Room Name</p>
          <p className="cr-info-room-name-val">{data.name || "My Room"}</p>
        </div>

        <div className="cr-info-stats">
          <div className="cr-info-stat">
            <span className="cr-info-stat-num">{data.maxPerGroup}</span>
            <span className="cr-info-stat-lbl">Member /<br />Group</span>
          </div>
          <div className="cr-info-stat">
            <span className="cr-info-stat-num">{data.numGroups}</span>
            <span className="cr-info-stat-lbl">Groups</span>
          </div>
          {data.roles.length > 0 && (
            <div className="cr-info-stat">
              <span className="cr-info-stat-num">{data.roles.length}</span>
              <span className="cr-info-stat-lbl">Roles<br />Defined</span>
            </div>
          )}
        </div>

        <div>
          <div className="cr-code-row">
            <span className="cr-code-label">Room Code</span>
            <button className="cr-share-btn" title="Share">
              <IconShare />
            </button>
          </div>
          <div className="cr-code-display">
            <span className="cr-code-val">{roomCode}</span>
            <button className={`cr-copy-btn${copied ? " copied" : ""}`} onClick={handleCopy} title="Copy code">
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
          </div>
        </div>
      </div>

      <button className="cr-done-btn" onClick={onDone}>
        Go to Room
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Roles" },
  { id: 3, label: "Finalize" },
];

const TOTAL = STEPS.length;

export default function CreateRoom() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const [step, setStep] = useState(1);
  const [screen, setScreen] = useState<Screen>("form");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [data, setData] = useState<RoomData>({
    name: "",
    roles: [],
    maxPerGroup: 5,
    numGroups: 12,
  });

  const update = (partial: Partial<RoomData>) => setData((prev) => ({ ...prev, ...partial }));

  const pct = Math.round(((step - 1) / TOTAL) * 100);

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0;
    if (step === 2) return data.roles.length >= 2;
    return true;
  };

  const handleNext = async () => {
    setErrorMessage("");

    if (step < TOTAL) { setStep(step + 1); return; }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name.trim(),
          roles: data.roles,
          maxPerGroup: data.maxPerGroup,
          numGroups: data.numGroups,
        }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const firstValidation = payload?.errors ? Object.values(payload.errors)[0] : null;
        const firstValidationMessage = Array.isArray(firstValidation) ? firstValidation[0] : null;
        throw new Error(firstValidationMessage || payload?.message || "Gagal membuat room.");
      }

      setRoomCode(payload?.data?.room_code ?? "");
      setScreen("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleOk = () => setScreen("info");
  const handleClose = () => navigate("/dashboard");
  const handleDone = () => {
    if (roomCode) {
      navigate(`/rooms/${roomCode}`);
      return;
    }

    setStep(1);
    setScreen("form");
    setErrorMessage("");
    setRoomCode("");
    setData({ name: "", roles: [], maxPerGroup: 5, numGroups: 12 });
  };

  // ── Success screen
  if (screen === "success") {
    return (
      <div className="cr-page">
        <div className="cr-card">
          <ScreenSuccess onOk={handleOk} />
        </div>
      </div>
    );
  }

  // ── Info screen
  if (screen === "info") {
    return (
      <div className="cr-page">
        <div className="cr-card">
          <div className="cr-header">
            <span className="cr-header-title">Info</span>
            <button className="cr-close-btn cr-info-close-btn" onClick={handleClose} title="Close">
              <IconX />
            </button>
          </div>
          <ScreenInfo data={data} roomCode={roomCode} onDone={handleDone} />
        </div>
      </div>
    );
  }

  // ── Form steps
  return (
    <div className="cr-page">
      <div className="cr-card">
        {/* Header */}
        <div className="cr-header">
          <span className="cr-header-title">Create Room</span>
          <button className="cr-close-btn" onClick={handleClose} title="Close">
            <IconX />
          </button>
        </div>

        {/* Progress */}
        <div className="cr-progress-wrap">
          <div className="cr-progress-meta">
            <span className="cr-step-label">Step {step < 10 ? `0${step}` : step} / {TOTAL < 10 ? `0${TOTAL}` : TOTAL}</span>
            <span className="cr-pct-label">{pct}% Complete</span>
          </div>
          <div className="cr-progress-track">
            <div className="cr-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Step dots */}
        <div className="cr-step-dots">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`cr-dot ${s.id < step ? "done" : s.id === step ? "active" : "pending"}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="cr-body">
          {errorMessage && (
            <div style={{ marginBottom: 12, color: "#ff9ea8", fontSize: 13 }}>{errorMessage}</div>
          )}
          {step === 1 && <StepBasics data={data} onChange={update} key={1} />}
          {step === 2 && <StepRoles data={data} onChange={update} key={2} />}
          {step === 3 && <StepFinalize data={data} onChange={update} key={3} />}
        </div>

        {/* Footer */}
        <div className="cr-footer">
          <button className="cr-back-btn" onClick={handleBack} disabled={step === 1}>
            <IconChevronLeft /> Back
          </button>
          <button
            className={`cr-next-btn${step === TOTAL ? " create" : ""}`}
            onClick={handleNext}
            disabled={!canNext() || submitting}
            style={{ opacity: canNext() && !submitting ? 1 : 0.45 }}
          >
            {step === TOTAL ? (
              <>
                {submitting ? "Creating..." : "Create Room"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              </>
            ) : (
              <>
                Next <IconChevronRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
