import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLogin, useRegister } from "../../hooks/useAuth";

// ─── Eye tracking hook ────────────────────────────────────────────────────────
function useEyePos(covering: boolean) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (covering) return;
      const cx = window.innerWidth * 0.25;
      const cy = window.innerHeight * 0.5;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 200);
      setPos({
        x: Math.cos(angle) * (dist / 200) * 3.5,
        y: Math.sin(angle) * (dist / 200) * 3.5,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [covering]);
  return pos;
}

// ─── Eye component ────────────────────────────────────────────────────────────
function Eye({ cx, cy, covering, pupil }: {
  cx: number; cy: number; covering: boolean; pupil: { x: number; y: number };
}) {
  return covering ? (
    <path
      d={`M${cx - 6} ${cy} Q${cx} ${cy - 5} ${cx + 6} ${cy}`}
      stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" fill="none"
    />
  ) : (
    <>
      <circle cx={cx} cy={cy} r="5" fill="white" />
      <circle cx={cx + pupil.x} cy={cy + pupil.y} r="2.5" fill="#1a1a2e" />
      <circle cx={cx + pupil.x + 1} cy={cy + pupil.y - 1} r="0.8" fill="white" opacity="0.9" />
    </>
  );
}

// ─── Characters ───────────────────────────────────────────────────────────────
function Characters({ covering }: { covering: boolean }) {
  const pupil = useEyePos(covering);
  return (
    <svg viewBox="0 0 260 320" width="100%" height="100%"
      style={{ maxHeight: "520px", overflow: "visible" }}>
      <ellipse cx="100" cy="300" rx="70" ry="12" fill="rgba(0,0,0,0.07)" />
      <ellipse cx="170" cy="310" rx="40" ry="8" fill="rgba(0,0,0,0.05)" />

      {/* Square - purple, tilted */}
      <g transform="translate(100, 80) rotate(-12)">
        <rect x="-45" y="-50" width="90" height="100" rx="8" fill="#7c6fcd" />
        <rect x="-38" y="-42" width="76" height="84" rx="6" fill="#6a5eb8" opacity="0.4" />
        <Eye cx={-14} cy={-8} covering={covering} pupil={pupil} />
        <Eye cx={14} cy={-8} covering={covering} pupil={pupil} />
        <path d="M-10 12 Q0 8 10 12" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>

      {/* Blob - orange */}
      <g transform="translate(85, 210)">
        <ellipse cx="0" cy="0" rx="55" ry="48" fill="#f0873a" />
        <ellipse cx="0" cy="5" rx="48" ry="40" fill="#e07830" opacity="0.3" />
        <Eye cx={-14} cy={-4} covering={covering} pupil={pupil} />
        <Eye cx={14} cy={-4} covering={covering} pupil={pupil} />
        <path d="M-12 14 Q0 10 12 14" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>

      {/* Pill - dark */}
      <g transform="translate(158, 195)">
        <rect x="-22" y="-52" width="44" height="104" rx="22" fill="#1e1e2e" />
        <rect x="-16" y="-44" width="32" height="88" rx="16" fill="#16162a" opacity="0.4" />
        <Eye cx={-8} cy={-10} covering={covering} pupil={pupil} />
        <Eye cx={8} cy={-10} covering={covering} pupil={pupil} />
        <path d="M-8 10 Q2 15 10 10" stroke="#7c6fcd" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>

      {/* Teardrop - yellow */}
      <g transform="translate(178, 260)">
        <ellipse cx="0" cy="10" rx="28" ry="38" fill="#f5d03a" />
        <ellipse cx="0" cy="14" rx="22" ry="30" fill="#e8c030" opacity="0.3" />
        <Eye cx={-8} cy={6} covering={covering} pupil={pupil} />
        <Eye cx={8} cy={6} covering={covering} pupil={pupil} />
        <path d="M-8 22 Q0 27 8 22" stroke="#1a1a2e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, type = "text", placeholder, value, onChange, onFocus, onBlur }: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; onFocus?: () => void; onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);

  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{
        display: "block", fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        marginBottom: "6px", color: "#7ec8e3",
        fontFamily: "'Satoshi', sans-serif",
      }}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        background: focused ? "rgba(126,200,227,0.07)" : "rgba(255,255,255,0.04)",
        border: focused ? "1.5px solid rgba(126,200,227,0.55)" : "1.5px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        boxShadow: focused ? "0 0 18px rgba(126,200,227,0.1)" : "none",
        transition: "all 0.25s ease",
      }}>
        <input
          type={type === "password" && showPass ? "text" : type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "13px 16px", fontSize: "14px", color: "#e2f4fa",
            fontFamily: "'Satoshi', sans-serif",
          }}
        />
        {type === "password" && (
          <button type="button" onClick={() => setShowPass(!showPass)} style={{
            background: "none", border: "none", cursor: "pointer",
            paddingRight: "14px", fontSize: "13px",
            color: focused ? "#7ec8e3" : "#3a5a6a", transition: "color 0.2s",
          }}>
            {showPass ? "👁️" : "🙈"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
type Mode = "register" | "login";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const [mode, setMode] = useState<Mode>("register");
  const [animating, setAnimating] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [reg, setReg] = useState({ name: "", username: "", email: "", password: "" });
  const [log, setLog] = useState({ identifier: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    setMode(location.pathname === "/login" ? "login" : "register");
    setErrorMessage("");
    setSuccess(false);
  }, [location.pathname]);

  const switchMode = (next: Mode) => {
    if (animating || next === mode) return;
    setAnimating(true);
    setFormVisible(false);
    setPasswordFocused(false);
    setSuccess(false);
    setErrorMessage("");
    setTimeout(() => {
      setMode(next);
      navigate(next === "login" ? "/login" : "/register");
      setFormVisible(true);
      setTimeout(() => setAnimating(false), 400);
    }, 280);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (mode === "login" && !log.identifier.includes("@")) {
      setErrorMessage("Silakan login menggunakan email.");
      return;
    }

    if (mode === "register") {
      if (!reg.name.trim()) {
        setErrorMessage("Nama wajib diisi.");
        return;
      }

      if (!reg.username.trim()) {
        setErrorMessage("Username wajib diisi.");
        return;
      }

      if (!reg.email.trim()) {
        setErrorMessage("Email wajib diisi.");
        return;
      }

      if (!reg.email.includes("@")) {
        setErrorMessage("Format email tidak valid.");
        return;
      }

      if (!reg.password.trim()) {
        setErrorMessage("Password wajib diisi.");
        return;
      }

      if (reg.password.length < 8) {
        setErrorMessage("Password minimal 8 karakter.");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === "register") {
        await registerMutation.mutateAsync({
          name: reg.name.trim(),
          username: reg.username.trim(),
          email: reg.email.trim(),
          password: reg.password,
          password_confirmation: reg.password,
          device_name: "web",
        });

        setSuccess(true);
        setTimeout(() => switchMode("login"), 1200);
      } else {
        await loginMutation.mutateAsync({
          email: log.identifier.trim(),
          password: log.password,
        });

        localStorage.setItem("remember_me", remember ? "1" : "0");

        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 900);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const regFilled = Object.values(reg).every((v) => v.trim() !== "");
  const logFilled = log.identifier.trim() !== "" && log.password.trim() !== "";
  const canSubmit = mode === "register" ? regFilled : logFilled;

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700&f[]=satoshi@400,500,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes floatChars {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spinRing {
          to { transform: rotate(360deg); }
        }
        @keyframes formIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes formOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes pageIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          0%  { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.15); }
          100%{ transform: scale(1); opacity: 1; }
        }
        @keyframes leftPanelIn {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .auth-wrap {
          animation: pageIn 0.5s ease forwards;
          width: 100%;
          height: 100%;
          display: flex;
        }
        .left-in {
          animation: leftPanelIn 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.15s both;
        }
        .chars-float {
          animation: floatChars 5s ease-in-out infinite;
        }
        .form-in {
          animation: formIn 0.38s cubic-bezier(0.34,1.4,0.64,1) forwards;
        }
        .form-out {
          animation: formOut 0.26s ease forwards;
        }
        .btn-active {
          background: linear-gradient(90deg,#1aa6c7 0%,#7ec8e3 40%,#1aa6c7 60%,#7ec8e3 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          color: #0a1825;
          cursor: pointer;
          border: none;
        }
        .btn-active:hover {
          animation: shimmer 1.1s linear infinite;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(126,200,227,0.35);
        }
        .btn-active:active { transform: translateY(0); }
        .btn-inactive {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07) !important;
          color: #2a4a5a;
          cursor: not-allowed;
        }
        .success-pop { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        ::placeholder { color: rgba(126,200,227,0.2); }
      `}</style>

      {/* Full viewport wrapper — full screen split, no card */}
      <div className="auth-wrap" style={{
        width: "100vw", height: "100vh",
        display: "flex",
        fontFamily: "'Satoshi', sans-serif",
        overflow: "hidden",
        opacity: mounted ? 1 : 0,
      }}>

          {/* ── LEFT PANEL ── */}
          <div className="left-in" style={{
            width: "42%",
            background: "#f0ede6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 48px 48px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {/* dot grid */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              pointerEvents: "none",
            }} />
            {/* corner brackets */}
            {[
              { top: 18, left: 18, borderTop: true, borderLeft: true },
              { bottom: 18, right: 18, borderBottom: true, borderRight: true },
            ].map((c, i) => (
              <div key={i} style={{
                position: "absolute",
                top: c.top, left: c.left, bottom: c.bottom, right: c.right,
                width: 28, height: 28,
                borderTop: c.borderTop ? "2px solid rgba(0,0,0,0.13)" : undefined,
                borderLeft: c.borderLeft ? "2px solid rgba(0,0,0,0.13)" : undefined,
                borderBottom: c.borderBottom ? "2px solid rgba(0,0,0,0.13)" : undefined,
                borderRight: c.borderRight ? "2px solid rgba(0,0,0,0.13)" : undefined,
                borderRadius: c.borderTop ? "4px 0 0 0" : "0 0 4px 0",
              }} />
            ))}

            {/* Characters */}
            <div className="chars-float" style={{ width: "100%", maxWidth: "360px", position: "relative", zIndex: 1 }}>
              <Characters covering={passwordFocused} />
            </div>

            {/* Caption */}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: "12px" }}>
              <p style={{
                fontSize: "14px", fontWeight: 700, color: "#1a1a2e",
                fontFamily: "'Cabinet Grotesk', sans-serif",
                transition: "all 0.3s ease",
              }}>
                {mode === "register" ? "Your crew is waiting 👾" : "Welcome back 👋"}
              </p>
              <p style={{
                fontSize: "11px", color: passwordFocused ? "#7c6fcd" : "#aaa",
                marginTop: "5px", transition: "color 0.3s ease",
                fontFamily: "'Satoshi', sans-serif",
              }}>
                {passwordFocused ? "shhh, not looking 🫣" : "we're watching... just kidding"}
              </p>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{
            flex: 1,
            background: "linear-gradient(150deg, #0f2030 0%, #0a1825 100%)",
            padding: "60px 72px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* top accent line */}
            <div style={{
              position: "absolute", top: 0, left: 44, right: 44, height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(126,200,227,0.45), transparent)",
            }} />
            {/* glow orb */}
            <div style={{
              position: "absolute", top: -80, right: -80,
              width: 240, height: 240, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(26,166,199,0.1) 0%, transparent 70%)",
              filter: "blur(40px)", pointerEvents: "none",
            }} />

            {/* Brand pill */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "5px 14px", borderRadius: "99px",
                background: "rgba(126,200,227,0.08)",
                border: "1px solid rgba(126,200,227,0.16)",
                marginBottom: "20px",
              }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "#7ec8e3", display: "inline-block",
                }} />
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
                  color: "#7ec8e3", textTransform: "uppercase",
                  fontFamily: "'Satoshi', sans-serif",
                }}>ProjectPals</span>
              </div>

              {/* Mode tabs */}
              <div style={{
                display: "flex", gap: "28px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                {(["register", "login"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => switchMode(m)} style={{
                    background: "none", border: "none", outline: "none",
                    padding: "6px 0 12px", cursor: m === mode ? "default" : "pointer",
                    fontSize: "22px", fontWeight: 800,
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    letterSpacing: "-0.02em",
                    color: m === mode ? "#e2f4fa" : "#2a4a5a",
                    borderBottom: m === mode ? "2.5px solid #7ec8e3" : "2.5px solid transparent",
                    marginBottom: "-1px",
                    transition: "color 0.2s, border-color 0.2s",
                    lineHeight: 1.1,
                  }}>
                    {m === "register" ? "Create Account" : "Welcome Back"}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div
              className={formVisible ? "form-in" : "form-out"}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              {success ? (
                <div className="success-pop" style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", textAlign: "center",
                }}>
                  <div style={{ fontSize: "52px", marginBottom: "14px" }}>
                    {mode === "register" ? "🎉" : "✨"}
                  </div>
                  <p style={{
                    color: "#7ec8e3", fontSize: "20px", fontWeight: 800,
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                  }}>
                    {mode === "register" ? "Account created!" : "You're in!"}
                  </p>
                  <p style={{ color: "#3a6070", fontSize: "13px", marginTop: "8px", fontFamily: "'Satoshi', sans-serif" }}>
                    {mode === "register" ? "Switching to login…" : "Taking you to your dashboard…"}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    {mode === "register" ? (
                      <>
                        <Field label="Name" placeholder="Enter Name"
                          value={reg.name} onChange={(v) => setReg({ ...reg, name: v })} />
                        <Field label="Username" placeholder="Enter Username"
                          value={reg.username} onChange={(v) => setReg({ ...reg, username: v })} />
                        <Field label="Email" type="email" placeholder="projectpals@example.com"
                          value={reg.email} onChange={(v) => setReg({ ...reg, email: v })} />
                        <Field label="Password" type="password" placeholder="Enter Password"
                          value={reg.password} onChange={(v) => setReg({ ...reg, password: v })}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)} />
                      </>
                    ) : (
                      <>
                        <Field label="Email" placeholder="projectpals@example.com"
                          value={log.identifier} onChange={(v) => setLog({ ...log, identifier: v })} />
                        <Field label="Password" type="password" placeholder="Enter Password"
                          value={log.password} onChange={(v) => setLog({ ...log, password: v })}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)} />
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: "20px",
                        }}>
                          <label style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            fontSize: "12px", color: "#4a7a94", cursor: "pointer",
                            fontFamily: "'Satoshi', sans-serif",
                          }}>
                            <input type="checkbox" checked={remember}
                              onChange={(e) => setRemember(e.target.checked)}
                              style={{ accentColor: "#7ec8e3", width: "13px", height: "13px" }} />
                            Remember me
                          </label>
                          <a href="#" style={{
                            fontSize: "12px", color: "#7ec8e3", fontWeight: 600,
                            textDecoration: "none", fontFamily: "'Satoshi', sans-serif",
                          }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#b8e8f5")}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#7ec8e3")}>
                            Forgot Password?
                          </a>
                        </div>
                      </>
                    )}
                  </div>

                  {errorMessage && (
                    <p style={{
                      marginBottom: "12px",
                      fontSize: "12px",
                      color: "#fca5a5",
                      fontFamily: "'Satoshi', sans-serif",
                    }}>
                      {errorMessage}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className={canSubmit ? "btn-active" : "btn-inactive"}
                    style={{
                      width: "100%", padding: "14px", borderRadius: "12px",
                      fontSize: "14px", fontWeight: 700, letterSpacing: "0.03em",
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                  >
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <span style={{
                          width: "15px", height: "15px", borderRadius: "50%",
                          border: "2.5px solid rgba(10,24,37,0.4)", borderTopColor: "#0a1825",
                          animation: "spinRing 0.7s linear infinite", display: "inline-block",
                        }} />
                        {mode === "register" ? "Creating account…" : "Signing in…"}
                      </span>
                    ) : (
                      mode === "register" ? "Create Account →" : "Login →"
                    )}
                  </button>

                  {/* Switch hint */}
                  <p style={{
                    textAlign: "center", fontSize: "12px", marginTop: "16px",
                    color: "#2a4a5a", fontFamily: "'Satoshi', sans-serif",
                  }}>
                    {mode === "register" ? "Already have an account? " : "Don't have an account? "}
                    <span onClick={() => switchMode(mode === "register" ? "login" : "register")}
                      style={{ color: "#7ec8e3", fontWeight: 600, cursor: "pointer" }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#b8e8f5")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#7ec8e3")}>
                      {mode === "register" ? "Log in" : "Register Now"}
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* bottom label */}
            <p style={{
              fontSize: "9px", color: "rgba(126,200,227,0.12)",
              letterSpacing: "0.1em", fontFamily: "monospace", marginTop: "12px",
            }}>
              PROJECTPALS / AUTH / {mode.toUpperCase()}
            </p>
          </div>
      </div>
    </>
  );
}