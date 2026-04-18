import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type RoomItem = {
  id: number;
  project_theme: string;
  room_code: string;
  status: "open" | "matching" | "ongoing" | "closed";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [rooms, setRooms] = useState<RoomItem[]>([]);

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

    const loadMyRooms = async () => {
      try {
        setRoomsError("");

        const response = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, {
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
          setRoomsError("Gagal memuat daftar room.");
          return;
        }

        const payload = (await response.json()) as { data?: RoomItem[] };
        setRooms(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        setRoomsError("Gagal memuat daftar room.");
      } finally {
        setRoomsLoading(false);
      }
    };

    loadMe();
    loadMyRooms();
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
            <p>Teams</p>
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
            <button className="card action-card" onClick={() => navigate("/join-room")}>👥 Join Room</button>
          </div>
        </div>

        {/* Projects */}
        <div className="section">
          <div className="row">
            <h3>{displayName}'s Project Room</h3>
            <span>More Details →</span>
          </div>

          {roomsLoading && (
            <div className="list-card">
              <div>
                <h4>Loading rooms...</h4>
                <p>Mengambil data dari API my-rooms.</p>
              </div>
              <span className="badge">SYNC</span>
            </div>
          )}

          {!roomsLoading && roomsError && (
            <div className="list-card">
              <div>
                <h4>Room Unavailable</h4>
                <p>{roomsError}</p>
              </div>
              <span className="badge">ERROR</span>
            </div>
          )}

          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <div className="list-card">
              <div>
                <h4>No Room Yet</h4>
                <p>Belum ada room yang kamu buat.</p>
              </div>
              <span className="badge">EMPTY</span>
            </div>
          )}

          {!roomsLoading && !roomsError && rooms.map((room) => (
            <button
              className="list-card room-link-card"
              key={room.id}
              onClick={() => navigate(`/rooms/${room.room_code}`)}
            >
              <div>
                <h4>{room.project_theme}</h4>
                <p>Code: {room.room_code}</p>
              </div>
              <span className="badge green">{room.status.toUpperCase()}</span>
            </button>
          ))}
        </div>

      </main>
    </div>
  );
}