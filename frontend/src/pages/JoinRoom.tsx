import { useState, CSSProperties, ReactNode } from "react";

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

const roles: Role[] = [
  {
    id: "fe",
    name: "Front-end",
    sub: "UI Implementation & UX Logic",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "be",
    name: "Back-end",
    sub: "Architecture & Data Systems",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "ux",
    name: "UI/UX",
    sub: "Visual Design & Prototype",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

const times: TimeSlot[] = [
  { id: "mor", short: "AM",  name: "Morning",   range: "6AM – 12PM" },
  { id: "aft", short: "PM",  name: "Afternoon", range: "12PM – 6PM" },
  { id: "eve", short: "EVE", name: "Evening",   range: "6PM – 12AM" },
  { id: "fle", short: "ALL", name: "Flexible",  range: "Anytime"    },
];

const STEPS: Record<string, Step> = {
  LANDING: "landing",
  ROLE: "role",
  HOURS: "hours",
  SUCCESS: "success",
  INVALID: "invalid",
};

function ProgressDots({ step }: { step: Step }) {
  const map = { role: 0, hours: 1 };
  const idx = map[step] ?? -1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 3,
            borderRadius: 2,
            transition: "all 0.3s",
            width: i <= idx ? 20 : 8,
            background: i < idx ? "#00e5ff44" : i === idx ? "#00e5ff" : "#ffffff15",
          }}
        />
      ))}
    </div>
  );
}

function SidebarItem({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: active ? "#00e5ff15" : "transparent",
        transition: "background 0.2s",
      }}
    >
      {children}
    </div>
  );
}

