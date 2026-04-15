import { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function darkenHex(hex: string, pct: number): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 255) * (1 - pct)));
  const g = Math.max(0, Math.floor(((n >> 8) & 255) * (1 - pct)));
  const b = Math.max(0, Math.floor((n & 255) * (1 - pct)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// ─── useReveal hook ───────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Scroll Progress + Floating Button ───────────────────────────────────────
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(false);
  const CIRCUMFERENCE = 2 * Math.PI * 22;

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setPct(Math.round(p * 100));
      setShow(scrollTop > 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <>
      {/* Progress bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: 2, zIndex: 9999,
        width: `${pct}%`,
        background: "linear-gradient(90deg, #3b82f6, #34d399, #60a5fa)",
        backgroundSize: "200% 100%",
        animation: "progressShimmer 2s linear infinite",
        pointerEvents: "none",
        boxShadow: "0 0 8px rgba(96,165,250,0.7), 0 0 20px rgba(52,211,153,0.4)",
        transition: "width 0.1s linear",
      }} />

      {/* Floating back-to-top */}
      <div style={{
        position: "fixed", bottom: 28, right: 24, zIndex: 999,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: show ? "auto" : "none",
      }}>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Back to top"
          style={{ position: "relative", width: 48, height: 48, cursor: "pointer", border: "none", background: "none", padding: 0, outline: "none" }}
        >
          <svg style={{ position: "absolute", inset: 0, width: 48, height: 48, transform: "rotate(-90deg)" }} viewBox="0 0 48 48">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="22" fill="none" stroke="url(#ringGradient)" strokeWidth="2.5"
              strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.15s linear" }} />
          </svg>
          <div style={{
            position: "absolute", inset: 5, borderRadius: "50%",
            background: "rgba(15,23,42,0.9)", border: "1px solid rgba(59,130,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
          }}>
            <svg width="14" height="14" fill="none" stroke="#60a5fa" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </button>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}>{pct}%</span>
      </div>
    </>
  );
}

