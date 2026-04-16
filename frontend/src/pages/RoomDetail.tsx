import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Dashboard.css";

type RoomDetailData = {
  id: number;
  project_theme: string;
  room_code: string;
  roles: string[];
  productivity_windows: string[];
  environments: string[];
  max_per_group: number;
  number_of_groups: number;
  status: "open" | "matching" | "ongoing" | "closed";
  created_at: string;
};

export default function RoomDetail() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<RoomDetailData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (!roomCode) {
      setErrorMessage("Room code tidak valid.");
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      try {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
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

        const payload = (await response.json()) as { data?: RoomDetailData; message?: string };

        if (!response.ok) {
          setErrorMessage(payload.message || "Gagal memuat detail room.");
          return;
        }

        setRoom(payload.data ?? null);
      } catch {
        setErrorMessage("Gagal memuat detail room.");
      } finally {
        setLoading(false);
      }
    };

    void loadRoom();
  }, [API_BASE_URL, navigate, roomCode]);

  const roleList = useMemo(() => {
    if (!room?.roles || room.roles.length === 0) return "-";
    return room.roles.join(", ");
  }, [room?.roles]);

  const windowsList = useMemo(() => {
    if (!room?.productivity_windows || room.productivity_windows.length === 0) return "-";
    return room.productivity_windows.join(", ");
  }, [room?.productivity_windows]);

  const envList = useMemo(() => {
    if (!room?.environments || room.environments.length === 0) return "-";
    return room.environments.join(", ");
  }, [room?.environments]);

  return (
    <div className="dashboard-container">
      <main className="main" style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div className="header">
          <div className="user-meta">
            <p className="welcome">Room Detail</p>
            <h2>{room?.project_theme ?? "Project Room"}</h2>
            <p className="user-email">Code: {room?.room_code ?? (roomCode || "-")}</p>
          </div>
          <button className="logout-btn" style={{ width: "auto" }} onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>

        {loading && (
          <div className="list-card">
            <div>
              <h4>Loading room...</h4>
              <p>Mengambil detail room dari server.</p>
            </div>
            <span className="badge">SYNC</span>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="list-card">
            <div>
              <h4>Room Unavailable</h4>
              <p>{errorMessage}</p>
            </div>
            <span className="badge">ERROR</span>
          </div>
        )}

        {!loading && !errorMessage && room && (
          <>
            <div className="active-project">
              <div className="row">
                <h3>{room.project_theme}</h3>
                <span>{room.status.toUpperCase()}</span>
              </div>
              <div className="project-card">
                <span>Room Code: {room.room_code}</span>
                <span className="badge">Owner View</span>
              </div>
            </div>

            <div className="section">
              <h3>Configuration</h3>

              <div className="list-card">
                <div>
                  <h4>Roles</h4>
                  <p>{roleList}</p>
                </div>
                <span className="badge green">{room.roles?.length ?? 0}</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Max Member Per Group</h4>
                  <p>{room.max_per_group}</p>
                </div>
                <span className="badge green">LIMIT</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Number of Groups</h4>
                  <p>{room.number_of_groups}</p>
                </div>
                <span className="badge green">GROUPS</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Productivity Windows</h4>
                  <p>{windowsList}</p>
                </div>
                <span className="badge green">TIME</span>
              </div>

              <div className="list-card">
                <div>
                  <h4>Environments</h4>
                  <p>{envList}</p>
                </div>
                <span className="badge green">ENV</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
