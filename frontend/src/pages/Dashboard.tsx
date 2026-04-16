import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const localUserRaw = localStorage.getItem("auth_user");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (localUserRaw) {
      try {
        const parsed = JSON.parse(localUserRaw) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem("auth_user");
      }
    }

    const loadMe = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          return;
        }

        const me = (await response.json()) as AuthUser;
        setUser(me);
        localStorage.setItem("auth_user", JSON.stringify(me));
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [API_BASE_URL, navigate]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.name]);

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "-";

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    const token = localStorage.getItem("auth_token");

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <h1 className="logo">Dashboard</h1>
          <nav className="nav">
            <p className="active">Home</p>
            <p>Join</p>
            <p>Rooms</p>
            <p>Profile</p>
          </nav>
        </div>
        <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <span className="logout-inline">
              <span className="spinner" />
              Logging out...
            </span>
          ) : (
            "Logout"
          )}
        </button>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Header */}
        <div className="header">
          <div className="user">
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <p className="welcome">Welcome Back,</p>
              <h2>{displayName}</h2>
              <p className="user-email">{displayEmail}</p>
            </div>
          </div>
          <div className="notif" title={loading ? "Syncing account" : "Account synced"}>
            <div className="bell" />
            <span className="dot" />
          </div>
        </div>

        {/* Active Project */}
        <div className="active-project">
          <div className="row">
            <h3>Active Projects</h3>
            <span>More Details →</span>
          </div>
          <div className="project-card">
            <span>{displayName}'s Workspace</span>
            <span className="badge">Session Active</span>
          </div>
        </div>

        {/* Quick Access */}
        <div className="section">
          <h3>Quick Access</h3>
          <div className="grid">
            <button className="card action-card" onClick={() => navigate("/create-room")}>🚀 Create Room</button>
            <div className="card">👥 Join Room</div>
          </div>
        </div>

        {/* Projects */}
        <div className="section">
          <div className="row">
            <h3>{displayName}'s Projects Team</h3>
            <span>More Details →</span>
          </div>

          <div className="list-card">
            <div>
              <h4>Owner Profile</h4>
              <p>{displayEmail}</p>
            </div>
            <span className="badge green">CONNECTED</span>
          </div>

          <div className="list-card">
            <div>
              <h4>Mancingin</h4>
              <p>Fullstack • 1 year</p>
            </div>
            <span className="badge green">COMPLETED</span>
          </div>
        </div>

      </main>
    </div>
  );
}