// ─── Animated Background Orbs ─────────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "#0B1121", overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", width: 650, height: 650, top: -120, right: -120, borderRadius: "50%", filter: "blur(90px)", opacity: 0.6, background: "radial-gradient(circle, rgba(37,99,235,0.9) 0%, rgba(29,78,216,0.6) 40%, transparent 70%)", animation: "orbFloat1 9s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 520, height: 520, bottom: -100, left: -100, borderRadius: "50%", filter: "blur(90px)", opacity: 0.4, background: "radial-gradient(circle, rgba(5,150,105,0.85) 0%, rgba(16,185,129,0.5) 40%, transparent 70%)", animation: "orbFloat2 11s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 700, height: 700, top: "25%", left: "28%", borderRadius: "50%", filter: "blur(90px)", opacity: 0.35, background: "radial-gradient(circle, rgba(30,58,138,0.8) 0%, rgba(30,64,175,0.4) 35%, transparent 65%)", animation: "orbFloat3 13s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 380, height: 380, top: "8%", left: "3%", borderRadius: "50%", filter: "blur(90px)", opacity: 0.3, background: "radial-gradient(circle, rgba(13,148,136,0.8) 0%, rgba(15,118,110,0.5) 40%, transparent 70%)", animation: "orbFloat2 10s ease-in-out infinite reverse" }} />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const navEl = document.getElementById("navbar");
      const navHeight = navEl?.offsetHeight ?? 64;
      setScrolled(scrollY > 40);
      let current = "hero";
      document.querySelectorAll("section[id]").forEach((section) => {
        const el = section as HTMLElement;
        if (scrollY >= el.offsetTop - navHeight - 60) current = el.id;
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.getElementById("navbar")?.offsetHeight ?? 64;
    window.scrollTo({ top: (target as HTMLElement).getBoundingClientRect().top + window.scrollY - navHeight, behavior: "smooth" });
    setMobileOpen(false);
  };

  const navLinks = [
    { href: "#hero", label: "Home", section: "hero" },
    { href: "#about", label: "About", section: "about" },
    { href: "#features", label: "Features", section: "features" },
    { href: "#testimonial", label: "Testimonial", section: "testimonial" },
    { href: "#contact", label: "Contact", section: "contact" },
  ];

  return (
    <>
      <nav id="navbar" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(11,17,33,0.98)" : "rgba(11,17,33,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(59,130,246,0.1)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#hero" onClick={(e) => handleNavClick(e, "#hero")}
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", textDecoration: "none", letterSpacing: "-0.02em" }}>
            ProjectPals
          </a>

          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {navLinks.map((link) => (
              <a key={link.section} href={link.href} onClick={(e) => handleNavClick(e, link.href)}
                style={{ fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s", color: activeSection === link.section ? "#60a5fa" : "#94a3b8", borderBottom: activeSection === link.section ? "1px solid #3b82f6" : "none", paddingBottom: activeSection === link.section ? 2 : 0 }}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="desktop-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/login" style={{ fontSize: 14, color: "#cbd5e1", textDecoration: "none", padding: "8px 12px" }}>Login/Register</a>
            <a href="#" style={{ fontSize: 14, color: "#fff", fontWeight: 600, padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg, #3B82F6, #2563eb)", textDecoration: "none" }}>Download App</a>
          </div>

          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"
            style={{ display: "none", flexDirection: "column", gap: 5, cursor: "pointer", padding: 4, background: "none", border: "none" }}>
            <span style={{ display: "block", width: 22, height: 2, background: "#e2e8f0", borderRadius: 2, transition: "all 0.3s ease", transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#e2e8f0", borderRadius: 2, transition: "all 0.3s ease", opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#e2e8f0", borderRadius: 2, transition: "all 0.3s ease", transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </nav>

      <div style={{
        position: "fixed", top: 57, left: 0, right: 0, zIndex: 49,
        background: "rgba(11,17,33,0.98)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1e2d45", padding: "16px 24px 20px",
        display: "flex", flexDirection: "column", gap: 4,
        opacity: mobileOpen ? 1 : 0, transform: mobileOpen ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: mobileOpen ? "auto" : "none",
      }}>
        {navLinks.map((link) => (
          <a key={link.section} href={link.href} onClick={(e) => handleNavClick(e, link.href)}
            style={{ padding: "10px 0", color: activeSection === link.section ? "#60a5fa" : "#94a3b8", fontSize: "0.9rem", borderBottom: "1px solid #1e2d45", textDecoration: "none", transition: "color 0.2s", fontWeight: 500 }}>
            {link.label}
          </a>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e2d45" }}>
          <a href="/login" style={{ fontSize: 14, color: "#cbd5e1", textDecoration: "none", fontWeight: 500 }}>Login / Register</a>
          <a href="#" style={{ fontSize: 14, color: "#fff", fontWeight: 600, padding: "10px 16px", borderRadius: 8, background: "linear-gradient(135deg, #3B82F6, #2563eb)", textDecoration: "none", textAlign: "center" }}>Download App</a>
        </div>
      </div>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="hero" style={{ minHeight: "100vh", paddingTop: 96, paddingBottom: 80, position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 48, minHeight: "80vh" }}>
        <div style={{ flex: 1, zIndex: 10, minWidth: 280 }}>
          <div style={{ animation: "fadeUp 0.7s ease both" }}>
            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "clamp(2.5rem,5vw,3.75rem)", color: "#fff", lineHeight: 1.1, marginBottom: 8 }}>
              Find your people.
            </h1>
            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "clamp(2.5rem,5vw,3.75rem)", lineHeight: 1.1, marginBottom: 24 }}>
              <span style={{ color: "#60a5fa" }}>Build your</span><br />
              <span style={{ color: "#60a5fa" }}>project.</span>
            </h1>
          </div>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, maxWidth: 360, marginBottom: 32, animation: "fadeUp 0.7s 0.1s ease both" }}>
            The kinetic observatory for modern collaboration. ProjectPals matches your skills with the perfect team using high-fidelity data signals.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40, animation: "fadeUp 0.7s 0.25s ease both" }}>
            <a href="/register" className="btn-primary" style={{ color: "#fff", fontWeight: 600, fontSize: 14, padding: "12px 24px", borderRadius: 8, textDecoration: "none" }}>Get Started</a>
            <a href="#features" className="btn-outline" style={{ fontSize: 14, fontWeight: 500, padding: "12px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              How it works
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <div className="badge-mint" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 600, animation: "fadeUp 0.7s 0.4s ease both" }}>
            <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            99% Synergy Match · AI Collaboration
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", zIndex: 10, minWidth: 280, animation: "fadeUp 0.7s 0.25s ease both" }}>
          <div className="hero-img-wrap card-dark dot-pattern" style={{ borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 512 }}>
            <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div className="wave-lines" />
              <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: 32 }}>
                <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #34d399)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg style={{ width: 48, height: 48, color: "#fff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>App Preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Interactive Folder ───────────────────────────────────────────────────────
function InteractiveFolder({ color, labels }: { color: string; labels: [string, string, string] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [offsets, setOffsets] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const ref = useRef<HTMLDivElement>(null);
  const back = darkenHex(color, 0.08);
  const paperColors = ["#d4d4d4", "#e5e5e5", "#f0f0f0"];
  const paperSizes = [{ w: "68%", h: "75%" }, { w: "78%", h: "66%" }, { w: "86%", h: "56%" }];
  const openTransforms = ["translate(-195%, -75%) rotate(-20deg)", "translate(95%, -75%) rotate(20deg)", "translate(-50%, -118%) rotate(2deg)"];

  return (
    <div
      ref={ref}
      onClick={() => { setIsOpen(!isOpen); setOffsets([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]); }}
      onMouseMove={(e) => {
        if (isOpen || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setTilt({ rx: ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 7, ry: -((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 7 });
      }}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      style={{
        position: "relative", width: 160, height: 148, cursor: "pointer", perspective: 600,
        transform: isOpen ? "translateY(-10px)" : `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: "transform 0.25s ease, filter 0.25s ease",
        animation: isOpen ? "none" : "hintBounce 3s ease-in-out infinite",
      }}
    >
      <div style={{ position: "absolute", bottom: 0, width: 160, height: 128, borderRadius: "0 14px 14px 14px", backgroundColor: back }}>
        <span style={{ position: "absolute", bottom: "100%", left: 0, width: 46, height: 14, borderRadius: "7px 7px 0 0", backgroundColor: back }} />

        {paperSizes.map((sz, i) => (
          <div key={i}
            onMouseMove={(e) => {
              e.stopPropagation();
              if (!isOpen) return;
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const n = [...offsets]; n[i] = { x: (e.clientX - (r.left + r.width / 2)) * 0.15, y: (e.clientY - (r.top + r.height / 2)) * 0.15 }; setOffsets(n);
            }}
            onMouseLeave={() => { const n = [...offsets]; n[i] = { x: 0, y: 0 }; setOffsets(n); }}
            style={{
              position: "absolute", zIndex: 20, bottom: "10%", left: "50%",
              width: sz.w, height: sz.h, borderRadius: 12, backgroundColor: paperColors[i],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.5)", textAlign: "center", padding: 4,
              transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              transform: isOpen ? `${openTransforms[i]} translate(${offsets[i].x}px,${offsets[i].y}px)` : "translateX(-50%) translateY(10%)",
            }}>{labels[i]}</div>
        ))}

        {[
          "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
          "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)"
        ].map((clip, i) => (
          <div key={i} style={{
            position: "absolute", zIndex: 30, width: "100%", height: "100%",
            borderRadius: "5px 14px 14px 14px", backgroundColor: color, clipPath: clip,
            transformOrigin: "bottom", transition: "transform 0.3s ease",
            transform: isOpen ? (i === 0 ? "skewX(12deg) scaleY(0.55) translateX(-4px)" : "skewX(-12deg) scaleY(0.55) translateX(4px)") : "none",
          }} />
        ))}
      </div>

      <span style={{
        position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
        fontSize: 9.5, color: "rgba(96,165,250,0.65)", whiteSpace: "nowrap",
        letterSpacing: "0.05em", pointerEvents: "none",
        opacity: isOpen ? 0 : 1, transition: "opacity 0.3s",
      }}>↑ click to open</span>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────
const aboutCards = [
  { color: "#3B82F6", labels: ["Logic", "Flow", "Sync"] as [string, string, string], title: "Cognitive Sync", desc: "Matches based on logic flow and problem-solving styles. We map how your brain works, not just what you know." },
  { color: "#34D399", labels: ["React", "Laravel", "DB"] as [string, string, string], title: "Stack Analysis", desc: "Precise technical compatibility for instant productivity. Your stack fingerprint is matched with complementary teammates." },
  { color: "#FBBF24", labels: ["Sprint", "Goals", "KPI"] as [string, string, string], title: "Team Pulse", desc: "Real-time monitoring of your team's energy and momentum. Detects imbalance early so every sprint stays on track." },
];

function About() {
  const { ref: titleRef, visible: titleVisible } = useReveal();
  const { ref: gridRef, visible: gridVisible } = useReveal();
  return (
    <section id="about" className="section-alt" style={{ padding: "128px 24px", overflow: "visible" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div ref={titleRef} className={`reveal${titleVisible ? " visible" : ""}`} style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem,3vw,2.25rem)", color: "#fff", marginBottom: 12 }}>
            The "Smart" Matching Engine
          </h2>
          <div className="accent-line" style={{ margin: "0 auto 20px" }} />
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Unlike traditional listing sites, ProjectPals analyzes technical stack compatibility, time-zone overlap, and collaborative temperament to find your ideal partners.
          </p>
        </div>
        <div ref={gridRef} className={`reveal${gridVisible ? " visible" : ""}`}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 40, overflow: "visible" }}>
          {aboutCards.map((card) => (
            <div key={card.title} className="card-dark" style={{ borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "2rem 2rem 1.75rem", overflow: "visible" }}>
              <div style={{ marginTop: "2.5rem", marginBottom: "2rem" }}>
                <InteractiveFolder color={card.color} labels={card.labels} />
              </div>
              <h4 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 8 }}>{card.title}</h4>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const barHeights = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];

function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="card-dark"
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        ref.current.style.transform = `translateY(-6px) scale(1.015) perspective(600px) rotateX(${dy * -5}deg) rotateY(${dx * 5}deg)`;
      }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = ""; }}
      style={{ borderRadius: 12, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function Particles() {
  const list = useRef(Array.from({ length: 16 }, (_, i) => ({
    size: Math.random() * 3 + 1.5, left: Math.random() * 100, top: Math.random() * 100,
    dur: Math.random() * 8 + 6, delay: Math.random() * 8, drift: (Math.random() - 0.5) * 60,
    color: i % 3 === 0 ? "rgba(52,211,153,0.45)" : i % 3 === 1 ? "rgba(96,165,250,0.45)" : "rgba(255,255,255,0.12)",
  }))).current;
  return (
    <>
      {list.map((p, i) => (
        <span key={i} style={{
          position: "absolute", borderRadius: "50%", pointerEvents: "none",
          width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%`,
          background: p.color,
          ["--drift-x" as any]: `${p.drift}px`,
          animation: `floatParticle ${p.dur}s ${p.delay}s linear infinite`,
        }} />
      ))}
    </>
  );
}

function ChartBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setAnimated(true); obs.unobserve(el); } }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 10, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 112, width: "100%" }}>
        {barHeights.map((h, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: "4px 4px 0 0",
            height: `${h}%`,
            background: "linear-gradient(to top, rgba(59,130,246,0.8), rgba(52,211,153,0.4))",
            transformOrigin: "bottom",
            transform: animated ? "scaleY(1)" : "scaleY(0)",
            opacity: animated ? 1 : 0,
            transition: `transform 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s, opacity 0.4s ease ${i * 0.05}s`,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#475569", fontSize: 12 }}>
        <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
      </div>
    </div>
  );
}

function Features() {
  const { ref: titleRef, visible: titleVisible } = useReveal();
  const { ref: bottomRef, visible: bottomVisible } = useReveal();
  return (
    <section id="features" style={{ padding: "96px 24px", position: "relative", overflow: "hidden", background: "#090e1a" }}>
      <Particles />
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", opacity: 0.3, pointerEvents: "none" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div ref={titleRef} className={`reveal${titleVisible ? " visible" : ""}`} style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem,3vw,2.25rem)", marginBottom: 12, background: "linear-gradient(135deg, #ffffff 60%, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Engineered for Momentum
          </h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>Precision tools designed for teams that move fast.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 24 }}>
          <TiltCard>
            <div className="icon-box" style={{ marginBottom: 20 }}>
              <svg style={{ width: 20, height: 20, color: "#60a5fa" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>Smart Matching</h3>
            <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>Our algorithm doesn't just look at keywords; it looks at the trajectory of your project to find complementary talents.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="badge-blue" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, fontWeight: 500 }}>AI Driven</span>
              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 9999, fontWeight: 500, background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8" }}>Social Graph</span>
            </div>
          </TiltCard>

          <TiltCard>
            <div className="icon-box" style={{ marginBottom: 20, background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.2)" }}>
              <svg style={{ width: 20, height: 20, color: "#34d399" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>Role Selection</h3>
            <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>Granular permission and responsibility mapping for every team member.</p>
          </TiltCard>

          <TiltCard>
            <div className="icon-box" style={{ marginBottom: 20, background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.2)" }}>
              <svg style={{ width: 20, height: 20, color: "#fbbf24" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>Productivity Windows</h3>
            <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>Automated scheduling that finds the overlap in your team's peak energy states.</p>
          </TiltCard>
        </div>

        <div ref={bottomRef} className={`reveal${bottomVisible ? " visible" : ""}`}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <TiltCard style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#fff", fontSize: 20, marginBottom: 12 }}>Progress Tracking</h3>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Visualize the kinetic energy of your project with real-time velocity metrics and milestone observatories.</p>
            <a href="#" style={{ color: "#60a5fa", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              Learn more
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </TiltCard>
          <div className="progress-img" style={{ padding: 24, minHeight: 192, display: "flex", alignItems: "flex-end" }}>
            <div className="wave-lines" />
            <ChartBars />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  { quote: "ProjectPals found me a lead developer in 48 hours. The stack compatibility was so precise we pushed to production in week one.", name: "Firda Rahaya", role: "FOUNDER, TECHFLOW", initials: "FR", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "rgba(30,45,69,0.8)" },
  { quote: "The productivity windows feature is a game changer for our distributed team. No more timezone fatigue.", name: "Elisa Dafatima", role: "PRODUCT LEAD, ARCHTECH", initials: "ED", gradient: "linear-gradient(135deg, #34d399, #059669)", border: "rgba(52,211,153,0.25)" },
  { quote: "I've never seen a team-building tool this intuitive. It feels like it knows exactly who I need before I do.", name: "Casci2R", role: "FULL-STACK, FREELANCE", initials: "CS", gradient: "linear-gradient(135deg, #475569, #334155)", border: "rgba(30,45,69,0.8)" },
];

function Testimonials() {
  const { ref, visible } = useReveal();
  return (
    <section id="testimonial" className="section-alt" style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem,3vw,2rem)", color: "#fff" }}>
            Voices from the <span style={{ color: "#34d399" }}>Observatory</span>
          </h2>
        </div>
        <div ref={ref} className={`reveal${visible ? " visible" : ""}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card" style={{ borderRadius: 12, padding: 24, borderColor: t.border }}>
              <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>{t.initials}</div>
                <div>
                  <p style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{t.name}</p>
                  <p style={{ color: "#64748b", fontSize: 12 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "general", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const { ref: leftRef, visible: leftVisible } = useReveal();
  const { ref: rightRef, visible: rightVisible } = useReveal();
  const inputStyle: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d45", color: "#e2e8f0", borderRadius: 8, padding: "10px 16px", fontSize: 14, width: "100%", outline: "none", transition: "border-color 0.3s" };

  return (
    <section id="contact" style={{ padding: "96px 24px", position: "relative", overflow: "hidden", background: "#090e1a" }}>
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 384, height: 384, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", opacity: 0.2, pointerEvents: "none" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 64, alignItems: "start" }}>
          <div ref={leftRef} className={`reveal${leftVisible ? " visible" : ""}`}>
            <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem,3vw,2.25rem)", color: "#fff", marginBottom: 16 }}>Ready to Sync Up?</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>Have questions about the matching engine or interested in enterprise integration? Send us a pulse.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", text: "hello@projectpals.dev" },
                { d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z", text: "Indonesia / Remote" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, color: "#94a3b8", fontSize: 14 }}>
                  <svg style={{ width: 16, height: 16, color: "#60a5fa", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.d} /></svg>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <div ref={rightRef} className={`reveal${rightVisible ? " visible" : ""} card-dark`} style={{ borderRadius: 12, padding: 32 }}>
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[{ label: "NAME", name: "name", type: "text", placeholder: "Your name" }, { label: "EMAIL", name: "email", type: "email", placeholder: "email@address.com" }].map((f) => (
                  <div key={f.name}>
                    <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} name={f.name} placeholder={f.placeholder} value={(form as any)[f.name]}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="input-dark" style={inputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>SUBJECT</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-dark" style={{ ...inputStyle, appearance: "none" }}>
                  <option value="general">General Inquiry</option>
                  <option value="enterprise">Enterprise Integration</option>
                  <option value="matching">Matching Engine</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>MESSAGE</label>
                <textarea rows={4} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input-dark" style={{ ...inputStyle, resize: "none" }} />
              </div>
              <button type="submit" className="btn-primary" style={{ color: "#fff", fontWeight: 600, fontSize: 14, padding: 12, borderRadius: 8, width: "100%", border: "none", cursor: "pointer", marginTop: 8, background: submitted ? "linear-gradient(135deg, #34d399, #059669)" : undefined, transition: "all 0.3s ease" }}>
                {submitted ? "Message Sent ✓" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { ref: brandRef, visible: brandVisible } = useReveal(0.12);
  const statsRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ teams: 0, uptime: 0, rating: 0 });
  const animated = useRef(false);

  useEffect(() => {
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / 1400, 1);
          const e = 1 - Math.pow(1 - p, 3);
          setCounts({ teams: Math.round(12 * e), uptime: Math.round(98 * e), rating: parseFloat((4.9 * e).toFixed(1)) });
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      }
    }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  const socials = [
    { title: "LinkedIn", href: "https://linkedin.com", d: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" },
    { title: "Twitter", href: "https://twitter.com", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
    { title: "GitHub", href: "#", d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.084-.729.084-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
    { title: "Instagram", href: "#", d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  ];

  return (
    <footer style={{ borderTop: "1px solid #1e2d45", background: "#090e1a", padding: "64px 24px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 400, height: 400, bottom: -160, left: -80, borderRadius: "50%", filter: "blur(80px)", background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)", animation: "footerGlowPulse 7s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 300, height: 300, top: -80, right: -60, borderRadius: "50%", filter: "blur(80px)", background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)", animation: "footerGlowPulse 7s 3.5s ease-in-out infinite", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, marginBottom: 48, alignItems: "start" }}>
          <div ref={brandRef} className={`reveal${brandVisible ? " visible" : ""}`}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#fff", fontSize: 24, marginBottom: 4, letterSpacing: "-0.02em" }}>ProjectPals</p>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 24, lineHeight: 1.6, maxWidth: 280 }}>Discovering collaboration through data-driven milestones<br />and kinetic project management.</p>
            <p style={{ color: "#475569", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Get the App</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "App Store", sub: "Download on the", iconColor: "#e2e8f0", d: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.19 1.28-2.17 3.81.03 3.02 2.65 4.03 2.68 4.04l-.06.17zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" },
                { label: "Google Play", sub: "Get it on", iconColor: "#34D399", d: "M3.18 23.76c.3.17.64.24.99.2l12.45-7.19-2.78-2.78-10.66 9.77zM.35 1.22C.13 1.57 0 2.01 0 2.54v18.93c0 .53.13.97.36 1.32l.07.07 10.6-10.6v-.25L.42 1.15l-.07.07zM20.65 10.27l-2.98-1.72-3.14 3.14 3.14 3.14 3-1.74c.85-.49.85-1.29-.02-1.82zM3.18.24L15.64 7.43l-2.78 2.78L2.2.44c.28-.3.65-.37.98-.2z" },
              ].map((btn) => (
                <a key={btn.label} href="#" className="footer-dl-btn">
                  <div className="btn-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill={btn.iconColor}><path d={btn.d} /></svg></div>
                  <div><p className="btn-sub">{btn.sub}</p><p className="btn-name">{btn.label}</p></div>
                </a>
              ))}
            </div>
          </div>

          <div ref={statsRef}>
            <p style={{ color: "#475569", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>By the Numbers</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[{ value: `${counts.teams}K+`, label: "Active Teams" }, { value: `${counts.uptime}%`, label: "Uptime" }, { value: `${counts.rating}★`, label: "App Rating" }].map((stat, i) => (
                <div key={stat.label} className="footer-stat visible" style={{ textAlign: "center", transitionDelay: `${i * 0.1}s` }}>
                  <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 24, color: "#fff", marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ color: "#475569", fontSize: 12 }}>{stat.label}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <p style={{ color: "#475569", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Follow Us</p>
              <div style={{ display: "flex", gap: 8 }}>
                {socials.map((s) => (
                  <a key={s.title} href={s.href} target="_blank" rel="noreferrer" title={s.title} className="footer-social">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer-divider" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, marginBottom: 40 }}>
          {[
            { heading: "Product", links: [{ l: "Features", h: "#features" }, { l: "Pricing", h: "#" }, { l: "Changelog", h: "#" }, { l: "Roadmap", h: "#" }] },
            { heading: "Company", links: [{ l: "About", h: "#" }, { l: "Blog", h: "#" }, { l: "Careers", h: "#" }, { l: "Contact", h: "#" }] },
            { heading: "Legal", links: [{ l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }, { l: "Cookie Policy", h: "#" }] },
          ].map((col) => (
            <div key={col.heading}>
              <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>{col.heading}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link) => <a key={link.l} href={link.h} className="footer-link">{link.l}</a>)}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-divider" style={{ marginBottom: 20 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <p style={{ color: "#334155", fontSize: 12 }}>© 2024 ProjectPals. The Kinetic Observatory.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Back to top" className="scroll-top-btn">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0B1121; color: #e2e8f0; font-family: 'Poppins', sans-serif; }

        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.1)} 66%{transform:translate(-30px,50px) scale(0.95)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.08)} 66%{transform:translate(40px,-30px) scale(1.02)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,40px) scale(1.12)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hintBounce { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-10px)} 60%{transform:translateY(-6px)} }
        @keyframes floatParticle { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-130px) translateX(var(--drift-x,20px));opacity:0} }
        @keyframes waveDrift { 0%,100%{transform:translateX(0) scaleY(1)} 50%{transform:translateX(-8px) scaleY(1.04)} }
        @keyframes progressShimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes footerGlowPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }

        .reveal { opacity:0; transform:translateY(30px); transition:opacity 0.7s ease,transform 0.7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }

        .card-dark { background:rgba(19,29,48,0.85); border:1px solid #1e2d45; backdrop-filter:blur(8px); position:relative; overflow:hidden; transition:transform 0.35s cubic-bezier(0.22,1,0.36,1),border-color 0.35s ease,box-shadow 0.35s ease; will-change:transform; }
        .card-dark::before { content:''; position:absolute; inset:0; background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,0.03) 40%,rgba(255,255,255,0.07) 50%,transparent 100%); transform:translateX(-100%); transition:transform 0.55s ease; pointer-events:none; z-index:0; }
        .card-dark:hover::before { transform:translateX(100%); }
        .card-dark:hover { border-color:rgba(59,130,246,0.35); box-shadow:0 20px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(59,130,246,0.12),inset 0 1px 0 rgba(255,255,255,0.05); }
        .card-dark > * { position:relative; z-index:1; }

        .btn-primary { background:linear-gradient(135deg,#3B82F6,#2563eb); transition:all 0.3s ease; }
        .btn-primary:hover { background:linear-gradient(135deg,#60a5fa,#3B82F6); box-shadow:0 0 20px rgba(59,130,246,0.4); }
        .btn-outline { border:1px solid rgba(226,232,240,0.3); color:#e2e8f0; transition:all 0.3s ease; }
        .btn-outline:hover { border-color:rgba(59,130,246,0.6); color:#60a5fa; }

        .section-alt { background:rgba(15,25,41,0.75); }
        .accent-line { width:40px; height:3px; background:linear-gradient(90deg,#3B82F6,#34D399); border-radius:2px; }
        .badge-mint { background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.3); color:#34D399; }
        .badge-blue { background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; }

        .hero-img-wrap { position:relative; }
        .hero-img-wrap::before { content:''; position:absolute; inset:0; border-radius:1rem; background:linear-gradient(135deg,rgba(59,130,246,0.15),rgba(52,211,153,0.08)); z-index:1; pointer-events:none; }
        .dot-pattern { background-image:radial-gradient(rgba(59,130,246,0.15) 1px,transparent 1px); background-size:28px 28px; }

        .testimonial-card { background:#131d30; border:1px solid #1e2d45; transition:border-color 0.3s; }
        .testimonial-card:hover { border-color:rgba(52,211,153,0.3); }

        .input-dark { background:rgba(255,255,255,0.05); border:1px solid #1e2d45; color:#e2e8f0; }
        .input-dark:focus { outline:none; border-color:#3B82F6 !important; box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
        .input-dark::placeholder { color:#64748b; }

        .icon-box { background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:0.5rem; width:40px; height:40px; display:flex; align-items:center; justify-content:center; transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease; }
        .card-dark:hover .icon-box { transform:scale(1.12) rotate(-4deg); box-shadow:0 4px 16px rgba(59,130,246,0.2); }

        .progress-img { background:linear-gradient(135deg,#0f1929 0%,#131d30 100%); border:1px solid #1e2d45; border-radius:1rem; overflow:hidden; position:relative; transition:transform 0.4s cubic-bezier(0.22,1,0.36,1); }
        .progress-img:hover { transform:perspective(700px) rotateX(2deg) rotateY(-2deg); }
        .wave-lines { position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(59,130,246,0.04) 30px,rgba(59,130,246,0.04) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(59,130,246,0.04) 30px,rgba(59,130,246,0.04) 31px); animation:waveDrift 6s ease-in-out infinite; }

        .footer-divider { height:1px; background:linear-gradient(90deg,transparent,#1e2d45 20%,#1e2d45 80%,transparent); margin:32px 0; }
        .footer-stat { opacity:0; transform:translateY(16px); transition:opacity 0.6s ease,transform 0.6s ease; }
        .footer-stat.visible { opacity:1; transform:translateY(0); }
        .footer-dl-btn { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 16px; transition:background 0.3s,border-color 0.3s,transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s; cursor:pointer; text-decoration:none; }
        .footer-dl-btn:hover { background:rgba(59,130,246,0.1); border-color:rgba(59,130,246,0.35); transform:translateY(-3px) scale(1.02); box-shadow:0 8px 24px rgba(0,0,0,0.3); }
        .btn-icon { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:7px; flex-shrink:0; background:rgba(255,255,255,0.06); }
        .btn-sub { font-size:9px; color:#64748b; line-height:1; }
        .btn-name { font-size:12px; color:#e2e8f0; font-weight:600; line-height:1.3; font-family:'Montserrat',sans-serif; }
        .footer-social { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#64748b; transition:all 0.25s; text-decoration:none; }
        .footer-social:hover { background:rgba(59,130,246,0.15); border-color:rgba(59,130,246,0.3); color:#60a5fa; transform:translateY(-3px) scale(1.1); }
        .footer-link { display:flex; align-items:center; gap:6px; color:#64748b; font-size:12px; text-decoration:none; transition:color 0.2s,gap 0.2s; padding:2px 0; }
        .footer-link::before { content:''; display:inline-block; width:4px; height:4px; border-radius:50%; background:#1e3a5f; flex-shrink:0; transition:background 0.2s,transform 0.2s; }
        .footer-link:hover { color:#cbd5e1; }
        .footer-link:hover::before { background:#3b82f6; transform:scale(1.4); }
        .scroll-top-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); color:#60a5fa; cursor:pointer; transition:all 0.25s; flex-shrink:0; }
        .scroll-top-btn:hover { background:rgba(59,130,246,0.25); transform:translateY(-3px); box-shadow:0 6px 20px rgba(59,130,246,0.25); }

        @media (max-width:768px) {
          .hamburger { display:flex !important; }
          .desktop-nav, .desktop-actions { display:none !important; }
        }
      `}</style>

      <AnimatedBg />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Features />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