export default function JoinRoom() {
  const [step, setStep] = useState<Step>(STEPS.LANDING);
  const [code, setCode] = useState<string>("");
  const [roleType, setRoleType] = useState<Record<string, RoleType>>({});
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  const go = (s: Step) => setStep(s);

  const submit = () => {
    code.trim().length === 6 ? go(STEPS.ROLE) : go(STEPS.INVALID);
  };

  const assignRole = (id: string, type: RoleType) => {
    setRoleType((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === type) delete next[k];
      });
      if (next[id] === type) delete next[id];
      else next[id] = type;
      return next;
    });
  };

  const toggleTime = (id: string) => {
    setSelectedTimes((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length < 2
        ? [...prev, id]
        : prev
    );
  };

  const reset = () => {
    setStep(STEPS.LANDING);
    setCode("");
    setRoleType({});
    setSelectedTimes([]);
  };

  const canProceedRole =
    Object.values(roleType).includes("primary") &&
    Object.values(roleType).includes("backup");

  const StepHeader = ({ label, back }: { label: string; back: Step }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
      <button onClick={() => go(back)} style={{ ...resetBtn, color: "#ffffff33", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
        &#8592; Back
      </button>
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{label}</span>
      <ProgressDots step={step} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d1117; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.3s ease both; }
        .sb-item-hover:hover { background: #ffffff0a !important; }
        .create-btn:hover { background: #00e5ff28 !important; }
        .btn-ghost-hover:hover { background: #ffffff0f !important; }
        .time-card-hover:hover { background: #ffffff07 !important; }
        .code-input::placeholder { color: #ffffff1a; letter-spacing: 0.1em; font-family: 'Sora', sans-serif; }
      `}</style>

      <div style={{ fontFamily: "'Sora', sans-serif", background: "#0d1117", minHeight: "100vh", display: "flex" }}>

        {/* ── SIDEBAR ── */}
        <nav style={{
          width: 72,
          background: "#0f1420",
          borderRight: "1px solid #ffffff0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px 0",
          gap: 6,
          flexShrink: 0,
          minHeight: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
        }}>
          {/* Logo */}
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#00e5ff18", border: "1px solid #00e5ff33", display: "flex", alignItems: "center", justifyContent: "center", color: "#00e5ff", fontSize: 15, fontWeight: 800, marginBottom: 24 }}>
            P
          </div>

          {/* Home */}
          <SidebarItem active>
            <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </SidebarItem>

          {/* Rooms */}
          <SidebarItem>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </SidebarItem>

          {/* Members */}
          <SidebarItem>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </SidebarItem>

          {/* Create Room + */}
          <div
            className="create-btn"
            style={{ width: 42, height: 42, borderRadius: 11, background: "#00e5ff18", border: "1px solid #00e5ff33", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          {/* Divider */}
          <div style={{ width: 30, height: 1, background: "#ffffff0d", margin: "8px 0" }} />

          {/* Settings */}
          <SidebarItem>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </SidebarItem>

          {/* Avatar */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#00e5ff1a", border: "1px solid #00e5ff33", display: "flex", alignItems: "center", justifyContent: "center", color: "#00e5ff", fontSize: 10, fontWeight: 700 }}>
              ZD
            </div>
          </div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <div style={{ marginLeft: 72, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px", minHeight: "100vh" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>

            {/* LANDING */}
            {step === STEPS.LANDING && (
              <div className="fade-up">
                <p style={{ color: "#00e5ff66", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14 }}>
                  Find Your Group
                </p>
                <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, lineHeight: 1.25 }}>
                  Find your people.
                  <span style={{ color: "#00e5ff", display: "block" }}>Build your project.</span>
                </h1>
                <p style={{ color: "#ffffff44", fontSize: 13, lineHeight: 1.75, marginTop: 12, marginBottom: 32 }}>
                  Connect with developers and designers globally to bring your vision to life.
                </p>

                <label style={{ color: "#ffffff", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10, display: "block" }}>
                  Enter Unique Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. ABC123"
                  className="code-input"
                  style={{ width: "100%", padding: "14px 18px", borderRadius: 10, background: "#ffffff07", border: "1px solid #ffffff12", color: "#fff", fontSize: 15, fontFamily: "monospace", letterSpacing: "0.25em", outline: "none", transition: "border 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00e5ff44")}
                  onBlur={(e) => (e.target.style.borderColor = "#ffffff12")}
                />
                <button onClick={submit} style={styles.btnCyan}>
                  Join Room &nbsp;&#8594;
                </button>
              </div>
            )}

            {/* ROLE */}
            {step === STEPS.ROLE && (
              <div className="fade-up">
                <StepHeader label="Match Group" back={STEPS.LANDING} />
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Choose Your Role</p>
                <p style={{ color: "#ffffff3a", fontSize: 12, lineHeight: 1.7, marginBottom: 22 }}>
                  Select one primary and one backup role.
                </p>

                {roles.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      border: roleType[r.id] ? "1px solid #00e5ff33" : "1px solid #ffffff0c",
                      background: roleType[r.id] ? "#00e5ff09" : "#ffffff04",
                      transition: "all 0.18s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: "#00e5ff10", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#00e5ff" }}>
                        {r.icon}
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ color: "#ffffff33", fontSize: 11, marginTop: 2 }}>{r.sub}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["primary", "backup"].map((type) => (
                        <button
                          key={type}
                          onClick={() => assignRole(r.id, type)}
                          style={{
                            padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                            background: roleType[r.id] === type ? (type === "primary" ? "#00e5ff" : "#0066ee") : "#ffffff07",
                            color: roleType[r.id] === type ? (type === "primary" ? "#0d1117" : "#fff") : "#ffffff33",
                            border: roleType[r.id] === type ? "none" : "1px solid #ffffff12",
                          }}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <p style={{ color: "#ffffff25", fontSize: 11, lineHeight: 1.7, marginBottom: 20 }}>
                  Matching logic will prioritize users with overlapping windows for better real-time collaboration.
                </p>

                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn-ghost-hover" onClick={() => go(STEPS.LANDING)} style={styles.btnGhost}>Back</button>
                  <button
                    onClick={() => canProceedRole && go(STEPS.HOURS)}
                    style={{ ...styles.btnCyan, flex: 2, marginTop: 0, ...(canProceedRole ? {} : styles.btnDisabled) }}
                  >
                    Next &#8594;
                  </button>
                </div>
              </div>
            )}

            {/* HOURS */}
            {step === STEPS.HOURS && (
              <div className="fade-up">
                <StepHeader label="Match Group" back={STEPS.ROLE} />
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Peak Kinetic Window</p>
                <p style={{ color: "#ffffff3a", fontSize: 12, lineHeight: 1.7, marginBottom: 22 }}>
                  Select up to 2 time slots to sync your sessions.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                  {times.map((t) => {
                    const active = selectedTimes.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className="time-card-hover"
                        onClick={() => toggleTime(t.id)}
                        style={{
                          borderRadius: 12, padding: "18px 16px", cursor: "pointer",
                          transition: "all 0.18s",
                          border: active ? "1px solid #00e5ff33" : "1px solid #ffffff0c",
                          background: active ? "#00e5ff09" : "#ffffff04",
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00e5ff77", letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
                          {t.short}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#00e5ff" : "#fff", marginBottom: 4 }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#ffffff33" }}>{t.range}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn-ghost-hover" onClick={() => go(STEPS.ROLE)} style={styles.btnGhost}>Back</button>
                  <button
                    onClick={() => selectedTimes.length > 0 && go(STEPS.SUCCESS)}
                    style={{ ...styles.btnCyan, flex: 2, marginTop: 0, ...(selectedTimes.length > 0 ? {} : styles.btnDisabled) }}
                  >
                    Next &#8594;
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {step === STEPS.SUCCESS && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 0" }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#00ff9d0c", border: "1.5px solid #00ff9d33", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00ff9d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Success!</p>
                <p style={{ color: "#ffffff44", fontSize: 13, lineHeight: 1.7, marginBottom: 28, maxWidth: 300 }}>
                  You have successfully joined the room. Get ready to collaborate with your team.
                </p>
                <button onClick={reset} style={{ ...styles.btnCyan, maxWidth: 280 }}>OK</button>
              </div>
            )}

            {/* INVALID */}
            {step === STEPS.INVALID && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 0" }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#ff4d6d0c", border: "1.5px solid #ff4d6d33", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                </div>
                <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Invalid Code</p>
                <p style={{ color: "#ffffff44", fontSize: 13, lineHeight: 1.7, marginBottom: 28, maxWidth: 300 }}>
                  The room code could not be found in the ProjectPals registry. Please verify the code and try again.
                </p>
                <button onClick={reset} style={{ ...styles.btnCyan, maxWidth: 280 }}>&#8635; Try Again</button>
                <button style={{ ...resetBtn, color: "#ffffff22", fontSize: 12, marginTop: 10 }}>
                  Need Help?
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

const resetBtn: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

const styles: Record<string, CSSProperties> = {
  btnCyan: {
    width: "100%",
    padding: "14px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #00e5ff, #0077ff)",
    color: "#0d1117",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    fontFamily: "inherit",
  },
  btnDisabled: {
    background: "#ffffff0c",
    color: "#ffffff22",
    cursor: "not-allowed",
  },
  btnGhost: {
    flex: 1,
    padding: "14px",
    borderRadius: 10,
    background: "#ffffff07",
    border: "1px solid #ffffff0d",
    color: "#ffffff44",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
