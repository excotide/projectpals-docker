import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { useMyRooms } from "../hooks/useRooms";

type RoomItem = {
  id: number;
  project_theme: string;
  room_code: string;
  status: "open" | "matching" | "ongoing" | "closed";
};

const statusBadgeClass: Record<RoomItem["status"], string> = {
  open: "badge-open",
  matching: "badge-matching",
  ongoing: "badge-ongoing",
  closed: "badge-closed",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: user, isLoading: loading } = useCurrentUser();
  const {
    data: roomsData,
    isLoading: roomsLoading,
    error: roomsQueryError,
  } = useMyRooms();
  const logoutMutation = useLogout();
  const rooms = (roomsData ?? []) as RoomItem[];
  const roomsError =
    roomsQueryError instanceof Error ? roomsQueryError.message : "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

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
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  const openRooms = rooms.filter((r) => r.status === "open").length;
  const ongoingRooms = rooms.filter((r) => r.status === "ongoing").length;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h1 className="logo">
            Dash<span className="logo-accent">.</span>
          </h1>
          <nav className="nav">
            {[
              { label: "Home", icon: "⊞", active: true },
              { label: "Join", icon: "＋" },
              { label: "Rooms", icon: "▦" },
              { label: "Teams", icon: "◑" },
              { label: "Profile", icon: "◎" },
            ].map(({ label, icon, active }) => (
              <button
                key={label}
                className={`nav-item${active ? " active" : ""}`}
              >
                <span className="nav-icon">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <button
          className="logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <span className="spinner" />
              Logging out...
            </>
          ) : (
            <>
              <span className="nav-icon">→</span>
              Logout
            </>
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
              <p className="welcome">Welcome back</p>
              <h2 className="display-name">{displayName}</h2>
              <p className="user-email">{displayEmail}</p>
            </div>
          </div>
          <div
            className="notif"
            title={loading ? "Syncing account" : "Account synced"}
          >
            <span className="bell-icon">🔔</span>
            <span className="dot" />
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Rooms</p>
            <p className="stat-value">{rooms.length}</p>
            <p className="stat-sub">All your rooms</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Open</p>
            <p className="stat-value">{openRooms}</p>
            <p className="stat-sub">Accepting members</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Ongoing</p>
            <p className="stat-value">{ongoingRooms}</p>
            <p className="stat-sub">In progress</p>
          </div>
        </div>

        {/* Active Project */}
        <div className="active-project">
          <div className="row">
            <h3 className="section-title">Active Project</h3>
            <span className="more-link">More Details →</span>
          </div>
          <div className="project-card">
            <div>
              <p className="proj-name">{displayName}'s Workspace</p>
              <p className="proj-sub">Personal workspace • all rooms</p>
            </div>
            <span className="badge badge-active">Session Active</span>
          </div>
        </div>

        {/* Quick Access */}
        <div className="section">
          <h3 className="section-title">Quick Access</h3>
          <div className="quick-grid">
            <button
              className="action-card"
              onClick={() => navigate("/create-room")}
            >
              <span className="action-icon create-icon">🚀</span>
              <div>
                <p className="action-label">Create Room</p>
                <p className="action-sub">Start a new project room</p>
              </div>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/join-room")}
            >
              <span className="action-icon join-icon">👥</span>
              <div>
                <p className="action-label">Join Room</p>
                <p className="action-sub">Enter with a room code</p>
              </div>
            </button>
          </div>
        </div>

        {/* Project Rooms */}
        <div className="section">
          <div className="row">
            <h3 className="section-title">{displayName}'s Project Rooms</h3>
            <span className="more-link">More Details →</span>
          </div>

          <div className="rooms-list">
            {roomsLoading && (
              <div className="list-card state-card">
                <div className="room-dot">⟳</div>
                <div>
                  <p className="room-name">Loading rooms...</p>
                  <p className="room-code">Fetching from server</p>
                </div>
                <span className="badge badge-sync">SYNC</span>
              </div>
            )}

            {!roomsLoading && roomsError && (
              <div className="list-card state-card">
                <div className="room-dot">!</div>
                <div>
                  <p className="room-name">Room Unavailable</p>
                  <p className="room-code">{roomsError}</p>
                </div>
                <span className="badge badge-error">ERROR</span>
              </div>
            )}

            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <div className="list-card state-card">
                <div className="room-dot">○</div>
                <div>
                  <p className="room-name">No Rooms Yet</p>
                  <p className="room-code">Create or join a room to get started</p>
                </div>
                <span className="badge badge-empty">EMPTY</span>
              </div>
            )}

            {!roomsLoading &&
              !roomsError &&
              rooms.map((room) => (
                <button
                  className="list-card room-link-card"
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.room_code}`)}
                >
                  <div className="room-dot">◈</div>
                  <div className="room-info">
                    <p className="room-name">{room.project_theme}</p>
                    <p className="room-code">Code: {room.room_code}</p>
                  </div>
                  <span className={`badge ${statusBadgeClass[room.status]}`}>
                    {room.status.toUpperCase()}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
